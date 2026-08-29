package api

import (
	"net/http"
	"sort"
	"strconv"
	"strings"

	"github.com/gaucho-racing/mapache/p987/dbc"

	"github.com/gin-gonic/gin"
)

type dbcMessageResponse struct {
	ID      uint32              `json:"id"`
	HexID   string              `json:"hex_id"`
	Name    string              `json:"name"`
	Length  int                 `json:"length"`
	Signals []dbcSignalResponse `json:"signals"`
}

type dbcSignalResponse struct {
	Name        string  `json:"name"`
	StartBit    int     `json:"start_bit"`
	Length      int     `json:"length"`
	Endian      string  `json:"endian"`
	Signed      bool    `json:"signed"`
	Factor      float64 `json:"factor"`
	Offset      float64 `json:"offset"`
	Unit        string  `json:"unit,omitempty"`
	Multiplexed bool    `json:"multiplexed"`
}

// GetDBC lists every message in the loaded database, ordered by id.
func GetDBC(c *gin.Context) {
	db, err := dbc.Cayman987()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	out := make([]dbcMessageResponse, 0, len(db.Messages))
	for _, m := range db.Messages {
		out = append(out, toDBCResponse(m))
	}
	sort.Slice(out, func(i, j int) bool { return out[i].ID < out[j].ID })

	c.JSON(http.StatusOK, gin.H{
		"messages":          out,
		"message_count":     len(db.Messages),
		"signal_count":      db.SignalCount(),
		"multiplexed_count": db.MultiplexedCount(),
	})
}

// GetDBCMessage looks up one message by decimal or 0x-prefixed hex id.
func GetDBCMessage(c *gin.Context) {
	db, err := dbc.Cayman987()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	raw := c.Param("id")
	base, digits := 10, raw
	if strings.HasPrefix(strings.ToLower(raw), "0x") {
		base, digits = 16, raw[2:]
	}
	id, err := strconv.ParseUint(digits, base, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id must be a decimal or 0x-prefixed hex can id"})
		return
	}

	msg, ok := db.Messages[uint32(id)]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "no dbc entry for that can id"})
		return
	}
	c.JSON(http.StatusOK, toDBCResponse(msg))
}

func toDBCResponse(m *dbc.Message) dbcMessageResponse {
	signals := make([]dbcSignalResponse, 0, len(m.Signals))
	for _, s := range m.Signals {
		endian := "big"
		if s.LittleEndian {
			endian = "little"
		}
		signals = append(signals, dbcSignalResponse{
			Name:        s.Name,
			StartBit:    s.StartBit,
			Length:      s.Length,
			Endian:      endian,
			Signed:      s.Signed,
			Factor:      s.Factor,
			Offset:      s.Offset,
			Unit:        s.Unit,
			Multiplexed: s.Multiplexed,
		})
	}
	return dbcMessageResponse{
		ID:      m.ID,
		HexID:   "0x" + strconv.FormatUint(uint64(m.ID), 16),
		Name:    m.Name,
		Length:  m.Length,
		Signals: signals,
	}
}
