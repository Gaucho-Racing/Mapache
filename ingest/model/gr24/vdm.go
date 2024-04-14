package gr24model

import "time"

type VDM struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	Millis    int       `json:"millis" gorm:"index"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	// Frame 1 - ID:100
	SetCellNumber int `json:"cell_number"`
	SetDataType   int `json:"data_type"`
	SetPeriodic   int `json:"periodic"`
	// Frame 2 - ID:102
	PrechargeStart int `json:"precharge_start"`
	// Frame 3 - ID:240
	State    int `json:"state"`
	Mode     int `json:"mode"`
	RevLimit int `json:"rev_limit"`
	// Frame 4 - ID:241
	Errors int `json:"errors"` // TODO: need to split this up into individual error bits
	// Frame 5 - ID:242
	PingNode int `json:"ping_node"`
	PingTime int `json:"ping_time"`
	// Frame 6 - ID:243
	// TODO: can probably skip this?
	// Frame 7 - ID:278
	ACCurrent int `json:"ac_current"`
	// Frame 8 - ID:534
	TargetBrakeCurrent int `json:"target_brake_current"`
	// Frame 9 - ID:790
	TargetERPM int `json:"target_erpm"`
	// Frame 10 - ID:1046
	TargetPosition int `json:"target_position"`
	// Frame 11 - ID:1302
	RelativeACCurrent int `json:"relative_ac_current"`
	// Frame 12 - ID:1558
	RelativeACBrakeCurrent int `json:"relative_ac_brake_current"`
	// Frame 13 - ID:1814
	DigitalIO int `json:"digital_io"`
	// Frame 14 - ID:2070
	MaxACCurrent int `json:"max_ac_current"`
	// Frame 15 - ID:2326
	MaxBrakeACCurrent int `json:"max_brake_ac_current"`
	// Frame 16 - ID:2582
	MaxDCCurrent int `json:"max_dc_current"`
	// Frame 17 - ID:2838
	MaxBrakeDCCurrent int `json:"max_brake_dc_current"`
	// Frame 18 - ID:3094
	DriveEnable int `json:"drive_enable"`
	// Frame 19 - ID:77825
	AMSState int `json:"ams_state"`
	IMDState int `json:"imd_state"`
	LEDOne   int `json:"led_one"`
	LEDTwo   int `json:"led_two"`
	LEDThree int `json:"led_three"`
	LEDFour  int `json:"led_four"`
	LEDFive  int `json:"led_five"`
	LEDSix   int `json:"led_six"`
}
