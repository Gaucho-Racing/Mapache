package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// Stock Porsche signals do not sit on byte boundaries — SCCM_SteeringAngle
// is 13 bits starting at bit 2 — so a field here is the contiguous run of
// bytes its signals occupy, and each signal is shifted and masked out of
// the field value. Shifts are relative to the start of the field, not the
// start of the frame.

// raw pulls length bits starting shift bits into the field value,
// sign-extending when the DBC marks the signal signed.
func raw(v, shift, length int, signed bool) int {
	if length >= 64 {
		return v
	}
	x := (v >> shift) & (1<<length - 1)
	if signed && x&(1<<(length-1)) != 0 {
		x |= ^0 << length
	}
	return x
}

// sig builds a scaled signal from a bit range within a field.
func sig(name string, v, shift, length int, signed bool, factor, offset float64) mp.Signal {
	r := raw(v, shift, length, signed)
	return mp.Signal{Name: name, Value: float64(r)*factor + offset, RawValue: r}
}

// flag builds a boolean signal from a single bit.
func flag(name string, v, shift int) mp.Signal {
	r := v >> shift & 1
	return mp.Signal{Name: name, Value: float64(r), RawValue: r}
}
