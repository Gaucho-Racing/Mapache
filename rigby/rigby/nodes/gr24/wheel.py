

# type Wheel struct {
# 	ID int `json:"id" gorm:"primaryKey"`
# 	// FR, FL, RR, RL
# 	Location  string    `json:"location" gorm:"index"`
# 	Millis    int       `json:"millis" gorm:"index"`
# 	CreatedAt time.Time `json:"time" gorm:"autoCreateTime;precision:6"`
# 	// Frame 1 - ID:69376,69384,69392,69400
# 	Suspension   int `json:"suspension"`
# 	WheelSpeed   int `json:"wheel_speed"`
# 	TirePressure int `json:"tire_pressure"`
# 	// Frame 2 - ID:69377,69385,69393,69401
# 	IMUAccelX int `json:"imu_accel_x"`
# 	IMUAccelY int `json:"imu_accel_y"`
# 	IMUAccelZ int `json:"imu_accel_z"`
# 	// Frame 3 - ID:69378,69386,69394,69402
# 	IMUGyroX int `json:"imu_gyro_x"`
# 	IMUGyroY int `json:"imu_gyro_y"`
# 	IMUGyroZ int `json:"imu_gyro_z"`
# 	// Frame 4 - ID:69379,69387,69395,69403
# 	BrakeTempOne   int `json:"brake_temp_one"`
# 	BrakeTempTwo   int `json:"brake_temp_two"`
# 	BrakeTempThree int `json:"brake_temp_three"`
# 	BrakeTempFour  int `json:"brake_temp_four"`
# 	BrakeTempFive  int `json:"brake_temp_five"`
# 	BrakeTempSix   int `json:"brake_temp_six"`
# 	BrakeTempSeven int `json:"brake_temp_seven"`
# 	BrakeTempEight int `json:"brake_temp_eight"`
# 	// Frame 5 - ID:69380,69388,69396,69404
# 	TireTempOne   int `json:"tire_temp_one"`
# 	TireTempTwo   int `json:"tire_temp_two"`
# 	TireTempThree int `json:"tire_temp_three"`
# 	TireTempFour  int `json:"tire_temp_four"`
# 	TireTempFive  int `json:"tire_temp_five"`
# 	TireTempSix   int `json:"tire_temp_six"`
# 	TireTempSeven int `json:"tire_temp_seven"`
# 	TireTempEight int `json:"tire_temp_eight"`
# }


class Wheel:
    suspension: int
    wheel_speed: int
    tire_pressure: int
    imu_accel_x: int
    imu_accel_y: int
    imu_accel_z: int
    imu_gyro_x: int
    imu_gyro_y: int
    imu_gyro_z: int
    brake_temp_one: int
    brake_temp_two: int
    brake_temp_three: int
    brake_temp_four: int
    brake_temp_five: int
    brake_temp_six: int
    brake_temp_seven: int
    brake_temp_eight: int
    tire_temp_one: int
    tire_temp_two: int
    tire_temp_three: int
    tire_temp_four: int
    tire_temp_five: int
    tire_temp_six: int
    tire_temp_seven: int
    tire_temp_eight: int

    @classmethod
    def 