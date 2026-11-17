module github.com/gaucho-racing/mapache/migrator

go 1.26.0

require (
	github.com/gaucho-racing/mapache/pkg v0.0.0
	github.com/gaucho-racing/ulid-go v1.1.0
	github.com/jackc/pgx/v5 v5.13.0
	github.com/pressly/goose/v3 v3.30.0
	gorm.io/gorm v1.31.2
)

require (
	github.com/jackc/pgpassfile v1.0.0 // indirect
	github.com/jackc/pgservicefile v0.0.0-20240606120523-5a60cdf6a761 // indirect
	github.com/jackc/puddle/v2 v2.2.3 // indirect
	github.com/jinzhu/inflection v1.0.0 // indirect
	github.com/jinzhu/now v1.1.5 // indirect
	github.com/mfridman/interpolate v0.0.2 // indirect
	github.com/sethvargo/go-retry v0.5.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/sync v0.25.0 // indirect
	golang.org/x/text v0.44.0 // indirect
)

replace github.com/gaucho-racing/mapache/pkg => ../pkg
