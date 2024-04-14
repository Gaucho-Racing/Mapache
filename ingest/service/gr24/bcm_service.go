package gr24service

import (
	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
	"ingest/database"
	gr24model "ingest/model/gr24"
	"ingest/rabbitmq"
	"ingest/utils"
	"time"
)

var bcmCallbacks []func(bcm gr24model.BCM)

func bcmNotify(bcm gr24model.BCM) {
	for _, callback := range bcmCallbacks {
		callback(bcm)
	}
}

func BCMSubscribe(callback func(bcm gr24model.BCM)) {
	bcmCallbacks = append(bcmCallbacks, callback)
}

func InitializeBCMIngest() {
	callback := func(client mqtt.Client, msg mqtt.Message) {
		utils.SugarLogger.Infoln("[MQ] Received bcm frame")
		bcm := parseBCM(msg.Payload())
		if bcm.ID != "" {
			bcmNotify(bcm)
			err := CreateBCM(bcm)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}
	}
	rabbitmq.Client.Subscribe("gr24/bcm", 0, callback)
	utils.SugarLogger.Infoln("[MQ] Subscribed to topic: gr24/bcm")
}

func parseBCM(data []byte) gr24model.BCM {
	var bcm gr24model.BCM
	if len(data) != 184 {
		utils.SugarLogger.Warnln("Bcm data length is not 184 bytes! Received: ", len(data))
		return bcm
	}
	bcm.ID = uuid.NewString()
	bcm.Millis = int(time.Now().UnixMilli())
	// first 40 bytes are fr wheel
	frWheel := parseWheel(data[:40])
	frWheel.ParentID = bcm.ID
	frWheel.Location = "FR"
	bcm.Wheels = append(bcm.Wheels, frWheel)
	// next 40 bytes are fl wheel
	flWheel := parseWheel(data[40:80])
	flWheel.ParentID = bcm.ID
	flWheel.Location = "FL"
	bcm.Wheels = append(bcm.Wheels, flWheel)
	// next 40 bytes are rr wheel
	rrWheel := parseWheel(data[80:120])
	rrWheel.ParentID = bcm.ID
	rrWheel.Location = "RR"
	bcm.Wheels = append(bcm.Wheels, rrWheel)
	// next 40 bytes are rl wheel
	rlWheel := parseWheel(data[120:160])
	rlWheel.ParentID = bcm.ID
	rlWheel.Location = "RL"
	bcm.Wheels = append(bcm.Wheels, rlWheel)
	// bytes 161-162 are the IMU Accel X
	bcm.AccelerationX = float64(int(data[160])<<8 | int(data[161]))
	// bytes 163-164 are the IMU Accel Y
	bcm.AccelerationY = float64(int(data[162])<<8 | int(data[163]))
	// bytes 165-166 are the IMU Accel Z
	bcm.AccelerationZ = float64(int(data[164])<<8 | int(data[165]))
	// bytes 169-170 are the IMU Gyro X
	bcm.GyroX = float64(int(data[166])<<8 | int(data[167]))
	// bytes 171-172 are the IMU Gyro Y
	bcm.GyroY = float64(int(data[168])<<8 | int(data[169]))
	// bytes 173-174 are the IMU Gyro Z
	bcm.GyroZ = float64(int(data[170])<<8 | int(data[171]))
	// bytes 177-178 are the IMU Mag X
	bcm.MagX = float64(int(data[172])<<8 | int(data[173]))
	// bytes 179-180 are the IMU Mag Y
	bcm.MagY = float64(int(data[174])<<8 | int(data[175]))
	// bytes 181-182 are the IMU Mag Z
	bcm.MagZ = float64(int(data[176])<<8 | int(data[177]))
	bcm = scaleBCM(bcm)
	return bcm
}

func scaleBCM(bcm gr24model.BCM) gr24model.BCM {
	//pedal.BrakePressureFront = pedal.BrakePressureFront * service.GetScaleEnvVar("GR24", "Pedal", "BrakePressureFront")
	//pedal.BrakePressureRear = pedal.BrakePressureRear * service.GetScaleEnvVar("GR24", "Pedal", "BrakePressureRear")
	return bcm
}

func CreateBCM(bcm gr24model.BCM) error {
	if result := database.DB.Create(&bcm); result.Error != nil {
		return result.Error
	}
	for _, wheel := range bcm.Wheels {
		if err := CreateWheel(wheel); err != nil {
			return err
		}
	}
	return nil
}
