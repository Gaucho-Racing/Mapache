package migrations

import (
	"embed"
	"io/fs"
)

//go:embed postgres/*.sql
var postgres embed.FS

func Postgres() fs.FS {
	sub, err := fs.Sub(postgres, "postgres")
	if err != nil {
		panic(err)
	}
	return sub
}
