package gr24service

import (
	"github.com/google/uuid"
	"ingest/database"
	gr24model "ingest/model/gr24"
	"ingest/utils"
	"time"
)

func parseWheel(data []byte) gr24model.Wheel {
	var wheel gr24model.Wheel
	if len(data) != 40 {
		utils.SugarLogger.Warnln("Wheel data length is not 40 bytes! Received: ", len(data))
		return wheel
	}
	wheel.ID = uuid.NewString()
	wheel.Millis = int(time.Now().UnixMilli())
	// first byte is the suspension
	wheel.Suspension = float64(data[0])
	// next 2 bytes are the wheel speed
	wheel.WheelSpeed = float64(int16(data[1])<<8 | int16(data[2]))
	// next 1 bytes are the tire pressure
	wheel.TirePressure = float64(data[3])
	// bytes 9-10 are the IMU Accel X
	wheel.IMUAccelX = float64(int16(data[8])<<8 | int16(data[9]))
	// bytes 11-12 are the IMU Accel Y
	wheel.IMUAccelY = float64(int16(data[10])<<8 | int16(data[11]))
	// bytes 13-14 are the IMU Accel Z
	wheel.IMUAccelZ = float64(int16(data[12])<<8 | int16(data[13]))
	// bytes 17-18 are the IMU Gyro X
	wheel.IMUGyroX = float64(int16(data[16])<<8 | int16(data[17]))
	// bytes 19-20 are the IMU Gyro Y
	wheel.IMUGyroY = float64(int16(data[18])<<8 | int16(data[19]))
	// bytes 21-22 are the IMU Gyro Z
	wheel.IMUGyroZ = float64(int16(data[20])<<8 | int16(data[21]))
	// byte 25 is Brake Temp 1
	wheel.BrakeTempOne = float64(data[24])
	// byte 26 is Brake Temp 2
	wheel.BrakeTempTwo = float64(data[25])
	// byte 27 is Brake Temp 3
	wheel.BrakeTempThree = float64(data[26])
	// byte 28 is Brake Temp 4
	wheel.BrakeTempFour = float64(data[27])
	// byte 29 is Brake Temp 5
	wheel.BrakeTempFive = float64(data[28])
	// byte 30 is Brake Temp 6
	wheel.BrakeTempSix = float64(data[29])
	// byte 31 is Brake Temp 7
	wheel.BrakeTempSeven = float64(data[30])
	// byte 32 is Brake Temp 8
	wheel.BrakeTempEight = float64(data[31])
	// byte 33 is Tire Temp 1
	wheel.TireTempOne = float64(data[32])
	// byte 34 is Tire Temp 2
	wheel.TireTempTwo = float64(data[33])
	// byte 35 is Tire Temp 3
	wheel.TireTempThree = float64(data[34])
	// byte 36 is Tire Temp 4
	wheel.TireTempFour = float64(data[35])
	// byte 37 is Tire Temp 5
	wheel.TireTempFive = float64(data[36])
	// byte 38 is Tire Temp 6
	wheel.TireTempSix = float64(data[37])
	// byte 39 is Tire Temp 7
	wheel.TireTempSeven = float64(data[38])
	// byte 40 is Tire Temp 8
	wheel.TireTempEight = float64(data[39])
	wheel = scaleWheel(wheel)
	return wheel
}

func scaleWheel(wheel gr24model.Wheel) gr24model.Wheel {
	//pedal.BrakePressureFront = pedal.BrakePressureFront * service.GetScaleEnvVar("GR24", "Pedal", "BrakePressureFront")
	//pedal.BrakePressureRear = pedal.BrakePressureRear * service.GetScaleEnvVar("GR24", "Pedal", "BrakePressureRear")
	return wheel
}

func CreateWheel(wheel gr24model.Wheel) error {
	if result := database.DB.Create(&wheel); result.Error != nil {
		return result.Error
	}
	return nil
}

func GetAllWheels() []gr24model.Wheel {
	var wheels []gr24model.Wheel
	if result := database.DB.Find(&wheels); result.Error != nil {
		utils.SugarLogger.Errorln(result.Error)
	}
	return wheels
}

func GetAllWheelsForBCM(bcmID string) []gr24model.Wheel {
	var wheels []gr24model.Wheel
	if result := database.DB.Where("parent_id = ?", bcmID).Find(&wheels); result.Error != nil {
		utils.SugarLogger.Errorln(result.Error)
	}
	return wheels
}

func GetWheelByID(id string) gr24model.Wheel {
	var wheel gr24model.Wheel
	if result := database.DB.Where("id = ?", id).First(&wheel); result.Error != nil {
		utils.SugarLogger.Errorln(result.Error)
	}
	return wheel
}
