package api

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/gaucho-racing/mapache/p987/config"
	"github.com/gaucho-racing/mapache/p987/dbc"
	"github.com/gaucho-racing/mapache/p987/model"
	"github.com/gaucho-racing/mapache/p987/service"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"

	"github.com/gin-gonic/gin"
)

// Bytes is hex-encoded (not the default base64) so the dashboard's hex
// grid can render without re-encoding.
type canMessageResponse struct {
	ID          string           `json:"id"`
	VehicleID   string           `json:"vehicle_id"`
	NodeID      string           `json:"node_id"`
	Timestamp   int              `json:"timestamp"`
	CANID       int              `json:"can_id"`
	Bytes       string           `json:"bytes"`
	UploadKey   int              `json:"upload_key"`
	Metadata    map[string]any   `json:"metadata,omitempty"`
	ProducedAt  string           `json:"produced_at"`
	CreatedAt   string           `json:"created_at"`
	MessageName string           `json:"message_name,omitempty"`
	Fields      []canSignalTrace `json:"fields"`
	Signals     []mapache.Signal `json:"signals"`
}

// canSignalTrace shows where each signal came from inside the frame.
// gr26 traces byte-aligned fields; here the unit is a DBC signal, so the
// trace carries bit position and the scaling that produced the value.
type canSignalTrace struct {
	Name       string  `json:"name"`
	SignalName string  `json:"signal_name"`
	StartBit   int     `json:"start_bit"`
	Length     int     `json:"length"`
	Endian     string  `json:"endian"`
	Sign       string  `json:"sign"`
	Factor     float64 `json:"factor"`
	Offset     float64 `json:"offset"`
	Unit       string  `json:"unit,omitempty"`
	RawValue   int64   `json:"raw_value"`
	Value      float64 `json:"value"`
}

func GetCANMessage(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}
	respondWithCAN(c, service.GetCAN, id, "can message not found")
}

// GetCANBySignalID returns the same trace shape as GetCANMessage but looks
// up the source CAN frame by signal id.
func GetCANBySignalID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}
	respondWithCAN(c, service.GetCANForSignal, id, "no can frame linked to this signal")
}

func respondWithCAN(
	c *gin.Context,
	lookup func(string) (model.CAN, error),
	id string,
	notFoundMsg string,
) {
	if !config.ClickhouseEnabled() {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "clickhouse disabled"})
		return
	}
	can, err := lookup(id)
	if err != nil {
		if errors.Is(err, service.ErrNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": notFoundMsg})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	signals, err := service.GetSignalsForCAN(can.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	var meta map[string]any
	if len(can.Metadata) > 0 {
		_ = json.Unmarshal(can.Metadata, &meta)
	}

	name, fields := decodeSignalTrace(can)

	c.JSON(http.StatusOK, canMessageResponse{
		ID:          can.ID,
		VehicleID:   can.VehicleID,
		NodeID:      can.NodeID,
		Timestamp:   can.Timestamp,
		CANID:       can.CANID,
		Bytes:       hex.EncodeToString(can.Bytes),
		UploadKey:   can.UploadKey,
		Metadata:    meta,
		ProducedAt:  can.ProducedAt.UTC().Format("2006-01-02T15:04:05.000000Z"),
		CreatedAt:   can.CreatedAt.UTC().Format("2006-01-02T15:04:05.000000Z"),
		MessageName: name,
		Fields:      fields,
		Signals:     signals,
	})
}

// decodeSignalTrace re-runs the decoder to expose per-signal placement.
// Returns no fields for ids the DBC doesn't describe — the reason is
// already recorded in can.Metadata.
func decodeSignalTrace(can model.CAN) (string, []canSignalTrace) {
	db, err := dbc.Cayman987()
	if err != nil {
		return "", nil
	}
	msg, ok := db.Messages[uint32(can.CANID)]
	if !ok {
		return "", nil
	}

	decoded := msg.Decode(can.Bytes)
	byName := make(map[string]dbc.Decoded, len(decoded))
	for _, d := range decoded {
		byName[d.Name] = d
	}

	out := make([]canSignalTrace, 0, len(msg.Signals))
	for _, s := range msg.Signals {
		d, present := byName[s.Name]
		if !present {
			// Multiplexed, or it doesn't fit this frame. Skipped by the
			// decoder, so it has no value to report.
			continue
		}
		endian := "big"
		if s.LittleEndian {
			endian = "little"
		}
		sign := "unsigned"
		if s.Signed {
			sign = "signed"
		}
		out = append(out, canSignalTrace{
			Name:       s.Name,
			SignalName: fmt.Sprintf("%s_%s", can.NodeID, s.Name),
			StartBit:   s.StartBit,
			Length:     s.Length,
			Endian:     endian,
			Sign:       sign,
			Factor:     s.Factor,
			Offset:     s.Offset,
			Unit:       s.Unit,
			RawValue:   d.Raw,
			Value:      d.Value,
		})
	}
	return msg.Name, out
}
