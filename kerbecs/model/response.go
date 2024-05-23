package model

import "github.com/goccy/go-json"

type Response struct {
	Status    string          `json:"status"`
	Ping      string          `json:"ping"`
	Gateway   string          `json:"gateway"`
	Service   string          `json:"service"`
	Timestamp string          `json:"timestamp"`
	Data      json.RawMessage `json:"data"`
}
