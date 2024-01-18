package gr24

import (
	"github.com/google/uuid"
	"ingest/utils"
	"time"
)

type Pedal struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Millis    int       `json:"millis" gorm:"index"`
	CreatedAt time.Time `json:"time" gorm:"autoCreateTime;precision:6"`
	// Frame 1 - ID:200
	APPSOne            int `json:"apps_one"`
	APPSTwo            int `json:"apps_two"`
	BrakePressureFront int `json:"brake_pressure_front"`
	BrakePressureRear  int `json:"brake_pressure_rear"`
}

// ParsePedal function takes in a byte array and returns a Pedal struct
func ParsePedal(data []byte) Pedal {
	var pedal Pedal
	if len(data) != 16 {
		utils.SugarLogger.Warnln("Pedal data length is not 16 bytes!")
		return pedal
	}
	pedal.ID = uuid.NewString()
	pedal.Millis = int(time.Now().UnixMilli())
	pedal.APPSOne = int(data[0])<<8 | int(data[1])
	pedal.APPSTwo = int(data[2])<<8 | int(data[3])
	pedal.BrakePressureFront = int(data[4])<<8 | int(data[5])
	pedal.BrakePressureRear = int(data[6])<<8 | int(data[7])
	return pedal
}
