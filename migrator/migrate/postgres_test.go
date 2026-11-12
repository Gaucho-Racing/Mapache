package migrate

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/url"
	"os"
	"reflect"
	"slices"
	"strings"
	"sync"
	"testing"

	"github.com/gaucho-racing/mapache/pkg/dbversion"
	"github.com/gaucho-racing/mapache/pkg/id"
	"github.com/gaucho-racing/mapache/pkg/model"
	"github.com/gaucho-racing/ulid-go"
	_ "github.com/jackc/pgx/v5/stdlib"
	"github.com/pressly/goose/v3"
	"gorm.io/gorm/schema"
)

// freshDatabase creates an empty database on the server named by
// TEST_DATABASE_URL so each test starts from version 0, and drops it after.
func freshDatabase(t *testing.T) *sql.DB {
	t.Helper()
	adminURL := os.Getenv("TEST_DATABASE_URL")
	if adminURL == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping postgres integration test")
	}
	ctx := context.Background()

	admin, err := sql.Open("pgx", adminURL)
	if err != nil {
		t.Fatalf("open admin connection: %v", err)
	}
	t.Cleanup(func() { admin.Close() })

	name := "mapache_test_" + ulid.Make().String()
	if _, err := admin.ExecContext(ctx, "CREATE DATABASE "+name); err != nil {
		t.Fatalf("create database %s: %v", name, err)
	}

	u, err := url.Parse(adminURL)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	u.Path = "/" + name
	db, err := sql.Open("pgx", u.String())
	if err != nil {
		t.Fatalf("open test database: %v", err)
	}
	t.Cleanup(func() {
		db.Close()
		if _, err := admin.ExecContext(ctx, "DROP DATABASE IF EXISTS "+name+" WITH (FORCE)"); err != nil {
			t.Errorf("drop database %s: %v", name, err)
		}
	})
	return db
}

func newProvider(t *testing.T, db *sql.DB) *goose.Provider {
	t.Helper()
	p, err := NewPostgres(db, slog.New(slog.NewTextHandler(io.Discard, nil)))
	if err != nil {
		t.Fatalf("NewPostgres: %v", err)
	}
	return p
}

func migrateUp(t *testing.T, db *sql.DB) *goose.Provider {
	t.Helper()
	p := newProvider(t, db)
	if _, err := p.Up(context.Background()); err != nil {
		t.Fatalf("up: %v", err)
	}
	return p
}

func latestVersion(t *testing.T, p *goose.Provider) int64 {
	t.Helper()
	sources := p.ListSources()
	if len(sources) == 0 {
		t.Fatal("no migrations found")
	}
	return sources[len(sources)-1].Version
}

func TestMigrationsRoundTrip(t *testing.T) {
	db := freshDatabase(t)
	ctx := context.Background()
	p := migrateUp(t, db)

	if _, err := p.DownTo(ctx, 0); err != nil {
		t.Fatalf("down to 0: %v", err)
	}
	if _, err := p.Up(ctx); err != nil {
		t.Fatalf("up after full rollback: %v", err)
	}
}

func TestDBVersionTracksMigrator(t *testing.T) {
	db := freshDatabase(t)
	ctx := context.Background()

	var behind *dbversion.BehindError
	if err := dbversion.Require(ctx, db, 1); !errors.As(err, &behind) || behind.Current != 0 {
		t.Fatalf("Require before any migration = %v, want BehindError at version 0", err)
	}

	p := migrateUp(t, db)
	latest := latestVersion(t, p)

	got, err := dbversion.Current(ctx, db)
	if err != nil {
		t.Fatalf("Current: %v", err)
	}
	if got != latest {
		t.Fatalf("Current = %d, want %d", got, latest)
	}
	if err := dbversion.Require(ctx, db, latest); err != nil {
		t.Fatalf("Require(%d) after up: %v", latest, err)
	}
	if err := dbversion.Require(ctx, db, latest+1); !errors.As(err, &behind) {
		t.Fatalf("Require(%d) = %v, want BehindError", latest+1, err)
	}
}

