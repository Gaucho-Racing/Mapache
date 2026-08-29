package api

import (
	"encoding/hex"
	"fmt"

	"github.com/gaucho-racing/mapache/p987/model"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

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

// decodeFieldTrace re-runs the decoder to expose per-field metadata.
// Returns nil for unknown ids and decode failures — the reason is already
// recorded in can.Metadata.
func decodeFieldTrace(can model.CAN) []canFieldTrace {
	messageStruct := model.GetMessage(can.NodeID, can.CANID)
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
