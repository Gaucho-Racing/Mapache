package service

import (
	"gr24/database"
	"gr24/model"
	"gr24/utils"
	"strings"
	"time"

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
	acu.CreatedAt = time.Now()
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
	acu.AccumulatorVoltage = acu.AccumulatorVoltage * 0.01
	acu.AccumulatorCurrent = acu.AccumulatorCurrent * 0.01
	acu.MaxCellTemp = acu.MaxCellTemp * 0.01
	acu.TSVoltage = acu.TSVoltage * 0.01
	acu.MaxBalResistorTemp = acu.MaxBalResistorTemp * 0.01
	acu.SDCVoltage = acu.SDCVoltage / 16
	acu.GLVVoltage = acu.GLVVoltage / 16
	acu.Fan1Speed = acu.Fan1Speed * 0.5
	acu.Fan2Speed = acu.Fan2Speed * 0.5
	acu.Fan3Speed = acu.Fan3Speed * 0.5
	acu.PumpSpeed = acu.PumpSpeed * 0.5
	acu.ACUTemp1 = acu.ACUTemp1 * 0.5
	acu.ACUTemp2 = acu.ACUTemp2 * 0.5
	acu.ACUTemp3 = acu.ACUTemp3 * 0.5
	acu.Cell0Voltage = acu.Cell0Voltage*0.01 + 2
	acu.Cell1Voltage = acu.Cell1Voltage*0.01 + 2
	acu.Cell2Voltage = acu.Cell2Voltage*0.01 + 2
	acu.Cell3Voltage = acu.Cell3Voltage*0.01 + 2
	acu.Cell4Voltage = acu.Cell4Voltage*0.01 + 2
	acu.Cell5Voltage = acu.Cell5Voltage*0.01 + 2
	acu.Cell6Voltage = acu.Cell6Voltage*0.01 + 2
	acu.Cell7Voltage = acu.Cell7Voltage*0.01 + 2
	acu.Cell8Voltage = acu.Cell8Voltage*0.01 + 2
	acu.Cell9Voltage = acu.Cell9Voltage*0.01 + 2
	acu.Cell10Voltage = acu.Cell10Voltage*0.01 + 2
	acu.Cell11Voltage = acu.Cell11Voltage*0.01 + 2
	acu.Cell12Voltage = acu.Cell12Voltage*0.01 + 2
	acu.Cell13Voltage = acu.Cell13Voltage*0.01 + 2
	acu.Cell14Voltage = acu.Cell14Voltage*0.01 + 2
	acu.Cell15Voltage = acu.Cell15Voltage*0.01 + 2
	acu.Cell16Voltage = acu.Cell16Voltage*0.01 + 2
	acu.Cell17Voltage = acu.Cell17Voltage*0.01 + 2
	acu.Cell18Voltage = acu.Cell18Voltage*0.01 + 2
	acu.Cell19Voltage = acu.Cell19Voltage*0.01 + 2
	acu.Cell20Voltage = acu.Cell20Voltage*0.01 + 2
	acu.Cell21Voltage = acu.Cell21Voltage*0.01 + 2
	acu.Cell22Voltage = acu.Cell22Voltage*0.01 + 2
	acu.Cell23Voltage = acu.Cell23Voltage*0.01 + 2
	acu.Cell24Voltage = acu.Cell24Voltage*0.01 + 2
	acu.Cell25Voltage = acu.Cell25Voltage*0.01 + 2
	acu.Cell26Voltage = acu.Cell26Voltage*0.01 + 2
	acu.Cell27Voltage = acu.Cell27Voltage*0.01 + 2
	acu.Cell28Voltage = acu.Cell28Voltage*0.01 + 2
	acu.Cell29Voltage = acu.Cell29Voltage*0.01 + 2
	acu.Cell30Voltage = acu.Cell30Voltage*0.01 + 2
	acu.Cell31Voltage = acu.Cell31Voltage*0.01 + 2
	acu.Cell32Voltage = acu.Cell32Voltage*0.01 + 2
	acu.Cell33Voltage = acu.Cell33Voltage*0.01 + 2
	acu.Cell34Voltage = acu.Cell34Voltage*0.01 + 2
	acu.Cell35Voltage = acu.Cell35Voltage*0.01 + 2
	acu.Cell36Voltage = acu.Cell36Voltage*0.01 + 2
	acu.Cell37Voltage = acu.Cell37Voltage*0.01 + 2
	acu.Cell38Voltage = acu.Cell38Voltage*0.01 + 2
	acu.Cell39Voltage = acu.Cell39Voltage*0.01 + 2
	acu.Cell40Voltage = acu.Cell40Voltage*0.01 + 2
	acu.Cell41Voltage = acu.Cell41Voltage*0.01 + 2
	acu.Cell42Voltage = acu.Cell42Voltage*0.01 + 2
	acu.Cell43Voltage = acu.Cell43Voltage*0.01 + 2
	acu.Cell44Voltage = acu.Cell44Voltage*0.01 + 2
	acu.Cell45Voltage = acu.Cell45Voltage*0.01 + 2
	acu.Cell46Voltage = acu.Cell46Voltage*0.01 + 2
	acu.Cell47Voltage = acu.Cell47Voltage*0.01 + 2
	acu.Cell48Voltage = acu.Cell48Voltage*0.01 + 2
	acu.Cell49Voltage = acu.Cell49Voltage*0.01 + 2
	acu.Cell50Voltage = acu.Cell50Voltage*0.01 + 2
	acu.Cell51Voltage = acu.Cell51Voltage*0.01 + 2
	acu.Cell52Voltage = acu.Cell52Voltage*0.01 + 2
	acu.Cell53Voltage = acu.Cell53Voltage*0.01 + 2
	acu.Cell54Voltage = acu.Cell54Voltage*0.01 + 2
	acu.Cell55Voltage = acu.Cell55Voltage*0.01 + 2
	acu.Cell56Voltage = acu.Cell56Voltage*0.01 + 2
	acu.Cell57Voltage = acu.Cell57Voltage*0.01 + 2
	acu.Cell58Voltage = acu.Cell58Voltage*0.01 + 2
	acu.Cell59Voltage = acu.Cell59Voltage*0.01 + 2
	acu.Cell60Voltage = acu.Cell60Voltage*0.01 + 2
	acu.Cell61Voltage = acu.Cell61Voltage*0.01 + 2
	acu.Cell62Voltage = acu.Cell62Voltage*0.01 + 2
	acu.Cell63Voltage = acu.Cell63Voltage*0.01 + 2
	acu.Cell64Voltage = acu.Cell64Voltage*0.01 + 2
	acu.Cell65Voltage = acu.Cell65Voltage*0.01 + 2
	acu.Cell66Voltage = acu.Cell66Voltage*0.01 + 2
	acu.Cell67Voltage = acu.Cell67Voltage*0.01 + 2
	acu.Cell68Voltage = acu.Cell68Voltage*0.01 + 2
	acu.Cell69Voltage = acu.Cell69Voltage*0.01 + 2
	acu.Cell70Voltage = acu.Cell70Voltage*0.01 + 2
	acu.Cell71Voltage = acu.Cell71Voltage*0.01 + 2
	acu.Cell72Voltage = acu.Cell72Voltage*0.01 + 2
	acu.Cell73Voltage = acu.Cell73Voltage*0.01 + 2
	acu.Cell74Voltage = acu.Cell74Voltage*0.01 + 2
	acu.Cell75Voltage = acu.Cell75Voltage*0.01 + 2
	acu.Cell76Voltage = acu.Cell76Voltage*0.01 + 2
	acu.Cell77Voltage = acu.Cell77Voltage*0.01 + 2
	acu.Cell78Voltage = acu.Cell78Voltage*0.01 + 2
	acu.Cell79Voltage = acu.Cell79Voltage*0.01 + 2
	acu.Cell80Voltage = acu.Cell80Voltage*0.01 + 2
	acu.Cell81Voltage = acu.Cell81Voltage*0.01 + 2
	acu.Cell82Voltage = acu.Cell82Voltage*0.01 + 2
	acu.Cell83Voltage = acu.Cell83Voltage*0.01 + 2
	acu.Cell84Voltage = acu.Cell84Voltage*0.01 + 2
	acu.Cell85Voltage = acu.Cell85Voltage*0.01 + 2
	acu.Cell86Voltage = acu.Cell86Voltage*0.01 + 2
	acu.Cell87Voltage = acu.Cell87Voltage*0.01 + 2
	acu.Cell88Voltage = acu.Cell88Voltage*0.01 + 2
	acu.Cell89Voltage = acu.Cell89Voltage*0.01 + 2
	acu.Cell90Voltage = acu.Cell90Voltage*0.01 + 2
	acu.Cell91Voltage = acu.Cell91Voltage*0.01 + 2
	acu.Cell92Voltage = acu.Cell92Voltage*0.01 + 2
	acu.Cell93Voltage = acu.Cell93Voltage*0.01 + 2
	acu.Cell94Voltage = acu.Cell94Voltage*0.01 + 2
	acu.Cell95Voltage = acu.Cell95Voltage*0.01 + 2
	acu.Cell96Voltage = acu.Cell96Voltage*0.01 + 2
	acu.Cell97Voltage = acu.Cell97Voltage*0.01 + 2
	acu.Cell98Voltage = acu.Cell98Voltage*0.01 + 2
	acu.Cell99Voltage = acu.Cell99Voltage*0.01 + 2
	acu.Cell100Voltage = acu.Cell100Voltage*0.01 + 2
	acu.Cell101Voltage = acu.Cell101Voltage*0.01 + 2
	acu.Cell102Voltage = acu.Cell102Voltage*0.01 + 2
	acu.Cell103Voltage = acu.Cell103Voltage*0.01 + 2
	acu.Cell104Voltage = acu.Cell104Voltage*0.01 + 2
	acu.Cell105Voltage = acu.Cell105Voltage*0.01 + 2
	acu.Cell106Voltage = acu.Cell106Voltage*0.01 + 2
	acu.Cell107Voltage = acu.Cell107Voltage*0.01 + 2
	acu.Cell108Voltage = acu.Cell108Voltage*0.01 + 2
	acu.Cell109Voltage = acu.Cell109Voltage*0.01 + 2
	acu.Cell110Voltage = acu.Cell110Voltage*0.01 + 2
	acu.Cell111Voltage = acu.Cell111Voltage*0.01 + 2
	acu.Cell112Voltage = acu.Cell112Voltage*0.01 + 2
	acu.Cell113Voltage = acu.Cell113Voltage*0.01 + 2
	acu.Cell114Voltage = acu.Cell114Voltage*0.01 + 2
	acu.Cell115Voltage = acu.Cell115Voltage*0.01 + 2
	acu.Cell116Voltage = acu.Cell116Voltage*0.01 + 2
	acu.Cell117Voltage = acu.Cell117Voltage*0.01 + 2
	acu.Cell118Voltage = acu.Cell118Voltage*0.01 + 2
	acu.Cell119Voltage = acu.Cell119Voltage*0.01 + 2
	acu.Cell120Voltage = acu.Cell120Voltage*0.01 + 2
	acu.Cell121Voltage = acu.Cell121Voltage*0.01 + 2
	acu.Cell122Voltage = acu.Cell122Voltage*0.01 + 2
	acu.Cell123Voltage = acu.Cell123Voltage*0.01 + 2
	acu.Cell124Voltage = acu.Cell124Voltage*0.01 + 2
	acu.Cell125Voltage = acu.Cell125Voltage*0.01 + 2
	acu.Cell126Voltage = acu.Cell126Voltage*0.01 + 2
	acu.Cell127Voltage = acu.Cell127Voltage*0.01 + 2
	acu.Cell0Temp = acu.Cell0Temp*0.25 + 10
	acu.Cell1Temp = acu.Cell1Temp*0.25 + 10
	acu.Cell2Temp = acu.Cell2Temp*0.25 + 10
	acu.Cell3Temp = acu.Cell3Temp*0.25 + 10
	acu.Cell4Temp = acu.Cell4Temp*0.25 + 10
	acu.Cell5Temp = acu.Cell5Temp*0.25 + 10
	acu.Cell6Temp = acu.Cell6Temp*0.25 + 10
	acu.Cell7Temp = acu.Cell7Temp*0.25 + 10
	acu.Cell8Temp = acu.Cell8Temp*0.25 + 10
	acu.Cell9Temp = acu.Cell9Temp*0.25 + 10
	acu.Cell10Temp = acu.Cell10Temp*0.25 + 10
	acu.Cell11Temp = acu.Cell11Temp*0.25 + 10
	acu.Cell12Temp = acu.Cell12Temp*0.25 + 10
	acu.Cell13Temp = acu.Cell13Temp*0.25 + 10
	acu.Cell14Temp = acu.Cell14Temp*0.25 + 10
	acu.Cell15Temp = acu.Cell15Temp*0.25 + 10
	acu.Cell16Temp = acu.Cell16Temp*0.25 + 10
	acu.Cell17Temp = acu.Cell17Temp*0.25 + 10
	acu.Cell18Temp = acu.Cell18Temp*0.25 + 10
	acu.Cell19Temp = acu.Cell19Temp*0.25 + 10
	acu.Cell20Temp = acu.Cell20Temp*0.25 + 10
	acu.Cell21Temp = acu.Cell21Temp*0.25 + 10
	acu.Cell22Temp = acu.Cell22Temp*0.25 + 10
	acu.Cell23Temp = acu.Cell23Temp*0.25 + 10
	acu.Cell24Temp = acu.Cell24Temp*0.25 + 10
	acu.Cell25Temp = acu.Cell25Temp*0.25 + 10
	acu.Cell26Temp = acu.Cell26Temp*0.25 + 10
	acu.Cell27Temp = acu.Cell27Temp*0.25 + 10
	acu.Cell28Temp = acu.Cell28Temp*0.25 + 10
	acu.Cell29Temp = acu.Cell29Temp*0.25 + 10
	acu.Cell30Temp = acu.Cell30Temp*0.25 + 10
	acu.Cell31Temp = acu.Cell31Temp*0.25 + 10
	acu.Cell32Temp = acu.Cell32Temp*0.25 + 10
	acu.Cell33Temp = acu.Cell33Temp*0.25 + 10
	acu.Cell34Temp = acu.Cell34Temp*0.25 + 10
	acu.Cell35Temp = acu.Cell35Temp*0.25 + 10
	acu.Cell36Temp = acu.Cell36Temp*0.25 + 10
	acu.Cell37Temp = acu.Cell37Temp*0.25 + 10
	acu.Cell38Temp = acu.Cell38Temp*0.25 + 10
	acu.Cell39Temp = acu.Cell39Temp*0.25 + 10
	acu.Cell40Temp = acu.Cell40Temp*0.25 + 10
	acu.Cell41Temp = acu.Cell41Temp*0.25 + 10
	acu.Cell42Temp = acu.Cell42Temp*0.25 + 10
	acu.Cell43Temp = acu.Cell43Temp*0.25 + 10
	acu.Cell44Temp = acu.Cell44Temp*0.25 + 10
	acu.Cell45Temp = acu.Cell45Temp*0.25 + 10
	acu.Cell46Temp = acu.Cell46Temp*0.25 + 10
	acu.Cell47Temp = acu.Cell47Temp*0.25 + 10
	acu.Cell48Temp = acu.Cell48Temp*0.25 + 10
	acu.Cell49Temp = acu.Cell49Temp*0.25 + 10
	acu.Cell50Temp = acu.Cell50Temp*0.25 + 10
	acu.Cell51Temp = acu.Cell51Temp*0.25 + 10
	acu.Cell52Temp = acu.Cell52Temp*0.25 + 10
	acu.Cell53Temp = acu.Cell53Temp*0.25 + 10
	acu.Cell54Temp = acu.Cell54Temp*0.25 + 10
	acu.Cell55Temp = acu.Cell55Temp*0.25 + 10
	acu.Cell56Temp = acu.Cell56Temp*0.25 + 10
	acu.Cell57Temp = acu.Cell57Temp*0.25 + 10
	acu.Cell58Temp = acu.Cell58Temp*0.25 + 10
	acu.Cell59Temp = acu.Cell59Temp*0.25 + 10
	acu.Cell60Temp = acu.Cell60Temp*0.25 + 10
	acu.Cell61Temp = acu.Cell61Temp*0.25 + 10
	acu.Cell62Temp = acu.Cell62Temp*0.25 + 10
	acu.Cell63Temp = acu.Cell63Temp*0.25 + 10
	acu.Cell64Temp = acu.Cell64Temp*0.25 + 10
	acu.Cell65Temp = acu.Cell65Temp*0.25 + 10
	acu.Cell66Temp = acu.Cell66Temp*0.25 + 10
	acu.Cell67Temp = acu.Cell67Temp*0.25 + 10
	acu.Cell68Temp = acu.Cell68Temp*0.25 + 10
	acu.Cell69Temp = acu.Cell69Temp*0.25 + 10
	acu.Cell70Temp = acu.Cell70Temp*0.25 + 10
	acu.Cell71Temp = acu.Cell71Temp*0.25 + 10
	acu.Cell72Temp = acu.Cell72Temp*0.25 + 10
	acu.Cell73Temp = acu.Cell73Temp*0.25 + 10
	acu.Cell74Temp = acu.Cell74Temp*0.25 + 10
	acu.Cell75Temp = acu.Cell75Temp*0.25 + 10
	acu.Cell76Temp = acu.Cell76Temp*0.25 + 10
	acu.Cell77Temp = acu.Cell77Temp*0.25 + 10
	acu.Cell78Temp = acu.Cell78Temp*0.25 + 10
	acu.Cell79Temp = acu.Cell79Temp*0.25 + 10
	acu.Cell80Temp = acu.Cell80Temp*0.25 + 10
	acu.Cell81Temp = acu.Cell81Temp*0.25 + 10
	acu.Cell82Temp = acu.Cell82Temp*0.25 + 10
	acu.Cell83Temp = acu.Cell83Temp*0.25 + 10
	acu.Cell84Temp = acu.Cell84Temp*0.25 + 10
	acu.Cell85Temp = acu.Cell85Temp*0.25 + 10
	acu.Cell86Temp = acu.Cell86Temp*0.25 + 10
	acu.Cell87Temp = acu.Cell87Temp*0.25 + 10
	acu.Cell88Temp = acu.Cell88Temp*0.25 + 10
	acu.Cell89Temp = acu.Cell89Temp*0.25 + 10
	acu.Cell90Temp = acu.Cell90Temp*0.25 + 10
	acu.Cell91Temp = acu.Cell91Temp*0.25 + 10
	acu.Cell92Temp = acu.Cell92Temp*0.25 + 10
	acu.Cell93Temp = acu.Cell93Temp*0.25 + 10
	acu.Cell94Temp = acu.Cell94Temp*0.25 + 10
	acu.Cell95Temp = acu.Cell95Temp*0.25 + 10
	acu.Cell96Temp = acu.Cell96Temp*0.25 + 10
	acu.Cell97Temp = acu.Cell97Temp*0.25 + 10
	acu.Cell98Temp = acu.Cell98Temp*0.25 + 10
	acu.Cell99Temp = acu.Cell99Temp*0.25 + 10
	acu.Cell100Temp = acu.Cell100Temp*0.25 + 10
	acu.Cell101Temp = acu.Cell101Temp*0.25 + 10
	acu.Cell102Temp = acu.Cell102Temp*0.25 + 10
	acu.Cell103Temp = acu.Cell103Temp*0.25 + 10
	acu.Cell104Temp = acu.Cell104Temp*0.25 + 10
	acu.Cell105Temp = acu.Cell105Temp*0.25 + 10
	acu.Cell106Temp = acu.Cell106Temp*0.25 + 10
	acu.Cell107Temp = acu.Cell107Temp*0.25 + 10
	acu.Cell108Temp = acu.Cell108Temp*0.25 + 10
	acu.Cell109Temp = acu.Cell109Temp*0.25 + 10
	acu.Cell110Temp = acu.Cell110Temp*0.25 + 10
	acu.Cell111Temp = acu.Cell111Temp*0.25 + 10
	acu.Cell112Temp = acu.Cell112Temp*0.25 + 10
	acu.Cell113Temp = acu.Cell113Temp*0.25 + 10
	acu.Cell114Temp = acu.Cell114Temp*0.25 + 10
	acu.Cell115Temp = acu.Cell115Temp*0.25 + 10
	acu.Cell116Temp = acu.Cell116Temp*0.25 + 10
	acu.Cell117Temp = acu.Cell117Temp*0.25 + 10
	acu.Cell118Temp = acu.Cell118Temp*0.25 + 10
	acu.Cell119Temp = acu.Cell119Temp*0.25 + 10
	acu.Cell120Temp = acu.Cell120Temp*0.25 + 10
	acu.Cell121Temp = acu.Cell121Temp*0.25 + 10
	acu.Cell122Temp = acu.Cell122Temp*0.25 + 10
	acu.Cell123Temp = acu.Cell123Temp*0.25 + 10
	acu.Cell124Temp = acu.Cell124Temp*0.25 + 10
	acu.Cell125Temp = acu.Cell125Temp*0.25 + 10
	acu.Cell126Temp = acu.Cell126Temp*0.25 + 10
	acu.Cell127Temp = acu.Cell127Temp*0.25 + 10
	return acu
}

func CreateACU(acu model.ACU) error {
	if result := database.DB.Create(&acu); result.Error != nil {
		return result.Error
	}
	return nil
}
