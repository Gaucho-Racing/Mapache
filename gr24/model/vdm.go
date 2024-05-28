package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type VDM struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VehicleID string    `json:"vehicle_id"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`

	Mode         int     `json:"mode"`
	State        int     `json:"state"`
	RevLimit     float64 `json:"rev_limit"`
	TcmStatus    int     `json:"tcm_status"`
	CanStatus    int     `json:"can_status"`
	SystemStatus int     `json:"system_status"`
	MaxPower     float64 `json:"maxpower"`
	RawState     int     `json:"rawstate"`

	// System Health 1
	SystemHealth1 int  `json:"system_health1"`
	IsAmsFault    bool `json:"is_ams_fault"`
	IsImdFault    bool `json:"is_imd_fault"`
	IsBspdFault   bool `json:"is_bspd_fault"`
	IsSdcOpened   bool `json:"is_sdc_opened"`

	// CA
	CA                  int  `json:"ca"`
	MotorTempWarning    bool `json:"motor_temp_warning"`
	MotorTempLimit      bool `json:"motor_temp_limit"`
	MotorTempCritical   bool `json:"motor_temp_critical"`
	BatteryTempWarning  bool `json:"battery_temp_warning"`
	BatteryTempLimit    bool `json:"battery_temp_limit"`
	BatteryTempCritical bool `json:"battery_temp_critical"`
	RevLimitExceeded    bool `json:"rev_limit_exceeded"`

	// System Health 2
	SystemHealth2        int  `json:"system_health2"`
	InverterTempWarning  bool `json:"inverter_temp_warning"`
	InverterTempLimit    bool `json:"inverter_temp_limit"`
	InverterTempCritical bool `json:"inverter_temp_critical"`

	Speed      float64 `json:"speed"`
	BrakeF     float64 `json:"brakef"`
	BrakeR     float64 `json:"braker"`
	ErrorCode  int     `json:"error_code"`
	Duraton    int     `json:"duration"`
	TorqueMap  int     `json:"torque_map"`
	MaxCurrent int     `json:"max_current"`
	RegenLevel int     `json:"regen_level"`
	Millis     int     `json:"millis" gorm:"index"`
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
		// Row 2-3
		mapache.NewField("a waste", 16, mapache.Unsigned, mapache.BigEndian),
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
