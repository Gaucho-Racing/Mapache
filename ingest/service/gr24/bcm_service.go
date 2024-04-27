package gr24service

import (
	"ingest/database"
	gr24model "ingest/model/gr24"
	"ingest/rabbitmq"
	"ingest/utils"
	"time"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
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
	// next 2 bytes are accel x
	bcm.AccelerationX = float64(int16(data[160])<<8 | int16(data[161]))
	// next 2 bytes are accel y
	bcm.AccelerationY = float64(int16(data[162])<<8 | int16(data[163]))
	// next 2 bytes are accel z
	bcm.AccelerationZ = float64(int16(data[164])<<8 | int16(data[165]))
	// next 2 bytes are gyro x
	bcm.GyroX = float64(int16(data[168])<<8 | int16(data[169]))
	// next 2 bytes are gyro y
	bcm.GyroY = float64(int16(data[170])<<8 | int16(data[171]))
	// next 2 bytes are gyro z
	bcm.GyroZ = float64(int16(data[172])<<8 | int16(data[173]))
	// next 2 bytes are mag x
	bcm.MagX = float64(int16(data[176])<<8 | int16(data[177]))
	// next 2 bytes are mag y
	bcm.MagY = float64(int16(data[178])<<8 | int16(data[179]))
	// next 2 bytes are mag z
	bcm.MagZ = float64(int16(data[180])<<8 | int16(data[181]))
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

func GetAllBCMs() []gr24model.BCM {
	var bcms []gr24model.BCM
	if result := database.DB.Find(&bcms); result.Error != nil {
		utils.SugarLogger.Errorln(result.Error)
	}
	for i := range bcms {
		bcms[i].Wheels = GetAllWheelsForBCM(bcms[i].ID)
	}
	return bcms
}

func GetBCMByID(id string) gr24model.BCM {
	var bcm gr24model.BCM
	if result := database.DB.Where("id = ?", id).First(&bcm); result.Error != nil {
		utils.SugarLogger.Errorln(result.Error)
	}
	bcm.Wheels = GetAllWheelsForBCM(bcm.ID)
	return bcm
}
