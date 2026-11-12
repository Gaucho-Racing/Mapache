package model

// All lists every persisted model. The migrator's schema test checks each one
// against the migrated database, so a new model must be added here.
func All() []any {
	return []any{
		&Entity{},
		&User{},
		&UserPassword{},
		&AuthEvent{},
	}
}
