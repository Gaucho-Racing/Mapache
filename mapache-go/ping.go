package mapache

// Ping is a type to represent a ping between the vehicle and the server.
// Note that only the uplink latency is saved on the server. The vehicle does receive pongs,
// so it may choose to record the round trip time if it desires.
type Ping struct {
	// VehicleID is the unique identifier for the vehicle that sent the ping.
	VehicleID string `json:"vehicle_id" gorm:"primaryKey"`
	// Ping is the unix millis when the vehicle sent the ping.
	Ping int `json:"ping" gorm:"primaryKey"`
	// Pong is the unix millis when the vehicle received the ping.
	Pong int `json:"pong"`
	// Latency is the latency of the ping in milliseconds.
	Latency int `json:"latency"`
}

func (Ping) TableName() string {
	return "ping"
}
