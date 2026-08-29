package dbc

import (
	_ "embed"
	"strings"
	"sync"
)

//go:embed cayman_987.dbc
var caymanDBC string

var (
	loadOnce sync.Once
	loaded   *Database
	loadErr  error
)

// Cayman987 returns the embedded 987 database, parsed once. Embedding
// rather than reading a path keeps the image self-contained and makes a
// malformed DBC a startup failure instead of a runtime surprise.
func Cayman987() (*Database, error) {
	loadOnce.Do(func() {
		loaded, loadErr = Parse(strings.NewReader(caymanDBC))
	})
	return loaded, loadErr
}

// Decoded is one signal decoded out of a frame.
type Decoded struct {
	Name  string
	Value float64
	Raw   int64
	Unit  string
}

// Decode extracts every non-multiplexed signal in msg from data.
//
// Multiplexed signals are skipped. Resolving them requires the message's
// multiplexer switch signal (the "M" indicator), and the 987 DBC declares
// multiplexed signals without ever declaring the switch — so there is no
// correct way to know which variant a given frame carries. Decoding them
// anyway would emit three wrong values for every right one.
//
// Signals that extend past the end of the frame are skipped rather than
// zero-filled: a short frame means the data is not what the DBC describes,
// and a plausible-looking zero is worse than a missing signal.
func (m *Message) Decode(data []byte) []Decoded {
	out := make([]Decoded, 0, len(m.Signals))
	for _, s := range m.Signals {
		if s.Multiplexed {
			continue
		}
		raw, ok := s.extract(data)
		if !ok {
			continue
		}
		out = append(out, Decoded{
			Name:  s.Name,
			Value: float64(raw)*s.Factor + s.Offset,
			Raw:   raw,
			Unit:  s.Unit,
		})
	}
	return out
}

// extract pulls the signal's raw integer out of the frame, applying sign
// extension. ok is false when the signal does not fit in the data.
func (s Signal) extract(data []byte) (int64, bool) {
	var bits uint64
	if s.LittleEndian {
		var ok bool
		bits, ok = extractLittleEndian(data, s.StartBit, s.Length)
		if !ok {
			return 0, false
		}
	} else {
		var ok bool
		bits, ok = extractBigEndian(data, s.StartBit, s.Length)
		if !ok {
			return 0, false
		}
	}

	if s.Signed && s.Length < 64 && bits&(1<<(s.Length-1)) != 0 {
		bits |= ^uint64(0) << s.Length
	}
	return int64(bits), true
}

// extractLittleEndian reads Intel byte order: start bit is the signal's
// least significant bit, and bit numbering runs LSB-first within each byte
// and then upward through the bytes.
func extractLittleEndian(data []byte, startBit, length int) (uint64, bool) {
	if startBit < 0 || length < 1 || startBit+length > len(data)*8 {
		return 0, false
	}
	var v uint64
	for i := 0; i < length; i++ {
		bit := startBit + i
		if data[bit/8]>>(bit%8)&1 == 1 {
			v |= 1 << i
		}
	}
	return v, true
}

// extractBigEndian reads Motorola byte order: start bit is the signal's
// most significant bit, and consecutive bits walk downward within a byte
// then continue at the top of the next byte.
func extractBigEndian(data []byte, startBit, length int) (uint64, bool) {
	if startBit < 0 || length < 1 || startBit >= len(data)*8 {
		return 0, false
	}
	var v uint64
	bit := startBit
	for i := 0; i < length; i++ {
		if bit/8 >= len(data) || bit < 0 {
			return 0, false
		}
		v = v<<1 | uint64(data[bit/8]>>(bit%8)&1)
		if bit%8 == 0 {
			bit += 15 // down to the next byte, back up to its MSB
		} else {
			bit--
		}
	}
	return v, true
}
