package id

import (
	"fmt"

	"github.com/gaucho-racing/ulid-go"
)

type Prefix string

const (
	User           Prefix = "usr"
	ServiceAccount Prefix = "sa"
	AuthEvent      Prefix = "aev"
)

func New(p Prefix) string {
	return ulid.Make().Prefixed(string(p))
}

func PrefixOf(s string) (Prefix, error) {
	prefix, _, err := ulid.ParsePrefixed(s)
	if err != nil {
		return "", fmt.Errorf("parse id %q: %w", s, err)
	}
	return Prefix(prefix), nil
}
