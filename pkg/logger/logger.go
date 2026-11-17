package logger

import (
	"log/slog"
	"os"
)

// New returns a JSON logger in production and a human-readable one elsewhere,
// tagged with the service name on every record.
func New(service string, production bool) *slog.Logger {
	opts := &slog.HandlerOptions{Level: slog.LevelInfo}
	var h slog.Handler
	if production {
		h = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		opts.Level = slog.LevelDebug
		h = slog.NewTextHandler(os.Stdout, opts)
	}
	return slog.New(h).With("service", service)
}
