package migrate

import (
	"database/sql"
	"fmt"
	"log/slog"

	"github.com/gaucho-racing/mapache/migrator/migrations"
	"github.com/pressly/goose/v3"
	"github.com/pressly/goose/v3/lock"
)

// postgresLockID keeps concurrent migrator runs (two admins, or a CLI run
// racing the admin app) from applying the same migration twice.
const postgresLockID = 0x6d617061 // "mapa"

func NewPostgres(db *sql.DB, log *slog.Logger) (*goose.Provider, error) {
	locker, err := lock.NewPostgresSessionLocker(lock.WithLockID(postgresLockID))
	if err != nil {
		return nil, fmt.Errorf("create postgres migration lock: %w", err)
	}
	provider, err := goose.NewProvider(
		goose.DialectPostgres,
		db,
		migrations.Postgres(),
		goose.WithSessionLocker(locker),
		goose.WithSlog(log),
		goose.WithDisableGlobalRegistry(true),
	)
	if err != nil {
		return nil, fmt.Errorf("create postgres migration provider: %w", err)
	}
	return provider, nil
}
