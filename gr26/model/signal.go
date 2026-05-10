package model

import mapache "github.com/gaucho-racing/mapache/mapache-go/v3"

// SignalEvent is the gr26-local payload the live WebSocket emits. It
// embeds mapache.Signal for backward-compatible fields and adds the
// can_message_id so consumers (e.g. the dashboard's debug trace) can go
// from a streamed signal back to the CAN frame it was decoded from.
type SignalEvent struct {
	mapache.Signal
	CANMessageID string `json:"can_message_id,omitempty"`
}
