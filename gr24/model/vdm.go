package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type VDM struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VehicleID string    `json:"vehicle_id"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	//F0
	Mode     int `json:"mode"`
	State    int `json:"state"`
	RevLimit int `json:"revlimit"`
	TcmOk    int `json:"tcm_ok"`
	CanOk    int `json:"can_ok"`
	SysOk    int `json:"system_ok"`
	MaxPower int `json:"maxpower"`
	RawState int `json:"rawstate"`
	//F1
	//system health 1
	SystemHealth1 int  `json:"sys_health1"`
	AmsFault      bool `json:"ams_fault"`
	ImdFault      bool `json:"imd_fault"`
	BspdFault     bool `json:"bspd_fault"`
	SdcOpened     bool `json:"sdc_opened"`

	CA int `json:"ca"`
	//system health 2
	SystemnHealth2       int  `json:"sys_healths"`
	InverterTempWarning  bool `json:"inverter_temp_warning"`
	InverterTempLimit    bool `json:"inverter_temp_limit"`
	InverterTempCritical bool `json:"inverter_temp_critical"`

	Speed  int `json:"speed"`
	BrakeF int `json:"brakef"`
	BrakeR int `json:"braker"`
	//F3 no exist
	//F2
	NodeNum  int `json:"node_num"`
	PingTime int `json:"ping_time"`
	//F4
	ErrorCode  int `json:"error_code"`
	Duraton    int `json:"duration"`
	TorqueMap  int `json:"torque_map"`
	MaxCurrent int `json:"max_current"`
	RegenLevel int `json:"regen_level"`
	//F5 no exist
	Milliseconds int `json:"milliseconds" gorm:"index"`
}

func (VDM) TableName() string {
	return "gr24_vdm"
}

func NewVDMNode() mapache.Node {
	return []mapache.Field{
		// Row 0
		mapache.NewField("Mode", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("State", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("RevLimit", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("TcmOk", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("CanOk", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("SysOk", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("MaxPower", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("RawState", 1, mapache.Unsigned, mapache.BigEndian),

		// Row 1
		mapache.NewField("SystemHealth1", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("CA", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("SystemHealth2", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("a waste", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Speed", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("BrakeF", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("BrakeR", 1, mapache.Unsigned, mapache.BigEndian),

		// Row 2
		mapache.NewField("NodeNum", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("PingTime", 4, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("a waste", 3, mapache.Unsigned, mapache.BigEndian),

		// Row 3
		mapache.NewField("a waste", 8, mapache.Unsigned, mapache.BigEndian),

		// Row 4
		mapache.NewField("ErrorCode", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Duration", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("TorqueMap", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("MaxCurrent", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("RegenLevel", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("a waste", 3, mapache.Unsigned, mapache.BigEndian),

		// Row 5
		mapache.NewField("a waste", 8, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Millis", 4, mapache.Unsigned, mapache.BigEndian),
	}
}
