package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type ACU struct {
	ID        string    `json:"id" gorm:"primaryKey"`
	VehicleID string    `json:"vehicle_id"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`

	AccumulatorVoltage float64 `json:"accumulator_voltage"`
	AccumulatorCurrent float64 `json:"accumulator_current"`
	MaxCellTemp        float64 `json:"max_cell_temp"`

	// Errors
	Errors            int  `json:"errors"`
	OverTempError     bool `json:"over_temp_error"`
	OverVoltageError  bool `json:"over_voltage_error"`
	OverCurrentError  bool `json:"over_current_error"`
	BmsError          bool `json:"bms_error"`
	UnderVoltageError bool `json:"under_voltage_error"`
	PrechargeError    bool `json:"precharge_error"`
	TeensyError       bool `json:"teensy_error"`
	UnderTempError    bool `json:"under_temp_error"`

	// Warnings
	Warnings              int  `json:"warnings"`
	OpenWireWarning       bool `json:"open_wire_warning"`
	AdcWarning            bool `json:"adc_warning"`
	CellWarning           bool `json:"cell_warning"`
	HighCurrentWarning    bool `json:"high_current_warning"`
	LowChargeStateWarning bool `json:"low_charge_state_warning"`
	CellImbalanceWarning  bool `json:"cell_imbalance_warning"`
	HumidityWarning       bool `json:"humidity_warning"`
	HydrogenWarning       bool `json:"hydrogen_warning"`

	TSVoltage float64 `json:"ts_voltage"`

	// States
	States          int  `json:"states"`
	IsAIRPositive   bool `json:"is_air_positive"`
	IsAIRNegative   bool `json:"is_air_negative"`
	IsPrecharging   bool `json:"is_precharging"`
	IsPrechargeDone bool `json:"is_precharge_done"`
	IsShutdown      bool `json:"is_shutdown"`

	MaxBalResistorTemp float64 `json:"max_bal_resistor_temp"`
	SDCVoltage         float64 `json:"sdc_voltage"`
	GLVVoltage         float64 `json:"glv_voltage"`
	StateOfCharge      float64 `json:"state_of_charge"`
	Fan1Speed          float64 `json:"fan1_speed"`
	Fan2Speed          float64 `json:"fan2_speed"`
	Fan3Speed          float64 `json:"fan3_speed"`
	PumpSpeed          float64 `json:"pump_speed"`
	ACUTemp1           float64 `json:"acu_temp1"`
	ACUTemp2           float64 `json:"acu_temp2"`
	ACUTemp3           float64 `json:"acu_temp3"`

	// CoolingErrors
	CoolingErrors      int  `json:"cooling_errors"`
	WaterOvertempError bool `json:"water_overtemp_error"`
	Fan1Error          bool `json:"fan1_error"`
	Fan2Error          bool `json:"fan2_error"`
	Fan3Error          bool `json:"fan3_error"`
	Fan4Error          bool `json:"fan4_error"`
	PumpError          bool `json:"pump_error"`

	// Cell Voltages
	Cell0Voltage   float64 `json:"cell0_voltage"`
	Cell1Voltage   float64 `json:"cell1_voltage"`
	Cell2Voltage   float64 `json:"cell2_voltage"`
	Cell3Voltage   float64 `json:"cell3_voltage"`
	Cell4Voltage   float64 `json:"cell4_voltage"`
	Cell5Voltage   float64 `json:"cell5_voltage"`
	Cell6Voltage   float64 `json:"cell6_voltage"`
	Cell7Voltage   float64 `json:"cell7_voltage"`
	Cell8Voltage   float64 `json:"cell8_voltage"`
	Cell9Voltage   float64 `json:"cell9_voltage"`
	Cell10Voltage  float64 `json:"cell10_voltage"`
	Cell11Voltage  float64 `json:"cell11_voltage"`
	Cell12Voltage  float64 `json:"cell12_voltage"`
	Cell13Voltage  float64 `json:"cell13_voltage"`
	Cell14Voltage  float64 `json:"cell14_voltage"`
	Cell15Voltage  float64 `json:"cell15_voltage"`
	Cell16Voltage  float64 `json:"cell16_voltage"`
	Cell17Voltage  float64 `json:"cell17_voltage"`
	Cell18Voltage  float64 `json:"cell18_voltage"`
	Cell19Voltage  float64 `json:"cell19_voltage"`
	Cell20Voltage  float64 `json:"cell20_voltage"`
	Cell21Voltage  float64 `json:"cell21_voltage"`
	Cell22Voltage  float64 `json:"cell22_voltage"`
	Cell23Voltage  float64 `json:"cell23_voltage"`
	Cell24Voltage  float64 `json:"cell24_voltage"`
	Cell25Voltage  float64 `json:"cell25_voltage"`
	Cell26Voltage  float64 `json:"cell26_voltage"`
	Cell27Voltage  float64 `json:"cell27_voltage"`
	Cell28Voltage  float64 `json:"cell28_voltage"`
	Cell29Voltage  float64 `json:"cell29_voltage"`
	Cell30Voltage  float64 `json:"cell30_voltage"`
	Cell31Voltage  float64 `json:"cell31_voltage"`
	Cell32Voltage  float64 `json:"cell32_voltage"`
	Cell33Voltage  float64 `json:"cell33_voltage"`
	Cell34Voltage  float64 `json:"cell34_voltage"`
	Cell35Voltage  float64 `json:"cell35_voltage"`
	Cell36Voltage  float64 `json:"cell36_voltage"`
	Cell37Voltage  float64 `json:"cell37_voltage"`
	Cell38Voltage  float64 `json:"cell38_voltage"`
	Cell39Voltage  float64 `json:"cell39_voltage"`
	Cell40Voltage  float64 `json:"cell40_voltage"`
	Cell41Voltage  float64 `json:"cell41_voltage"`
	Cell42Voltage  float64 `json:"cell42_voltage"`
	Cell43Voltage  float64 `json:"cell43_voltage"`
	Cell44Voltage  float64 `json:"cell44_voltage"`
	Cell45Voltage  float64 `json:"cell45_voltage"`
	Cell46Voltage  float64 `json:"cell46_voltage"`
	Cell47Voltage  float64 `json:"cell47_voltage"`
	Cell48Voltage  float64 `json:"cell48_voltage"`
	Cell49Voltage  float64 `json:"cell49_voltage"`
	Cell50Voltage  float64 `json:"cell50_voltage"`
	Cell51Voltage  float64 `json:"cell51_voltage"`
	Cell52Voltage  float64 `json:"cell52_voltage"`
	Cell53Voltage  float64 `json:"cell53_voltage"`
	Cell54Voltage  float64 `json:"cell54_voltage"`
	Cell55Voltage  float64 `json:"cell55_voltage"`
	Cell56Voltage  float64 `json:"cell56_voltage"`
	Cell57Voltage  float64 `json:"cell57_voltage"`
	Cell58Voltage  float64 `json:"cell58_voltage"`
	Cell59Voltage  float64 `json:"cell59_voltage"`
	Cell60Voltage  float64 `json:"cell60_voltage"`
	Cell61Voltage  float64 `json:"cell61_voltage"`
	Cell62Voltage  float64 `json:"cell62_voltage"`
	Cell63Voltage  float64 `json:"cell63_voltage"`
	Cell64Voltage  float64 `json:"cell64_voltage"`
	Cell65Voltage  float64 `json:"cell65_voltage"`
	Cell66Voltage  float64 `json:"cell66_voltage"`
	Cell67Voltage  float64 `json:"cell67_voltage"`
	Cell68Voltage  float64 `json:"cell68_voltage"`
	Cell69Voltage  float64 `json:"cell69_voltage"`
	Cell70Voltage  float64 `json:"cell70_voltage"`
	Cell71Voltage  float64 `json:"cell71_voltage"`
	Cell72Voltage  float64 `json:"cell72_voltage"`
	Cell73Voltage  float64 `json:"cell73_voltage"`
	Cell74Voltage  float64 `json:"cell74_voltage"`
	Cell75Voltage  float64 `json:"cell75_voltage"`
	Cell76Voltage  float64 `json:"cell76_voltage"`
	Cell77Voltage  float64 `json:"cell77_voltage"`
	Cell78Voltage  float64 `json:"cell78_voltage"`
	Cell79Voltage  float64 `json:"cell79_voltage"`
	Cell80Voltage  float64 `json:"cell80_voltage"`
	Cell81Voltage  float64 `json:"cell81_voltage"`
	Cell82Voltage  float64 `json:"cell82_voltage"`
	Cell83Voltage  float64 `json:"cell83_voltage"`
	Cell84Voltage  float64 `json:"cell84_voltage"`
	Cell85Voltage  float64 `json:"cell85_voltage"`
	Cell86Voltage  float64 `json:"cell86_voltage"`
	Cell87Voltage  float64 `json:"cell87_voltage"`
	Cell88Voltage  float64 `json:"cell88_voltage"`
	Cell89Voltage  float64 `json:"cell89_voltage"`
	Cell90Voltage  float64 `json:"cell90_voltage"`
	Cell91Voltage  float64 `json:"cell91_voltage"`
	Cell92Voltage  float64 `json:"cell92_voltage"`
	Cell93Voltage  float64 `json:"cell93_voltage"`
	Cell94Voltage  float64 `json:"cell94_voltage"`
	Cell95Voltage  float64 `json:"cell95_voltage"`
	Cell96Voltage  float64 `json:"cell96_voltage"`
	Cell97Voltage  float64 `json:"cell97_voltage"`
	Cell98Voltage  float64 `json:"cell98_voltage"`
	Cell99Voltage  float64 `json:"cell99_voltage"`
	Cell100Voltage float64 `json:"cell100_voltage"`
	Cell101Voltage float64 `json:"cell101_voltage"`
	Cell102Voltage float64 `json:"cell102_voltage"`
	Cell103Voltage float64 `json:"cell103_voltage"`
	Cell104Voltage float64 `json:"cell104_voltage"`
	Cell105Voltage float64 `json:"cell105_voltage"`
	Cell106Voltage float64 `json:"cell106_voltage"`
	Cell107Voltage float64 `json:"cell107_voltage"`
	Cell108Voltage float64 `json:"cell108_voltage"`
	Cell109Voltage float64 `json:"cell109_voltage"`
	Cell110Voltage float64 `json:"cell110_voltage"`
	Cell111Voltage float64 `json:"cell111_voltage"`
	Cell112Voltage float64 `json:"cell112_voltage"`
	Cell113Voltage float64 `json:"cell113_voltage"`
	Cell114Voltage float64 `json:"cell114_voltage"`
	Cell115Voltage float64 `json:"cell115_voltage"`
	Cell116Voltage float64 `json:"cell116_voltage"`
	Cell117Voltage float64 `json:"cell117_voltage"`
	Cell118Voltage float64 `json:"cell118_voltage"`
	Cell119Voltage float64 `json:"cell119_voltage"`
	Cell120Voltage float64 `json:"cell120_voltage"`
	Cell121Voltage float64 `json:"cell121_voltage"`
	Cell122Voltage float64 `json:"cell122_voltage"`
	Cell123Voltage float64 `json:"cell123_voltage"`
	Cell124Voltage float64 `json:"cell124_voltage"`
	Cell125Voltage float64 `json:"cell125_voltage"`
	Cell126Voltage float64 `json:"cell126_voltage"`
	Cell127Voltage float64 `json:"cell127_voltage"`

	// Cell Temps
	Cell0Temp   float64 `json:"cell0_temp"`
	Cell1Temp   float64 `json:"cell1_temp"`
	Cell2Temp   float64 `json:"cell2_temp"`
	Cell3Temp   float64 `json:"cell3_temp"`
	Cell4Temp   float64 `json:"cell4_temp"`
	Cell5Temp   float64 `json:"cell5_temp"`
	Cell6Temp   float64 `json:"cell6_temp"`
	Cell7Temp   float64 `json:"cell7_temp"`
	Cell8Temp   float64 `json:"cell8_temp"`
	Cell9Temp   float64 `json:"cell9_temp"`
	Cell10Temp  float64 `json:"cell10_temp"`
	Cell11Temp  float64 `json:"cell11_temp"`
	Cell12Temp  float64 `json:"cell12_temp"`
	Cell13Temp  float64 `json:"cell13_temp"`
	Cell14Temp  float64 `json:"cell14_temp"`
	Cell15Temp  float64 `json:"cell15_temp"`
	Cell16Temp  float64 `json:"cell16_temp"`
	Cell17Temp  float64 `json:"cell17_temp"`
	Cell18Temp  float64 `json:"cell18_temp"`
	Cell19Temp  float64 `json:"cell19_temp"`
	Cell20Temp  float64 `json:"cell20_temp"`
	Cell21Temp  float64 `json:"cell21_temp"`
	Cell22Temp  float64 `json:"cell22_temp"`
	Cell23Temp  float64 `json:"cell23_temp"`
	Cell24Temp  float64 `json:"cell24_temp"`
	Cell25Temp  float64 `json:"cell25_temp"`
	Cell26Temp  float64 `json:"cell26_temp"`
	Cell27Temp  float64 `json:"cell27_temp"`
	Cell28Temp  float64 `json:"cell28_temp"`
	Cell29Temp  float64 `json:"cell29_temp"`
	Cell30Temp  float64 `json:"cell30_temp"`
	Cell31Temp  float64 `json:"cell31_temp"`
	Cell32Temp  float64 `json:"cell32_temp"`
	Cell33Temp  float64 `json:"cell33_temp"`
	Cell34Temp  float64 `json:"cell34_temp"`
	Cell35Temp  float64 `json:"cell35_temp"`
	Cell36Temp  float64 `json:"cell36_temp"`
	Cell37Temp  float64 `json:"cell37_temp"`
	Cell38Temp  float64 `json:"cell38_temp"`
	Cell39Temp  float64 `json:"cell39_temp"`
	Cell40Temp  float64 `json:"cell40_temp"`
	Cell41Temp  float64 `json:"cell41_temp"`
	Cell42Temp  float64 `json:"cell42_temp"`
	Cell43Temp  float64 `json:"cell43_temp"`
	Cell44Temp  float64 `json:"cell44_temp"`
	Cell45Temp  float64 `json:"cell45_temp"`
	Cell46Temp  float64 `json:"cell46_temp"`
	Cell47Temp  float64 `json:"cell47_temp"`
	Cell48Temp  float64 `json:"cell48_temp"`
	Cell49Temp  float64 `json:"cell49_temp"`
	Cell50Temp  float64 `json:"cell50_temp"`
	Cell51Temp  float64 `json:"cell51_temp"`
	Cell52Temp  float64 `json:"cell52_temp"`
	Cell53Temp  float64 `json:"cell53_temp"`
	Cell54Temp  float64 `json:"cell54_temp"`
	Cell55Temp  float64 `json:"cell55_temp"`
	Cell56Temp  float64 `json:"cell56_temp"`
	Cell57Temp  float64 `json:"cell57_temp"`
	Cell58Temp  float64 `json:"cell58_temp"`
	Cell59Temp  float64 `json:"cell59_temp"`
	Cell60Temp  float64 `json:"cell60_temp"`
	Cell61Temp  float64 `json:"cell61_temp"`
	Cell62Temp  float64 `json:"cell62_temp"`
	Cell63Temp  float64 `json:"cell63_temp"`
	Cell64Temp  float64 `json:"cell64_temp"`
	Cell65Temp  float64 `json:"cell65_temp"`
	Cell66Temp  float64 `json:"cell66_temp"`
	Cell67Temp  float64 `json:"cell67_temp"`
	Cell68Temp  float64 `json:"cell68_temp"`
	Cell69Temp  float64 `json:"cell69_temp"`
	Cell70Temp  float64 `json:"cell70_temp"`
	Cell71Temp  float64 `json:"cell71_temp"`
	Cell72Temp  float64 `json:"cell72_temp"`
	Cell73Temp  float64 `json:"cell73_temp"`
	Cell74Temp  float64 `json:"cell74_temp"`
	Cell75Temp  float64 `json:"cell75_temp"`
	Cell76Temp  float64 `json:"cell76_temp"`
	Cell77Temp  float64 `json:"cell77_temp"`
	Cell78Temp  float64 `json:"cell78_temp"`
	Cell79Temp  float64 `json:"cell79_temp"`
	Cell80Temp  float64 `json:"cell80_temp"`
	Cell81Temp  float64 `json:"cell81_temp"`
	Cell82Temp  float64 `json:"cell82_temp"`
	Cell83Temp  float64 `json:"cell83_temp"`
	Cell84Temp  float64 `json:"cell84_temp"`
	Cell85Temp  float64 `json:"cell85_temp"`
	Cell86Temp  float64 `json:"cell86_temp"`
	Cell87Temp  float64 `json:"cell87_temp"`
	Cell88Temp  float64 `json:"cell88_temp"`
	Cell89Temp  float64 `json:"cell89_temp"`
	Cell90Temp  float64 `json:"cell90_temp"`
	Cell91Temp  float64 `json:"cell91_temp"`
	Cell92Temp  float64 `json:"cell92_temp"`
	Cell93Temp  float64 `json:"cell93_temp"`
	Cell94Temp  float64 `json:"cell94_temp"`
	Cell95Temp  float64 `json:"cell95_temp"`
	Cell96Temp  float64 `json:"cell96_temp"`
	Cell97Temp  float64 `json:"cell97_temp"`
	Cell98Temp  float64 `json:"cell98_temp"`
	Cell99Temp  float64 `json:"cell99_temp"`
	Cell100Temp float64 `json:"cell100_temp"`
	Cell101Temp float64 `json:"cell101_temp"`
	Cell102Temp float64 `json:"cell102_temp"`
	Cell103Temp float64 `json:"cell103_temp"`
	Cell104Temp float64 `json:"cell104_temp"`
	Cell105Temp float64 `json:"cell105_temp"`
	Cell106Temp float64 `json:"cell106_temp"`
	Cell107Temp float64 `json:"cell107_temp"`
	Cell108Temp float64 `json:"cell108_temp"`
	Cell109Temp float64 `json:"cell109_temp"`
	Cell110Temp float64 `json:"cell110_temp"`
	Cell111Temp float64 `json:"cell111_temp"`
	Cell112Temp float64 `json:"cell112_temp"`
	Cell113Temp float64 `json:"cell113_temp"`
	Cell114Temp float64 `json:"cell114_temp"`
	Cell115Temp float64 `json:"cell115_temp"`
	Cell116Temp float64 `json:"cell116_temp"`
	Cell117Temp float64 `json:"cell117_temp"`
	Cell118Temp float64 `json:"cell118_temp"`
	Cell119Temp float64 `json:"cell119_temp"`
	Cell120Temp float64 `json:"cell120_temp"`
	Cell121Temp float64 `json:"cell121_temp"`
	Cell122Temp float64 `json:"cell122_temp"`
	Cell123Temp float64 `json:"cell123_temp"`
	Cell124Temp float64 `json:"cell124_temp"`
	Cell125Temp float64 `json:"cell125_temp"`
	Cell126Temp float64 `json:"cell126_temp"`
	Cell127Temp float64 `json:"cell127_temp"`
	Millis      int     `json:"millis" gorm:"index"`
}

