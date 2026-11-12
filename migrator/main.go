package main

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"os"
	"os/signal"
	"slices"
	"strconv"
	"syscall"
	"text/tabwriter"
	"time"

	"github.com/gaucho-racing/mapache/migrator/migrate"
	"github.com/gaucho-racing/mapache/pkg/logger"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
)

const usage = `usage: migrator <command>

commands:
  status         list every postgres migration and whether it is applied
  up             apply all pending postgres migrations
  up-to <ver>    apply pending postgres migrations up to and including <ver>
  down           roll back the most recently applied postgres migration

environment:
  DATABASE_URL   postgres connection string (required)
  ENV            set to PROD for JSON logs
`

var errUsage = errors.New("invalid usage")

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	if err := run(ctx, os.Args[1:], os.Stdout); err != nil {
		if errors.Is(err, errUsage) {
			fmt.Fprint(os.Stderr, usage)
			os.Exit(2)
		}
		fmt.Fprintln(os.Stderr, "migrator:", err)
		os.Exit(1)
	}
}

func run(ctx context.Context, args []string, out io.Writer) error {
	if len(args) == 0 || !slices.Contains([]string{"status", "up", "up-to", "down"}, args[0]) {
		return errUsage
	}

	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		return errors.New("DATABASE_URL is not set")
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return fmt.Errorf("open postgres: %w", err)
	}
	defer db.Close()
	if err := db.PingContext(ctx); err != nil {
		return fmt.Errorf("connect to postgres: %w", err)
	}

	log := logger.New("migrator", os.Getenv("ENV") == "PROD")
	provider, err := migrate.NewPostgres(db, log)
	if err != nil {
		return err
	}

	switch args[0] {
	case "status":
		if len(args) != 1 {
			return errUsage
		}
		return printStatus(ctx, provider, out)
	case "up":
		if len(args) != 1 {
			return errUsage
		}
		results, err := provider.Up(ctx)
		printResults(out, results)
		return err
	case "up-to":
		if len(args) != 2 {
			return errUsage
		}
		version, err := strconv.ParseInt(args[1], 10, 64)
		if err != nil || version < 1 {
			return fmt.Errorf("up-to: %q is not a valid migration version", args[1])
		}
		results, err := provider.UpTo(ctx, version)
		printResults(out, results)
		return err
	case "down":
		if len(args) != 1 {
			return errUsage
		}
		result, err := provider.Down(ctx)
		if result != nil {
			printResults(out, []*goose.MigrationResult{result})
		}
		return err
	default:
		return errUsage
	}
}

func printStatus(ctx context.Context, provider *goose.Provider, out io.Writer) error {
	statuses, err := provider.Status(ctx)
	if err != nil {
		return fmt.Errorf("read migration status: %w", err)
	}
	w := tabwriter.NewWriter(out, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "VERSION\tSTATE\tAPPLIED AT\tFILE")
	for _, s := range statuses {
		applied := "-"
		if !s.AppliedAt.IsZero() {
			applied = s.AppliedAt.UTC().Format(time.RFC3339)
		}
		fmt.Fprintf(w, "%d\t%s\t%s\t%s\n", s.Source.Version, s.State, applied, s.Source.Path)
	}
	return w.Flush()
}

func printResults(out io.Writer, results []*goose.MigrationResult) {
	if len(results) == 0 {
		fmt.Fprintln(out, "no migrations to apply")
		return
	}
	for _, r := range results {
		status := "ok"
		if r.Error != nil {
			status = "FAILED: " + r.Error.Error()
		}
		fmt.Fprintf(out, "%s %d %s (%s) %s\n", r.Direction, r.Source.Version, r.Source.Path, r.Duration.Round(time.Millisecond), status)
	}
}
