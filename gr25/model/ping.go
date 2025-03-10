package model

type Ping struct {
	VehicleID string `json:"vehicle_id"`
	Ping      int    `json:"ping"`
	Pong      int    `json:"pong"`
	Latency   int    `json:"latency"`
}

func (Ping) TableName() string {
	return "ping"
}
