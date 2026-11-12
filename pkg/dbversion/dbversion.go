package dbversion

import (
	"context"
	"database/sql"
	"fmt"
)

// VersionTable is the goose version table written by the migrator.
const VersionTable = "public.goose_db_version"

type BehindError struct {
	Required int64
	Current  int64
}

func (e *BehindError) Error() string {
	return fmt.Sprintf("database schema is at version %d, service requires %d; run the pending migrations", e.Current, e.Required)
}

// Current returns the highest applied Postgres migration version, or 0 when the
// migrator has never run against this database.
func Current(ctx context.Context, db *sql.DB) (int64, error) {
	var exists bool
	if err := db.QueryRowContext(ctx, "SELECT to_regclass($1) IS NOT NULL", VersionTable).Scan(&exists); err != nil {
		return 0, fmt.Errorf("check for %s: %w", VersionTable, err)
	}
	if !exists {
		return 0, nil
	}
	var version int64
	err := db.QueryRowContext(ctx, "SELECT COALESCE(MAX(version_id), 0) FROM "+VersionTable+" WHERE is_applied").Scan(&version)
	if err != nil {
		return 0, fmt.Errorf("read schema version: %w", err)
	}
	return version, nil
}

// Require returns a *BehindError when the database has not reached the
// version a service was built against. Services report not-ready until it
// returns nil, because migrations are only ever applied manually.
func Require(ctx context.Context, db *sql.DB, required int64) error {
	current, err := Current(ctx, db)
	if err != nil {
		return err
	}
	if current < required {
		return &BehindError{Required: required, Current: current}
	}
	return nil
}
