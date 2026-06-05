package api

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"

	"github.com/gaucho-racing/mapache/gr26/model"
	"github.com/gaucho-racing/mapache/gr26/service"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"

	"github.com/gin-gonic/gin"
)

// canMessageResponse is the GET /gr26/messages/:id wire shape. We
// hex-encode the bytes (rather than the default base64 for []byte) so the
// dashboard can render the hex grid without re-encoding.
type canMessageResponse struct {
	ID         string                 `json:"id"`
	VehicleID  string                 `json:"vehicle_id"`
	NodeID     string                 `json:"node_id"`
	Timestamp  int                    `json:"timestamp"`
	CANID      int                    `json:"can_id"`
	Bytes      string                 `json:"bytes"`
	UploadKey  int                    `json:"upload_key"`
	Metadata   map[string]any         `json:"metadata,omitempty"`
	ProducedAt string                 `json:"produced_at"`
	CreatedAt  string                 `json:"created_at"`
	Fields     []canFieldTrace        `json:"fields"`
	Signals    []mapache.Signal       `json:"signals"`
}

// canFieldTrace describes one field of a decoded CAN frame: its byte
// range within the frame, decoded raw value, and which signal names it
// produces.
type canFieldTrace struct {
	Name        string   `json:"name"`
	Offset      int      `json:"offset"`
	Size        int      `json:"size"`
	Sign        string   `json:"sign"`
	Endian      string   `json:"endian"`
	Bytes       string   `json:"bytes"`
	RawValue    int      `json:"raw_value"`
	SignalNames []string `json:"signal_names"`
}

func GetCANMessage(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id is required"})
		return
	}
	respondWithCAN(c, service.GetCAN, id, "can message not found")
}

// GetCANBySignalID returns the same trace shape as GetCANMessage but
// looks up the CAN frame by the signal id that came from it. Lets the
// dashboard go straight from a streamed signal.id (which is just
// mapache.Signal — no extra wire fields) to its source frame in one
// call.
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

	fields := decodeFieldTrace(can)

	var meta map[string]any
	if len(can.Metadata) > 0 {
		_ = json.Unmarshal(can.Metadata, &meta)
	}

	c.JSON(http.StatusOK, canMessageResponse{
		ID:         can.ID,
		VehicleID:  can.VehicleID,
		NodeID:     can.NodeID,
		Timestamp:  can.Timestamp,
		CANID:      can.CANID,
		Bytes:      hex.EncodeToString(can.Bytes),
		UploadKey:  can.UploadKey,
		Metadata:   meta,
		ProducedAt: can.ProducedAt.UTC().Format("2006-01-02T15:04:05.000000Z"),
		CreatedAt:  can.CreatedAt.UTC().Format("2006-01-02T15:04:05.000000Z"),
		Fields:     fields,
		Signals:    signals,
	})
}

// decodeFieldTrace re-runs the gr26 decoder over the stored bytes so the
// response carries per-field metadata (offset, size, sign, endian, the
// bytes that contributed, the raw value, and the signal names produced).
// Returns nil if the can id has no registered decoder or if the bytes
// don't fit the field layout — both of those are already captured in
// can.Metadata.
func decodeFieldTrace(can model.CAN) []canFieldTrace {
	messageStruct := model.GetMessage(can.CANID)
	if messageStruct == nil {
		return nil
	}
	if err := messageStruct.FillFromBytes(can.Bytes); err != nil {
		return nil
	}

	out := make([]canFieldTrace, 0, len(messageStruct))
	offset := 0
	for _, f := range messageStruct {
		signalNames := make([]string, 0)
		for _, s := range f.ExportSignals() {
			signalNames = append(signalNames, fmt.Sprintf("%s_%s", can.NodeID, s.Name))
		}
		out = append(out, canFieldTrace{
			Name:        f.Name,
			Offset:      offset,
			Size:        f.Size,
			Sign:        signMode(f.Sign),
			Endian:      endian(f.Endian),
			Bytes:       hex.EncodeToString(f.Bytes),
			RawValue:    f.Value,
			SignalNames: signalNames,
		})
		offset += f.Size
	}
	return out
}

func signMode(s mapache.SignMode) string {
	if s == mapache.Signed {
		return "signed"
	}
	return "unsigned"
}

func endian(e mapache.Endian) string {
	if e == mapache.BigEndian {
		return "big"
	}
	return "little"
}
