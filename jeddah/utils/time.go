package utils

import (
	"math"
	"time"
)

func WithPrecision(t time.Time) time.Time {
	round := time.Second / time.Duration(math.Pow10(6))
	return t.Round(round)
}
