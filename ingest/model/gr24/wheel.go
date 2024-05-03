package gr24model

import "time"

type Wheel struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	ParentID  string    `json:"bcm_id" gorm:"index"`
	Millis    int       `json:"millis" gorm:"index"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	Location  string    `json:"location" gorm:"type:varchar(100)"`
	// Frame 1
	Suspension   float64 `json:"suspension"`
	WheelSpeed   float64 `json:"wheel_speed"`
	TirePressure float64 `json:"tire_pressure"`
	// Frame 2
	IMUAccelX float64 `json:"imu_accel_x"`
	IMUAccelY float64 `json:"imu_accel_y"`
	IMUAccelZ float64 `json:"imu_accel_z"`
	// Frame 3
	IMUGyroX float64 `json:"imu_gyro_x"`
	IMUGyroY float64 `json:"imu_gyro_y"`
	IMUGyroZ float64 `json:"imu_gyro_z"`
	// Frame 4
	BrakeTempOne   float64 `json:"brake_temp_one"`
	BrakeTempTwo   float64 `json:"brake_temp_two"`
	BrakeTempThree float64 `json:"brake_temp_three"`
	BrakeTempFour  float64 `json:"brake_temp_four"`
	BrakeTempFive  float64 `json:"brake_temp_five"`
	BrakeTempSix   float64 `json:"brake_temp_six"`
	BrakeTempSeven float64 `json:"brake_temp_seven"`
	BrakeTempEight float64 `json:"brake_temp_eight"`
	// Frame 5
	TireTempOne   float64 `json:"tire_temp_one"`
	TireTempTwo   float64 `json:"tire_temp_two"`
	TireTempThree float64 `json:"tire_temp_three"`
	TireTempFour  float64 `json:"tire_temp_four"`
	TireTempFive  float64 `json:"tire_temp_five"`
	TireTempSix   float64 `json:"tire_temp_six"`
	TireTempSeven float64 `json:"tire_temp_seven"`
	TireTempEight float64 `json:"tire_temp_eight"`
}

func (Wheel) TableName() string {
	return "gr24_wheel"
}
