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
		mapache.NewField("VDM_Mode", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_State", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_RevLimit", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_TcmOk", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_CanOk", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_SysOk", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_MaxPower", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_RawState", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 1
		mapache.NewField("VDM_SystemHealth1", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_CA", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_SystemHealth2", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_a waste", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_Speed", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_BrakeF", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_BrakeR", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 2-3
		mapache.NewField("VDM_a waste", 16, mapache.Unsigned, mapache.BigEndian),
		// Row 4
		mapache.NewField("VDM_ErrorCode", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_Duration", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_TorqueMap", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_MaxCurrent", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_RegenLevel", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_a waste", 3, mapache.Unsigned, mapache.BigEndian),
		// Row 5
		mapache.NewField("VDM_a waste", 8, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("VDM_Millis", 4, mapache.Unsigned, mapache.BigEndian),
	}
}