// TestModelsMatchSchema fails when a pkg/model struct and the migrated tables
// disagree, e.g. a field was added without a migration or vice versa.
func TestModelsMatchSchema(t *testing.T) {
	db := freshDatabase(t)
	migrateUp(t, db)
	ctx := context.Background()
	cache := &sync.Map{}

	for _, m := range model.All() {
		name := reflect.TypeOf(m).Elem().Name()
		s, err := schema.Parse(m, cache, schema.NamingStrategy{})
		if err != nil {
			t.Fatalf("%s: parse gorm schema: %v", name, err)
		}
		tableSchema, table, ok := strings.Cut(s.Table, ".")
		if !ok {
			t.Fatalf("%s: table %q is not schema-qualified", name, s.Table)
		}

		dbColumns, err := columns(ctx, db, tableSchema, table)
		if err != nil {
			t.Fatalf("%s: %v", name, err)
		}
		if len(dbColumns) == 0 {
			t.Errorf("%s: table %s does not exist", name, s.Table)
			continue
		}

		var modelColumns []string
		for _, f := range s.Fields {
			if f.DBName != "" {
				modelColumns = append(modelColumns, f.DBName)
			}
		}
		for _, c := range modelColumns {
			if !slices.Contains(dbColumns, c) {
				t.Errorf("%s: field column %q missing from %s; add a migration", name, c, s.Table)
			}
		}
		for _, c := range dbColumns {
			if !slices.Contains(modelColumns, c) {
				t.Errorf("%s: %s.%s has no field on the model", name, s.Table, c)
			}
		}
	}
}

func columns(ctx context.Context, db *sql.DB, tableSchema, table string) ([]string, error) {
	rows, err := db.QueryContext(ctx,
		`SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2`,
		tableSchema, table)
	if err != nil {
		return nil, fmt.Errorf("list columns of %s.%s: %w", tableSchema, table, err)
	}
	defer rows.Close()
	var out []string
	for rows.Next() {
		var c string
		if err := rows.Scan(&c); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func TestEntityConstraints(t *testing.T) {
	db := freshDatabase(t)
	migrateUp(t, db)
	ctx := context.Background()

	userID := id.New(id.User)
	saID := id.New(id.ServiceAccount)
	mustExec(t, db, `INSERT INTO auth.entities (id, type) VALUES ($1, 'user'), ($2, 'service_account')`, userID, saID)
	mustExec(t, db, `INSERT INTO auth.users (id, email, name) VALUES ($1, 'Driver@GauchoRacing.com', 'Driver')`, userID)

	rejected := []struct {
		name  string
		query string
		args  []any
	}{
		{"entity prefix must match type", `INSERT INTO auth.entities (id, type) VALUES ($1, 'service_account')`, []any{id.New(id.User)}},
		{"entity type must be known", `INSERT INTO auth.entities (id, type) VALUES ($1, 'robot')`, []any{id.New(id.User)}},
		{"user must reference an existing entity", `INSERT INTO auth.users (id, email, name) VALUES ($1, 'ghost@example.com', 'Ghost')`, []any{id.New(id.User)}},
		{"user cannot be a service account entity", `INSERT INTO auth.users (id, email, name) VALUES ($1, 'bot@example.com', 'Bot')`, []any{saID}},
		{"email is unique ignoring case", `INSERT INTO auth.users (id, email, name) VALUES ($1, 'driver@gauchoracing.com', 'Dup')`, []any{insertEntity(t, db)}},
		{"auth event kind must be known", `INSERT INTO auth.auth_events (id, event, method, ip) VALUES ($1, 'teleported', 'password', '127.0.0.1')`, []any{id.New(id.AuthEvent)}},
	}
	for _, tc := range rejected {
		if _, err := db.ExecContext(ctx, tc.query, tc.args...); err == nil {
			t.Errorf("%s: insert succeeded, want constraint violation", tc.name)
		}
	}

	mustExec(t, db, `DELETE FROM auth.entities WHERE id = $1`, userID)
	var n int
	if err := db.QueryRowContext(ctx, `SELECT count(*) FROM auth.users WHERE id = $1`, userID).Scan(&n); err != nil {
		t.Fatal(err)
	}
	if n != 0 {
		t.Errorf("deleting the entity left %d user row(s), want cascade", n)
	}
}

func insertEntity(t *testing.T, db *sql.DB) string {
	t.Helper()
	uid := id.New(id.User)
	mustExec(t, db, `INSERT INTO auth.entities (id, type) VALUES ($1, 'user')`, uid)
	return uid
}

func mustExec(t *testing.T, db *sql.DB, query string, args ...any) {
	t.Helper()
	if _, err := db.ExecContext(context.Background(), query, args...); err != nil {
		t.Fatalf("exec %q: %v", query, err)
	}
}