func (ACU) TableName() string {
	return "gr24_acu"
}

func NewACUNode() mapache.Node {
	return []mapache.Field{
		// Row 1
		mapache.NewField("AccumulatorVoltage", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("AccumulatorCurrent", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("MaxCellTemp", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Errors", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Warnings", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 2
		mapache.NewField("TSVoltage", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("States", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("MaxBalResistorTemp", 2, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("SDCVoltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("GLVVoltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("StateOfCharge", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 3
		mapache.NewField("Fan1Speed", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Fan2Speed", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Fan3Speed", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("PumpSpeed", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("ACUTemp1", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("ACUTemp2", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("ACUTemp3", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("CoolingErrors", 1, mapache.Unsigned, mapache.BigEndian),
		// Rows 4-11
		mapache.NewField("classic gr wasting data", 8*8, mapache.Unsigned, mapache.BigEndian),
		// Row 12
		mapache.NewField("Cell0Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell1Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell2Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell3Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell4Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell5Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell6Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell7Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 13
		mapache.NewField("Cell8Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell9Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell10Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell11Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell12Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell13Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell14Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell15Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 14
		mapache.NewField("Cell16Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell17Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell18Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell19Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell20Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell21Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell22Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell23Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 15
		mapache.NewField("Cell24Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell25Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell26Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell27Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell28Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell29Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell30Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell31Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 16
		mapache.NewField("Cell32Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell33Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell34Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell35Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell36Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell37Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell38Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell39Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 17
		mapache.NewField("Cell40Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell41Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell42Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell43Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell44Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell45Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell46Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell47Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 18
		mapache.NewField("Cell48Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell49Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell50Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell51Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell52Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell53Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell54Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell55Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 19
		mapache.NewField("Cell56Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell57Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell58Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell59Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell60Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell61Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell62Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell63Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 20
		mapache.NewField("Cell64Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell65Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell66Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell67Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell68Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell69Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell70Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell71Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 21
		mapache.NewField("Cell72Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell73Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell74Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell75Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell76Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell77Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell78Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell79Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 22
		mapache.NewField("Cell80Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell81Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell82Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell83Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell84Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell85Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell86Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell87Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 23
		mapache.NewField("Cell88Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell89Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell90Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell91Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell92Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell93Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell94Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell95Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 24
		mapache.NewField("Cell96Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell97Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell98Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell99Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell100Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell101Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell102Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell103Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 25
		mapache.NewField("Cell104Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell105Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell106Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell107Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell108Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell109Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell110Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell111Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 26
		mapache.NewField("Cell112Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell113Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell114Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell115Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell116Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell117Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell118Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell119Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 27
		mapache.NewField("Cell120Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell121Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell122Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell123Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell124Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell125Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell126Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell127Voltage", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 28-29
		mapache.NewField("classic gr wasting data", 8*2, mapache.Unsigned, mapache.BigEndian),
		// Row 30
		mapache.NewField("Cell0Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell1Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell2Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell3Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell4Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell5Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell6Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell7Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 31
		mapache.NewField("Cell8Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell9Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell10Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell11Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell12Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell13Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell14Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell15Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 32
		mapache.NewField("Cell16Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell17Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell18Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell19Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell20Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell21Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell22Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell23Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 33
		mapache.NewField("Cell24Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell25Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell26Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell27Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell28Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell29Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell30Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell31Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 34
		mapache.NewField("Cell32Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell33Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell34Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell35Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell36Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell37Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell38Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell39Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 35
		mapache.NewField("Cell40Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell41Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell42Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell43Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell44Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell45Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell46Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell47Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 36
		mapache.NewField("Cell48Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell49Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell50Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell51Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell52Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell53Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell54Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell55Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 37
		mapache.NewField("Cell56Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell57Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell58Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell59Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell60Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell61Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell62Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell63Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 38
		mapache.NewField("Cell64Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell65Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell66Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell67Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell68Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell69Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell70Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell71Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 39
		mapache.NewField("Cell72Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell73Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell74Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell75Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell76Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell77Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell78Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell79Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 40
		mapache.NewField("Cell80Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell81Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell82Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell83Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell84Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell85Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell86Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell87Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 41
		mapache.NewField("Cell88Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell89Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell90Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell91Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell92Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell93Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell94Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell95Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 42
		mapache.NewField("Cell96Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell97Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell98Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell99Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell100Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell101Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell102Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell103Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 43
		mapache.NewField("Cell104Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell105Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell106Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell107Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell108Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell109Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell110Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell111Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 44
		mapache.NewField("Cell112Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell113Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell114Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell115Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell116Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell117Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell118Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell119Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Row 45
		mapache.NewField("Cell120Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell121Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell122Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell123Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell124Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell125Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell126Temp", 1, mapache.Unsigned, mapache.BigEndian),
		mapache.NewField("Cell127Temp", 1, mapache.Unsigned, mapache.BigEndian),
		// Rows 46-47
		mapache.NewField("classic gr wasting data", 8*5, mapache.Unsigned, mapache.BigEndian),
		// Row 51
		mapache.NewField("Millis", 4, mapache.Unsigned, mapache.BigEndian),
	}
}
