package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"

	mqtt "github.com/eclipse/paho.mqtt.golang"
	"github.com/google/uuid"
)

var acuCallbacks []func(acu model.ACU)

// acuNotify calls all the functions registered to acuCallbacks
func acuNotify(acu model.ACU) {
	for _, callback := range acuCallbacks {
		callback(acu)
	}
}

// SubscribeACU registers a function to be called when a new acu is received
func SubscribeACU(callback func(acu model.ACU)) {
	acuCallbacks = append(acuCallbacks, callback)
}

// ACUIngestCallback is the callback function for handling incoming mqtt acu frames
var ACUIngestCallback = func(client mqtt.Client, msg mqtt.Message) {
	utils.SugarLogger.Infof("[MQ-%s] Received acu frame", msg.Topic())
	acu := ACUFromBytes(msg.Payload())
	if acu.ID != "" {
		acu.VehicleID = strings.Split(msg.Topic(), "/")[1]
		acu = scaleACU(acu)
		utils.SugarLogger.Infoln(acu)
		acuNotify(acu)
		go func() {
			err := CreateACU(acu)
			if err != nil {
				utils.SugarLogger.Errorln(err)
			}
		}()
	}
}

// ACUFromBytes converts a byte array to a acu struct
// If the conversion fails, an empty acu struct is returned
func ACUFromBytes(data []byte) model.ACU {
	var acu model.ACU
	acuFields := model.NewACUNode()
	err := acuFields.FillFromBytes(data)
	if err != nil {
		utils.SugarLogger.Errorln("Failed to parse acu:", err)
		return acu
	}
	acu.ID = uuid.New().String()
	// Row 1
	acu.AccumulatorVoltage = float64(acuFields[0].Value)
	acu.AccumulatorCurrent = float64(acuFields[1].Value)
	acu.MaxCellTemp = float64(acuFields[2].Value)
	acu.Errors = acuFields[3].Value
	acu.OverTempError = acuFields[3].CheckBit(0)
	acu.OverVoltageError = acuFields[3].CheckBit(1)
	acu.OverCurrentError = acuFields[3].CheckBit(2)
	acu.BmsError = acuFields[3].CheckBit(3)
	acu.UnderVoltageError = acuFields[3].CheckBit(4)
	acu.PrechargeError = acuFields[3].CheckBit(5)
	acu.TeensyError = acuFields[3].CheckBit(6)
	acu.UnderTempError = acuFields[3].CheckBit(7)
	acu.Warnings = acuFields[4].Value
	acu.OpenWireWarning = acuFields[4].CheckBit(0)
	acu.AdcWarning = acuFields[4].CheckBit(1)
	acu.CellWarning = acuFields[4].CheckBit(2)
	acu.HighCurrentWarning = acuFields[4].CheckBit(3)
	acu.LowChargeStateWarning = acuFields[4].CheckBit(4)
	acu.CellImbalanceWarning = acuFields[4].CheckBit(5)
	acu.HumidityWarning = acuFields[4].CheckBit(6)
	acu.HydrogenWarning = acuFields[4].CheckBit(7)
	// Row 2
	acu.TSVoltage = float64(acuFields[5].Value)
	acu.States = acuFields[6].Value
	acu.IsAIRPositive = acuFields[6].CheckBit(0)
	acu.IsAIRNegative = acuFields[6].CheckBit(1)
	acu.IsPrecharging = acuFields[6].CheckBit(2)
	acu.IsPrechargeDone = acuFields[6].CheckBit(3)
	acu.IsShutdown = acuFields[6].CheckBit(4)
	acu.MaxBalResistorTemp = float64(acuFields[7].Value)
	acu.SDCVoltage = float64(acuFields[8].Value)
	acu.GLVVoltage = float64(acuFields[9].Value)
	acu.StateOfCharge = float64(acuFields[10].Value)
	// Row 3
	acu.Fan1Speed = float64(acuFields[11].Value)
	acu.Fan2Speed = float64(acuFields[12].Value)
	acu.Fan3Speed = float64(acuFields[13].Value)
	acu.PumpSpeed = float64(acuFields[14].Value)
	acu.ACUTemp1 = float64(acuFields[15].Value)
	acu.ACUTemp2 = float64(acuFields[16].Value)
	acu.ACUTemp3 = float64(acuFields[17].Value)
	acu.CoolingErrors = acuFields[18].Value
	acu.WaterOvertempError = acuFields[18].CheckBit(0)
	acu.Fan1Error = acuFields[18].CheckBit(1)
	acu.Fan2Error = acuFields[18].CheckBit(2)
	acu.Fan3Error = acuFields[18].CheckBit(3)
	acu.Fan4Error = acuFields[18].CheckBit(4)
	acu.PumpError = acuFields[18].CheckBit(5)
	// Ignore next 64 bytes 😭
	// Row 12
	acu.Cell0Voltage = float64(acuFields[20].Value)
	acu.Cell1Voltage = float64(acuFields[21].Value)
	acu.Cell2Voltage = float64(acuFields[22].Value)
	acu.Cell3Voltage = float64(acuFields[23].Value)
	acu.Cell4Voltage = float64(acuFields[24].Value)
	acu.Cell5Voltage = float64(acuFields[25].Value)
	acu.Cell6Voltage = float64(acuFields[26].Value)
	acu.Cell7Voltage = float64(acuFields[27].Value)
	// Row 13
	acu.Cell8Voltage = float64(acuFields[28].Value)
	acu.Cell9Voltage = float64(acuFields[29].Value)
	acu.Cell10Voltage = float64(acuFields[30].Value)
	acu.Cell11Voltage = float64(acuFields[31].Value)
	acu.Cell12Voltage = float64(acuFields[32].Value)
	acu.Cell13Voltage = float64(acuFields[33].Value)
	acu.Cell14Voltage = float64(acuFields[34].Value)
	acu.Cell15Voltage = float64(acuFields[35].Value)
	// Row 14
	acu.Cell16Voltage = float64(acuFields[36].Value)
	acu.Cell17Voltage = float64(acuFields[37].Value)
	acu.Cell18Voltage = float64(acuFields[38].Value)
	acu.Cell19Voltage = float64(acuFields[39].Value)
	acu.Cell20Voltage = float64(acuFields[40].Value)
	acu.Cell21Voltage = float64(acuFields[41].Value)
	acu.Cell22Voltage = float64(acuFields[42].Value)
	acu.Cell23Voltage = float64(acuFields[43].Value)
	// Row 15
	acu.Cell24Voltage = float64(acuFields[44].Value)
	acu.Cell25Voltage = float64(acuFields[45].Value)
	acu.Cell26Voltage = float64(acuFields[46].Value)
	acu.Cell27Voltage = float64(acuFields[47].Value)
	acu.Cell28Voltage = float64(acuFields[48].Value)
	acu.Cell29Voltage = float64(acuFields[49].Value)
	acu.Cell30Voltage = float64(acuFields[50].Value)
	acu.Cell31Voltage = float64(acuFields[51].Value)
	// Row 16
	acu.Cell32Voltage = float64(acuFields[52].Value)
	acu.Cell33Voltage = float64(acuFields[53].Value)
	acu.Cell34Voltage = float64(acuFields[54].Value)
	acu.Cell35Voltage = float64(acuFields[55].Value)
	acu.Cell36Voltage = float64(acuFields[56].Value)
	acu.Cell37Voltage = float64(acuFields[57].Value)
	acu.Cell38Voltage = float64(acuFields[58].Value)
	acu.Cell39Voltage = float64(acuFields[59].Value)
	// Row 17
	acu.Cell40Voltage = float64(acuFields[60].Value)
	acu.Cell41Voltage = float64(acuFields[61].Value)
	acu.Cell42Voltage = float64(acuFields[62].Value)
	acu.Cell43Voltage = float64(acuFields[63].Value)
	acu.Cell44Voltage = float64(acuFields[64].Value)
	acu.Cell45Voltage = float64(acuFields[65].Value)
	acu.Cell46Voltage = float64(acuFields[66].Value)
	acu.Cell47Voltage = float64(acuFields[67].Value)
	// Row 18
	acu.Cell48Voltage = float64(acuFields[68].Value)
	acu.Cell49Voltage = float64(acuFields[69].Value)
	acu.Cell50Voltage = float64(acuFields[70].Value)
	acu.Cell51Voltage = float64(acuFields[71].Value)
	acu.Cell52Voltage = float64(acuFields[72].Value)
	acu.Cell53Voltage = float64(acuFields[73].Value)
	acu.Cell54Voltage = float64(acuFields[74].Value)
	acu.Cell55Voltage = float64(acuFields[75].Value)
	// Row 19
	acu.Cell56Voltage = float64(acuFields[76].Value)
	acu.Cell57Voltage = float64(acuFields[77].Value)
	acu.Cell58Voltage = float64(acuFields[78].Value)
	acu.Cell59Voltage = float64(acuFields[79].Value)
	acu.Cell60Voltage = float64(acuFields[80].Value)
	acu.Cell61Voltage = float64(acuFields[81].Value)
	acu.Cell62Voltage = float64(acuFields[82].Value)
	acu.Cell63Voltage = float64(acuFields[83].Value)
	// Row 20
	acu.Cell64Voltage = float64(acuFields[84].Value)
	acu.Cell65Voltage = float64(acuFields[85].Value)
	acu.Cell66Voltage = float64(acuFields[86].Value)
	acu.Cell67Voltage = float64(acuFields[87].Value)
	acu.Cell68Voltage = float64(acuFields[88].Value)
	acu.Cell69Voltage = float64(acuFields[89].Value)
	acu.Cell70Voltage = float64(acuFields[90].Value)
	acu.Cell71Voltage = float64(acuFields[91].Value)
	// Row 21
	acu.Cell72Voltage = float64(acuFields[92].Value)
	acu.Cell73Voltage = float64(acuFields[93].Value)
	acu.Cell74Voltage = float64(acuFields[94].Value)
	acu.Cell75Voltage = float64(acuFields[95].Value)
	acu.Cell76Voltage = float64(acuFields[96].Value)
	acu.Cell77Voltage = float64(acuFields[97].Value)
	acu.Cell78Voltage = float64(acuFields[98].Value)
	acu.Cell79Voltage = float64(acuFields[99].Value)
	// Row 22
	acu.Cell80Voltage = float64(acuFields[100].Value)
	acu.Cell81Voltage = float64(acuFields[101].Value)
	acu.Cell82Voltage = float64(acuFields[102].Value)
	acu.Cell83Voltage = float64(acuFields[103].Value)
	acu.Cell84Voltage = float64(acuFields[104].Value)
	acu.Cell85Voltage = float64(acuFields[105].Value)
	acu.Cell86Voltage = float64(acuFields[106].Value)
	acu.Cell87Voltage = float64(acuFields[107].Value)
	// Row 23
	acu.Cell88Voltage = float64(acuFields[108].Value)
	acu.Cell89Voltage = float64(acuFields[109].Value)
	acu.Cell90Voltage = float64(acuFields[110].Value)
	acu.Cell91Voltage = float64(acuFields[111].Value)
	acu.Cell92Voltage = float64(acuFields[112].Value)
	acu.Cell93Voltage = float64(acuFields[113].Value)
	acu.Cell94Voltage = float64(acuFields[114].Value)
	acu.Cell95Voltage = float64(acuFields[115].Value)
	// Row 24
	acu.Cell96Voltage = float64(acuFields[116].Value)
	acu.Cell97Voltage = float64(acuFields[117].Value)
	acu.Cell98Voltage = float64(acuFields[118].Value)
	acu.Cell99Voltage = float64(acuFields[119].Value)
	acu.Cell100Voltage = float64(acuFields[120].Value)
	acu.Cell101Voltage = float64(acuFields[121].Value)
	acu.Cell102Voltage = float64(acuFields[122].Value)
	acu.Cell103Voltage = float64(acuFields[123].Value)
	// Row 25
	acu.Cell104Voltage = float64(acuFields[124].Value)
	acu.Cell105Voltage = float64(acuFields[125].Value)
	acu.Cell106Voltage = float64(acuFields[126].Value)
	acu.Cell107Voltage = float64(acuFields[127].Value)
	acu.Cell108Voltage = float64(acuFields[128].Value)
	acu.Cell109Voltage = float64(acuFields[129].Value)
	acu.Cell110Voltage = float64(acuFields[130].Value)
	acu.Cell111Voltage = float64(acuFields[131].Value)
	// Row 26
	acu.Cell112Voltage = float64(acuFields[132].Value)
	acu.Cell113Voltage = float64(acuFields[133].Value)
	acu.Cell114Voltage = float64(acuFields[134].Value)
	acu.Cell115Voltage = float64(acuFields[135].Value)
	acu.Cell116Voltage = float64(acuFields[136].Value)
	acu.Cell117Voltage = float64(acuFields[137].Value)
	acu.Cell118Voltage = float64(acuFields[138].Value)
	acu.Cell119Voltage = float64(acuFields[139].Value)
	// Row 27
	acu.Cell120Voltage = float64(acuFields[140].Value)
	acu.Cell121Voltage = float64(acuFields[141].Value)
	acu.Cell122Voltage = float64(acuFields[142].Value)
	acu.Cell123Voltage = float64(acuFields[143].Value)
	acu.Cell124Voltage = float64(acuFields[144].Value)
	acu.Cell125Voltage = float64(acuFields[145].Value)
	acu.Cell126Voltage = float64(acuFields[146].Value)
	acu.Cell127Voltage = float64(acuFields[147].Value)
	// Ingore next 16 bytes 😭
	// Row 30
	acu.Cell0Temp = float64(acuFields[149].Value)
	acu.Cell1Temp = float64(acuFields[150].Value)
	acu.Cell2Temp = float64(acuFields[151].Value)
	acu.Cell3Temp = float64(acuFields[152].Value)
	acu.Cell4Temp = float64(acuFields[153].Value)
	acu.Cell5Temp = float64(acuFields[154].Value)
	acu.Cell6Temp = float64(acuFields[155].Value)
	acu.Cell7Temp = float64(acuFields[156].Value)
	// Row 31
	acu.Cell8Temp = float64(acuFields[157].Value)
	acu.Cell9Temp = float64(acuFields[158].Value)
	acu.Cell10Temp = float64(acuFields[159].Value)
	acu.Cell11Temp = float64(acuFields[160].Value)
	acu.Cell12Temp = float64(acuFields[161].Value)
	acu.Cell13Temp = float64(acuFields[162].Value)
	acu.Cell14Temp = float64(acuFields[163].Value)
	acu.Cell15Temp = float64(acuFields[164].Value)
	// Row 32
	acu.Cell16Temp = float64(acuFields[165].Value)
	acu.Cell17Temp = float64(acuFields[166].Value)
	acu.Cell18Temp = float64(acuFields[167].Value)
	acu.Cell19Temp = float64(acuFields[168].Value)
	acu.Cell20Temp = float64(acuFields[169].Value)
	acu.Cell21Temp = float64(acuFields[170].Value)
	acu.Cell22Temp = float64(acuFields[171].Value)
	acu.Cell23Temp = float64(acuFields[172].Value)
	// Row 33
	acu.Cell24Temp = float64(acuFields[173].Value)
	acu.Cell25Temp = float64(acuFields[174].Value)
	acu.Cell26Temp = float64(acuFields[175].Value)
	acu.Cell27Temp = float64(acuFields[176].Value)
	acu.Cell28Temp = float64(acuFields[177].Value)
	acu.Cell29Temp = float64(acuFields[178].Value)
	acu.Cell30Temp = float64(acuFields[179].Value)
	acu.Cell31Temp = float64(acuFields[180].Value)
	// Row 34
	acu.Cell32Temp = float64(acuFields[181].Value)
	acu.Cell33Temp = float64(acuFields[182].Value)
	acu.Cell34Temp = float64(acuFields[183].Value)
	acu.Cell35Temp = float64(acuFields[184].Value)
	acu.Cell36Temp = float64(acuFields[185].Value)
	acu.Cell37Temp = float64(acuFields[186].Value)
	acu.Cell38Temp = float64(acuFields[187].Value)
	acu.Cell39Temp = float64(acuFields[188].Value)
	// Row 35
	acu.Cell40Temp = float64(acuFields[189].Value)
	acu.Cell41Temp = float64(acuFields[190].Value)
	acu.Cell42Temp = float64(acuFields[191].Value)
	acu.Cell43Temp = float64(acuFields[192].Value)
	acu.Cell44Temp = float64(acuFields[193].Value)
	acu.Cell45Temp = float64(acuFields[194].Value)
	acu.Cell46Temp = float64(acuFields[195].Value)
	acu.Cell47Temp = float64(acuFields[196].Value)
	// Row 36
	acu.Cell48Temp = float64(acuFields[197].Value)
	acu.Cell49Temp = float64(acuFields[198].Value)
	acu.Cell50Temp = float64(acuFields[199].Value)
	acu.Cell51Temp = float64(acuFields[200].Value)
	acu.Cell52Temp = float64(acuFields[201].Value)
	acu.Cell53Temp = float64(acuFields[202].Value)
	acu.Cell54Temp = float64(acuFields[203].Value)
	acu.Cell55Temp = float64(acuFields[204].Value)
	// Row 37
	acu.Cell56Temp = float64(acuFields[205].Value)
	acu.Cell57Temp = float64(acuFields[206].Value)
	acu.Cell58Temp = float64(acuFields[207].Value)
	acu.Cell59Temp = float64(acuFields[208].Value)
	acu.Cell60Temp = float64(acuFields[209].Value)
	acu.Cell61Temp = float64(acuFields[210].Value)
	acu.Cell62Temp = float64(acuFields[211].Value)
	acu.Cell63Temp = float64(acuFields[212].Value)
	// Row 38
	acu.Cell64Temp = float64(acuFields[213].Value)
	acu.Cell65Temp = float64(acuFields[214].Value)
	acu.Cell66Temp = float64(acuFields[215].Value)
	acu.Cell67Temp = float64(acuFields[216].Value)
	acu.Cell68Temp = float64(acuFields[217].Value)
	acu.Cell69Temp = float64(acuFields[218].Value)
	acu.Cell70Temp = float64(acuFields[219].Value)
	acu.Cell71Temp = float64(acuFields[220].Value)
	// Row 39
	acu.Cell72Temp = float64(acuFields[221].Value)
	acu.Cell73Temp = float64(acuFields[222].Value)
	acu.Cell74Temp = float64(acuFields[223].Value)
	acu.Cell75Temp = float64(acuFields[224].Value)
	acu.Cell76Temp = float64(acuFields[225].Value)
	acu.Cell77Temp = float64(acuFields[226].Value)
	acu.Cell78Temp = float64(acuFields[227].Value)
	acu.Cell79Temp = float64(acuFields[228].Value)
	// Row 40
	acu.Cell80Temp = float64(acuFields[229].Value)
	acu.Cell81Temp = float64(acuFields[230].Value)
	acu.Cell82Temp = float64(acuFields[231].Value)
	acu.Cell83Temp = float64(acuFields[232].Value)
	acu.Cell84Temp = float64(acuFields[233].Value)
	acu.Cell85Temp = float64(acuFields[234].Value)
	acu.Cell86Temp = float64(acuFields[235].Value)
	acu.Cell87Temp = float64(acuFields[236].Value)
	// Row 41
	acu.Cell88Temp = float64(acuFields[237].Value)
	acu.Cell89Temp = float64(acuFields[238].Value)
	acu.Cell90Temp = float64(acuFields[239].Value)
	acu.Cell91Temp = float64(acuFields[240].Value)
	acu.Cell92Temp = float64(acuFields[241].Value)
	acu.Cell93Temp = float64(acuFields[242].Value)
	acu.Cell94Temp = float64(acuFields[243].Value)
	acu.Cell95Temp = float64(acuFields[244].Value)
	// Row 42
	acu.Cell96Temp = float64(acuFields[245].Value)
	acu.Cell97Temp = float64(acuFields[246].Value)
	acu.Cell98Temp = float64(acuFields[247].Value)
	acu.Cell99Temp = float64(acuFields[248].Value)
	acu.Cell100Temp = float64(acuFields[249].Value)
	acu.Cell101Temp = float64(acuFields[250].Value)
	acu.Cell102Temp = float64(acuFields[251].Value)
	acu.Cell103Temp = float64(acuFields[252].Value)
	// Row 43
	acu.Cell104Temp = float64(acuFields[253].Value)
	acu.Cell105Temp = float64(acuFields[254].Value)
	acu.Cell106Temp = float64(acuFields[255].Value)
	acu.Cell107Temp = float64(acuFields[256].Value)
	acu.Cell108Temp = float64(acuFields[257].Value)
	acu.Cell109Temp = float64(acuFields[258].Value)
	acu.Cell110Temp = float64(acuFields[259].Value)
	acu.Cell111Temp = float64(acuFields[260].Value)
	// Row 44
	acu.Cell112Temp = float64(acuFields[261].Value)
	acu.Cell113Temp = float64(acuFields[262].Value)
	acu.Cell114Temp = float64(acuFields[263].Value)
	acu.Cell115Temp = float64(acuFields[264].Value)
	acu.Cell116Temp = float64(acuFields[265].Value)
	acu.Cell117Temp = float64(acuFields[266].Value)
	acu.Cell118Temp = float64(acuFields[267].Value)
	acu.Cell119Temp = float64(acuFields[268].Value)
	// Row 45
	acu.Cell120Temp = float64(acuFields[269].Value)
	acu.Cell121Temp = float64(acuFields[270].Value)
	acu.Cell122Temp = float64(acuFields[271].Value)
	acu.Cell123Temp = float64(acuFields[272].Value)
	acu.Cell124Temp = float64(acuFields[273].Value)
	acu.Cell125Temp = float64(acuFields[274].Value)
	acu.Cell126Temp = float64(acuFields[275].Value)
	acu.Cell127Temp = float64(acuFields[276].Value)
	// Ignore next 40 bytes 😭
	// Row 51
	acu.Millis = acuFields[278].Value
	return acu
}

// scaleAcu scales the acu values
func scaleACU(acu model.ACU) model.ACU {
	// TODO: yea this shits gonna be a pain to write
	return acu
}

func CreateACU(acu model.ACU) error {
	if result := database.DB.Create(&acu); result.Error != nil {
		return result.Error
	}
	return nil
}
