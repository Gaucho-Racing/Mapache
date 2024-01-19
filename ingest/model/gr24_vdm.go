package model

import (
	"time"
)

type GR24VDM struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Millis    int       `json:"millis" gorm:"index"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	// Frame 1 - ID:100
	CellNumber string `json:"cell_number"`
	DataType   string `json:"data_type"`
	Periodic   string `json:"periodic"`
	// Frame 2 - ID:101
	FanOneSpeed   int `json:"fan_one_speed"`
	FanTwoSpeed   int `json:"fan_two_speed"`
	FanThreeSpeed int `json:"fan_three_speed"`
	FanFourSpeed  int `json:"fan_four_speed"`
	PumpSpeed     int `json:"pump_speed"`
	// Frame 3 - ID:102
	SoundCode string `json:"sound_code"`
	// Frame 4 - ID:202
	PedalPingRequest string `json:"pedal_ping_request"`
	// Frame 5 - ID:250
	State string `json:"state" gorm:"index"`
	// Frame 6 - ID:278
	CurrentAC int `json:"current_ac"`
	// Frame 7 - ID:534
	TargetBrakeCurrent int `json:"target_brake_current"`
	// Frame 8 - ID:790
	TargetERPM int `json:"target_erpm"`
	// Frame 9 - ID:1046
	TargetPosition int `json:"target_position"`
	// Frame 10 - ID:1302
	RelativeCurrentAC int `json:"relative_current_ac"`
	// Frame 11 - ID:1558
	RelativeBrakeCurrentAC int `json:"relative_brake_current_ac"`
	// Frame 12 - ID:1814
	DigitalIO string `json:"digital_io"`
	// Frame 13 - ID:2070
	MaxCurrentAC int `json:"max_current_ac"`
	// Frame 14 - ID:2326
	MaxBrakeCurrentAC int `json:"max_brake_current_ac"`
	// Frame 15 - ID:2582
	MaxCurrentDC int `json:"max_current_dc"`
	// Frame 16 - ID:2838
	MaxBrakeCurrentDC int `json:"max_brake_current_dc"`
	// Frame 17 - ID:3094
	DriveEnable string `json:"drive_enable"`
}

func (GR24VDM) TableName() string {
	return "gr24_vdm"
}
