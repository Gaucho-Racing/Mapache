package id

import (
	"strings"
	"testing"
)

func TestNewRoundTripsPrefix(t *testing.T) {
	for _, p := range []Prefix{User, ServiceAccount, AuthEvent} {
		s := New(p)
		if !strings.HasPrefix(s, string(p)+"_") {
			t.Fatalf("New(%q) = %q, want %q_ prefix", p, s, p)
		}
		got, err := PrefixOf(s)
		if err != nil {
			t.Fatalf("PrefixOf(%q): %v", s, err)
		}
		if got != p {
			t.Fatalf("PrefixOf(%q) = %q, want %q", s, got, p)
		}
	}
}

func TestNewIsTimeOrdered(t *testing.T) {
	a, b := New(User), New(User)
	if a >= b {
		t.Fatalf("expected %q < %q", a, b)
	}
}

func TestPrefixOfRejectsMalformed(t *testing.T) {
	for _, s := range []string{"", "usr", "usr_", "usr_not-a-ulid", "01jgy5fz7rqv8s3n0x4m6k2w1h"} {
		if _, err := PrefixOf(s); err == nil {
			t.Fatalf("PrefixOf(%q) succeeded, want error", s)
		}
	}
}
