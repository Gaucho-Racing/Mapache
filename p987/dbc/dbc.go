// Package dbc parses a subset of the DBC format and decodes CAN frames
// against it.
//
// gr26 describes its messages with mapache-go's Message/Field types, which
// model a frame as a sequence of whole-byte fields. That works for GR's own
// CAN, where the layout was designed alongside the decoder. It cannot
// describe stock Porsche CAN: signals there start at arbitrary bit offsets
// and run arbitrary bit lengths (SCCM_SteeringAngle is 13 bits starting at
// bit 2), and they carry a scale and offset. So p987 decodes from the DBC
// itself rather than from hand-written field lists.
package dbc

import (
	"bufio"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
)

// Signal is one decoded value within a message.
type Signal struct {
	Name     string
	StartBit int
	Length   int
	// LittleEndian is DBC byte order @1 (Intel). @0 is Motorola.
	LittleEndian bool
	Signed       bool
	Factor       float64
	Offset       float64
	Unit         string
	// Multiplexed marks a signal that is only present for a particular
	// multiplexer value (the "m0" indicator). See Message.Multiplexed.
	Multiplexed bool
}

// Message is one CAN arbitration id and the signals it carries.
type Message struct {
	ID      uint32
	Name    string
	Length  int
	Signals []Signal
}

// Database is a parsed DBC file, indexed by arbitration id.
type Database struct {
	Messages map[uint32]*Message
}

var (
	messageRe = regexp.MustCompile(`^BO_\s+(\d+)\s+([A-Za-z0-9_]+)\s*:\s*(\d+)\s+([A-Za-z0-9_]+)`)
	// Signal name may be followed by a multiplexer indicator (M or m<n>).
	signalRe = regexp.MustCompile(`^\s*SG_\s+([A-Za-z0-9_]+)\s*(M|m\d+)?\s*:\s*(\d+)\|(\d+)@([01])([+-])\s*\(([^,]+),([^)]+)\)\s*\[([^|]*)\|([^\]]*)\]\s*"([^"]*)"`)
)

// Parse reads a DBC file. Lines it does not recognize (BU_, CM_, VAL_,
// attribute definitions) are skipped: this decodes frames, it is not a
// general-purpose DBC editor.
func Parse(r io.Reader) (*Database, error) {
	db := &Database{Messages: make(map[uint32]*Message)}

	scanner := bufio.NewScanner(r)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	var current *Message
	line := 0
	for scanner.Scan() {
		line++
		text := scanner.Text()

		if m := messageRe.FindStringSubmatch(text); m != nil {
			id, err := strconv.ParseUint(m[1], 10, 32)
			if err != nil {
				return nil, fmt.Errorf("line %d: bad message id %q: %w", line, m[1], err)
			}
			length, err := strconv.Atoi(m[3])
			if err != nil {
				return nil, fmt.Errorf("line %d: bad message length %q: %w", line, m[3], err)
			}
			msg := &Message{ID: uint32(id), Name: m[2], Length: length}
			db.Messages[msg.ID] = msg
			current = msg
			continue
		}

		// Must be the SG_ token itself, not a keyword that merely starts
		// with it — the NS_ header block lists SG_MUL_VAL_.
		if trimmed := strings.TrimSpace(text); isSignalLine(trimmed) {
			if current == nil {
				return nil, fmt.Errorf("line %d: signal outside any message", line)
			}
			sig, err := parseSignal(text)
			if err != nil {
				return nil, fmt.Errorf("line %d: %w", line, err)
			}
			current.Signals = append(current.Signals, sig)
			continue
		}

		// A blank line ends the current message block; anything else at
		// column 0 starts a new section.
		if strings.TrimSpace(text) == "" || !strings.HasPrefix(text, " ") {
			current = nil
		}
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	if len(db.Messages) == 0 {
		return nil, fmt.Errorf("no messages found")
	}
	return db, nil
}

// isSignalLine reports whether a trimmed line opens with the SG_ keyword
// followed by a separator.
func isSignalLine(trimmed string) bool {
	const kw = "SG_"
	if !strings.HasPrefix(trimmed, kw) || len(trimmed) <= len(kw) {
		return false
	}
	return trimmed[len(kw)] == ' ' || trimmed[len(kw)] == '\t'
}

func parseSignal(text string) (Signal, error) {
	m := signalRe.FindStringSubmatch(text)
	if m == nil {
		return Signal{}, fmt.Errorf("malformed signal: %q", strings.TrimSpace(text))
	}

	startBit, err := strconv.Atoi(m[3])
	if err != nil {
		return Signal{}, fmt.Errorf("bad start bit %q: %w", m[3], err)
	}
	length, err := strconv.Atoi(m[4])
	if err != nil {
		return Signal{}, fmt.Errorf("bad length %q: %w", m[4], err)
	}
	if length < 1 || length > 64 {
		return Signal{}, fmt.Errorf("signal %s: length %d out of range", m[1], length)
	}
	factor, err := strconv.ParseFloat(strings.TrimSpace(m[7]), 64)
	if err != nil {
		return Signal{}, fmt.Errorf("bad factor %q: %w", m[7], err)
	}
	offset, err := strconv.ParseFloat(strings.TrimSpace(m[8]), 64)
	if err != nil {
		return Signal{}, fmt.Errorf("bad offset %q: %w", m[8], err)
	}

	return Signal{
		Name:         m[1],
		StartBit:     startBit,
		Length:       length,
		LittleEndian: m[5] == "1",
		Signed:       m[6] == "-",
		Factor:       factor,
		Offset:       offset,
		Unit:         m[11],
		Multiplexed:  m[2] != "",
	}, nil
}

// SignalCount is the total number of signals across every message.
func (d *Database) SignalCount() int {
	n := 0
	for _, m := range d.Messages {
		n += len(m.Signals)
	}
	return n
}

// MultiplexedCount is the number of signals skipped at decode time
// because they carry a multiplexer indicator.
func (d *Database) MultiplexedCount() int {
	n := 0
	for _, m := range d.Messages {
		for _, s := range m.Signals {
			if s.Multiplexed {
				n++
			}
		}
	}
	return n
}
