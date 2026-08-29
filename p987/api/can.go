package api

import (
	"encoding/hex"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gaucho-racing/mapache/p987/config"
	"github.com/gaucho-racing/mapache/p987/model"
	"github.com/gaucho-racing/mapache/p987/service"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"

	"github.com/gin-gonic/gin"
)

// Bytes is hex-encoded (not the default base64) so the dashboard's hex
// grid can render without re-encoding.
type canMessageResponse struct {
	ID         string           `json:"id"`
	VehicleID  string           `json:"vehicle_id"`
	NodeID     string           `json:"node_id"`
	Timestamp  int              `json:"timestamp"`
	CANID      int              `json:"can_id"`
	Bytes      string           `json:"bytes"`
	UploadKey  int              `json:"upload_key"`
	Metadata   map[string]any   `json:"metadata,omitempty"`
	ProducedAt string           `json:"produced_at"`
	CreatedAt  string           `json:"created_at"`
	Fields     []canFieldTrace  `json:"fields"`
	Signals    []mapache.Signal `json:"signals"`
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
		Fields:     decodeFieldTrace(can),
		Signals:    signals,
	})
}
