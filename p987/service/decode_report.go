package service

import (
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/gaucho-racing/mapache/p987/pkg/logger"
)

// A frame that produces no signals never reaches the live path — it is
// stored with a status in its metadata and dropped. That is correct
// behaviour but it made "frames arrive, nothing shows up live" impossible
// to diagnose without querying ClickHouse, so decode outcomes are counted
// here and reported.
//
// Frames arrive at a few hundred per second, so a line per failure would
// bury everything else and out-write the disk. Each distinct
// (bus, can id, reason) logs once when first seen — a new unknown id is
// visible immediately — and repeats are rolled up on an interval.

const decodeReportInterval = 30 * time.Second

// maxReportedKinds bounds the summary line. A bus carrying dozens of
// undecodable ids should not produce an unbounded log entry.
const maxReportedKinds = 12

type decodeKey struct {
	bus    string
	canID  int
	status string
}

type decodeStat struct {
	total       int64
	sinceReport int64
}

var (
	decodeMu      sync.Mutex
	decodeStats   = map[decodeKey]*decodeStat{}
	decodedOK     int64
	decodedFailed int64
)

// NoteDecodeOutcome records one frame's decode result.
func NoteDecodeOutcome(bus string, canID int, status, note string) {
	decodeMu.Lock()
	if status == statusOK {
		decodedOK++
		decodeMu.Unlock()
		return
	}
	decodedFailed++

	key := decodeKey{bus: bus, canID: canID, status: status}
	stat, ok := decodeStats[key]
	if !ok {
		stat = &decodeStat{}
		decodeStats[key] = stat
	}
	first := stat.total == 0
	stat.total++
	stat.sinceReport++
	decodeMu.Unlock()

	if first {
		logger.SugarLogger.Warnf("[DECODE] %s 0x%X %s: %s", bus, canID, status, note)
	}
}

// InitDecodeReporting starts the rollup. Runs for the life of the process.
func InitDecodeReporting() {
	go func() {
		ticker := time.NewTicker(decodeReportInterval)
		defer ticker.Stop()
		for range ticker.C {
			reportDecodeOutcomes()
		}
	}()
}

func reportDecodeOutcomes() {
	decodeMu.Lock()
	ok, failed := decodedOK, decodedFailed
	decodedOK, decodedFailed = 0, 0

	type entry struct {
		key   decodeKey
		count int64
	}
	entries := make([]entry, 0, len(decodeStats))
	for k, s := range decodeStats {
		if s.sinceReport > 0 {
			entries = append(entries, entry{k, s.sinceReport})
			s.sinceReport = 0
		}
	}
	decodeMu.Unlock()

	if ok == 0 && failed == 0 {
		return
	}

	// Loudest offenders first — that is what you act on.
	sort.Slice(entries, func(i, j int) bool { return entries[i].count > entries[j].count })

	var b strings.Builder
	fmt.Fprintf(&b, "[DECODE] %s: %d decoded, %d undecodable", decodeReportInterval, ok, failed)
	if len(entries) > 0 {
		b.WriteString(" —")
		for i, e := range entries {
			if i == maxReportedKinds {
				fmt.Fprintf(&b, " (+%d more kinds)", len(entries)-i)
				break
			}
			fmt.Fprintf(&b, " %s/0x%X %s ×%d", e.key.bus, e.key.canID, e.key.status, e.count)
		}
	}

	if failed > 0 {
		logger.SugarLogger.Warnln(b.String())
		return
	}
	logger.SugarLogger.Infoln(b.String())
}
