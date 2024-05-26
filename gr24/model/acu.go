package model

import (
	"time"

	"github.com/gaucho-racing/mapache-go"
)

type ACU struct {
	ID                 string    `json:"id" gorm:"primaryKey"`
	VehicleID          string    `json:"vehicle_id"`
	CreatedAt          time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
	AccumulatorVoltage float64   `json:"accumulator_voltage"`
	AccumulatorCurrent float64   `json:"accumulator_current"`
	MaxCellTemp        float64   `json:"max_cell_temp"`
	Errors             int       `json:"errors"`
	Warnings           int       `json:"warnings"`
	TSVoltage          float64   `json:"ts_voltage"`
	States             int       `json:"states"`
	MaxBalResistorTemp float64   `json:"max_bal_resistor_temp"`
	SDCVoltage         float64   `json:"sdc_voltage"`
	GLVVoltage         float64   `json:"glv_voltage"`
	StateOfCharge      float64   `json:"state_of_charge"`
	Fan1Speed          float64   `json:"fan1_speed"`
	Fan2Speed          float64   `json:"fan2_speed"`
	Fan3Speed          float64   `json:"fan3_speed"`
	PumpSpeed          float64   `json:"pump_speed"`
	ACUTemp1           float64   `json:"acu_temp1"`
	ACUTemp2           float64   `json:"acu_temp2"`
	ACUTemp3           float64   `json:"acu_temp3"`
	CoolingErrors      int       `json:"cooling_errors"`
	MaxChargeCurrent   float64   `json:"max_charge_current"`
	MaxChargeVoltage   float64   `json:"max_charge_voltage"`
	CartStates         int       `json:"cart_states"`
	ExpCellNumber      int       `json:"exp_cell_number"`
	ExpCellVoltage     float64   `json:"exp_cell_voltage"`
	ExpOpenCellVoltage float64   `json:"exp_open_cell_voltage"`
	ExpCellTemp        float64   `json:"exp_cell_temp"`
	ExpCellStatus      int       `json:"exp_cell_status"`
	Cell0Voltage       float64   `json:"cell0_voltage"`
	Cell1Voltage       float64   `json:"cell1_voltage"`
	Cell2Voltage       float64   `json:"cell2_voltage"`
	Cell3Voltage       float64   `json:"cell3_voltage"`
	Cell4Voltage       float64   `json:"cell4_voltage"`
	Cell5Voltage       float64   `json:"cell5_voltage"`
	Cell6Voltage       float64   `json:"cell6_voltage"`
	Cell7Voltage       float64   `json:"cell7_voltage"`
	Cell8Voltage       float64   `json:"cell8_voltage"`
	Cell9Voltage       float64   `json:"cell9_voltage"`
	Cell10Voltage      float64   `json:"cell10_voltage"`
	Cell11Voltage      float64   `json:"cell11_voltage"`
	Cell12Voltage      float64   `json:"cell12_voltage"`
	Cell13Voltage      float64   `json:"cell13_voltage"`
	Cell14Voltage      float64   `json:"cell14_voltage"`
	Cell15Voltage      float64   `json:"cell15_voltage"`
	Cell16Voltage      float64   `json:"cell16_voltage"`
	Cell17Voltage      float64   `json:"cell17_voltage"`
	Cell18Voltage      float64   `json:"cell18_voltage"`
	Cell19Voltage      float64   `json:"cell19_voltage"`
	Cell20Voltage      float64   `json:"cell20_voltage"`
	Cell21Voltage      float64   `json:"cell21_voltage"`
	Cell22Voltage      float64   `json:"cell22_voltage"`
	Cell23Voltage      float64   `json:"cell23_voltage"`
	Cell24Voltage      float64   `json:"cell24_voltage"`
	Cell25Voltage      float64   `json:"cell25_voltage"`
	Cell26Voltage      float64   `json:"cell26_voltage"`
	Cell27Voltage      float64   `json:"cell27_voltage"`
	Cell28Voltage      float64   `json:"cell28_voltage"`
	Cell29Voltage      float64   `json:"cell29_voltage"`
	Cell30Voltage      float64   `json:"cell30_voltage"`
	Cell31Voltage      float64   `json:"cell31_voltage"`
	Cell32Voltage      float64   `json:"cell32_voltage"`
	Cell33Voltage      float64   `json:"cell33_voltage"`
	Cell34Voltage      float64   `json:"cell34_voltage"`
	Cell35Voltage      float64   `json:"cell35_voltage"`
	Cell36Voltage      float64   `json:"cell36_voltage"`
	Cell37Voltage      float64   `json:"cell37_voltage"`
	Cell38Voltage      float64   `json:"cell38_voltage"`
	Cell39Voltage      float64   `json:"cell39_voltage"`
	Cell40Voltage      float64   `json:"cell40_voltage"`
	Cell41Voltage      float64   `json:"cell41_voltage"`
	Cell42Voltage      float64   `json:"cell42_voltage"`
	Cell43Voltage      float64   `json:"cell43_voltage"`
	Cell44Voltage      float64   `json:"cell44_voltage"`
	Cell45Voltage      float64   `json:"cell45_voltage"`
	Cell46Voltage      float64   `json:"cell46_voltage"`
	Cell47Voltage      float64   `json:"cell47_voltage"`
	Cell48Voltage      float64   `json:"cell48_voltage"`
	Cell49Voltage      float64   `json:"cell49_voltage"`
	Cell50Voltage      float64   `json:"cell50_voltage"`
	Cell51Voltage      float64   `json:"cell51_voltage"`
	Cell52Voltage      float64   `json:"cell52_voltage"`
	Cell53Voltage      float64   `json:"cell53_voltage"`
	Cell54Voltage      float64   `json:"cell54_voltage"`
	Cell55Voltage      float64   `json:"cell55_voltage"`
	Cell56Voltage      float64   `json:"cell56_voltage"`
	Cell57Voltage      float64   `json:"cell57_voltage"`
	Cell58Voltage      float64   `json:"cell58_voltage"`
	Cell59Voltage      float64   `json:"cell59_voltage"`
	Cell60Voltage      float64   `json:"cell60_voltage"`
	Cell61Voltage      float64   `json:"cell61_voltage"`
	Cell62Voltage      float64   `json:"cell62_voltage"`
	Cell63Voltage      float64   `json:"cell63_voltage"`
	Cell64Voltage      float64   `json:"cell64_voltage"`
	Cell65Voltage      float64   `json:"cell65_voltage"`
	Cell66Voltage      float64   `json:"cell66_voltage"`
	Cell67Voltage      float64   `json:"cell67_voltage"`
	Cell68Voltage      float64   `json:"cell68_voltage"`
	Cell69Voltage      float64   `json:"cell69_voltage"`
	Cell70Voltage      float64   `json:"cell70_voltage"`
	Cell71Voltage      float64   `json:"cell71_voltage"`
	Cell72Voltage      float64   `json:"cell72_voltage"`
	Cell73Voltage      float64   `json:"cell73_voltage"`
	Cell74Voltage      float64   `json:"cell74_voltage"`
	Cell75Voltage      float64   `json:"cell75_voltage"`
	Cell76Voltage      float64   `json:"cell76_voltage"`
	Cell77Voltage      float64   `json:"cell77_voltage"`
	Cell78Voltage      float64   `json:"cell78_voltage"`
	Cell79Voltage      float64   `json:"cell79_voltage"`
	Cell80Voltage      float64   `json:"cell80_voltage"`
	Cell81Voltage      float64   `json:"cell81_voltage"`
	Cell82Voltage      float64   `json:"cell82_voltage"`
	Cell83Voltage      float64   `json:"cell83_voltage"`
	Cell84Voltage      float64   `json:"cell84_voltage"`
	Cell85Voltage      float64   `json:"cell85_voltage"`
	Cell86Voltage      float64   `json:"cell86_voltage"`
	Cell87Voltage      float64   `json:"cell87_voltage"`
	Cell88Voltage      float64   `json:"cell88_voltage"`
	Cell89Voltage      float64   `json:"cell89_voltage"`
	Cell90Voltage      float64   `json:"cell90_voltage"`
	Cell91Voltage      float64   `json:"cell91_voltage"`
	Cell92Voltage      float64   `json:"cell92_voltage"`
	Cell93Voltage      float64   `json:"cell93_voltage"`
	Cell94Voltage      float64   `json:"cell94_voltage"`
	Cell95Voltage      float64   `json:"cell95_voltage"`
	Cell96Voltage      float64   `json:"cell96_voltage"`
	Cell97Voltage      float64   `json:"cell97_voltage"`
	Cell98Voltage      float64   `json:"cell98_voltage"`
	Cell99Voltage      float64   `json:"cell99_voltage"`
	Cell100Voltage     float64   `json:"cell100_voltage"`
	Cell101Voltage     float64   `json:"cell101_voltage"`
	Cell102Voltage     float64   `json:"cell102_voltage"`
	Cell103Voltage     float64   `json:"cell103_voltage"`
	Cell104Voltage     float64   `json:"cell104_voltage"`
	Cell105Voltage     float64   `json:"cell105_voltage"`
	Cell106Voltage     float64   `json:"cell106_voltage"`
	Cell107Voltage     float64   `json:"cell107_voltage"`
	Cell108Voltage     float64   `json:"cell108_voltage"`
	Cell109Voltage     float64   `json:"cell109_voltage"`
	Cell110Voltage     float64   `json:"cell110_voltage"`
	Cell111Voltage     float64   `json:"cell111_voltage"`
	Cell112Voltage     float64   `json:"cell112_voltage"`
	Cell113Voltage     float64   `json:"cell113_voltage"`
	Cell114Voltage     float64   `json:"cell114_voltage"`
	Cell115Voltage     float64   `json:"cell115_voltage"`
	Cell116Voltage     float64   `json:"cell116_voltage"`
	Cell117Voltage     float64   `json:"cell117_voltage"`
	Cell118Voltage     float64   `json:"cell118_voltage"`
	Cell119Voltage     float64   `json:"cell119_voltage"`
	Cell120Voltage     float64   `json:"cell120_voltage"`
	Cell121Voltage     float64   `json:"cell121_voltage"`
	Cell122Voltage     float64   `json:"cell122_voltage"`
	Cell123Voltage     float64   `json:"cell123_voltage"`
	Cell124Voltage     float64   `json:"cell124_voltage"`
	Cell125Voltage     float64   `json:"cell125_voltage"`
	Cell126Voltage     float64   `json:"cell126_voltage"`
	Cell127Voltage     float64   `json:"cell127_voltage"`
	Millis             int       `json:"millis" gorm:"index"`
}

func (ACU) TableName() string {
	return "gr24_acu"
}

func NewACUNode() mapache.Node {
	return []mapache.Field{
		// Row 1
		{
			Name:   "AccumulatorVoltage",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "AccumulatorCurrent",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "MaxCellTemp",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Errors",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Warnings",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 2
		{
			Name:   "TSVoltage",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "States",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "MaxBalResistorTemp",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "SDCVoltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "GLVVoltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "StateOfCharge",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 3
		{
			Name:   "Fan1Speed",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Fan2Speed",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Fan3Speed",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "PumpSpeed",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "ACUTemp1",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "ACUTemp2",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "ACUTemp3",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "CoolingErrors",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 4
		{
			Name:   "MaxChargeCurrent",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "MaxChargeVoltage",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "CartStates",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Blank",
			Size:   3,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 5
		{
			Name:   "ExpCellNumber",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "ExpCellVoltage",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "ExpOpenCellVoltage",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "ExpCellTemp",
			Size:   2,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "ExpCellStatus",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 6
		{
			Name:   "Cell0Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell1Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell2Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell3Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell4Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell5Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell6Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell7Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 7
		{
			Name:   "Cell8Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell9Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell10Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell11Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell12Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell13Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell14Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell15Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 8
		{
			Name:   "Cell16Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell17Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell18Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell19Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell20Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell21Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell22Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell23Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 9
		{
			Name:   "Cell24Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell25Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell26Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell27Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell28Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell29Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell30Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell31Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 10
		{
			Name:   "Cell32Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell33Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell34Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell35Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell36Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell37Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell38Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell39Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 11
		{
			Name:   "Cell40Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell41Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell42Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell43Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell44Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell45Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell46Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell47Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 12
		{
			Name:   "Cell48Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell49Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell50Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell51Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell52Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell53Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell54Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell55Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 13
		{
			Name:   "Cell56Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell57Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell58Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell59Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell60Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell61Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell62Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell63Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 14
		{
			Name:   "Cell64Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell65Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell66Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell67Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell68Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell69Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell70Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell71Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 15
		{
			Name:   "Cell72Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell73Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell74Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell75Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell76Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell77Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell78Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell79Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 16
		{
			Name:   "Cell80Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell81Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell82Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell83Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell84Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell85Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell86Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell87Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 17
		{
			Name:   "Cell88Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell89Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell90Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell91Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell92Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell93Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell94Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell95Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 18
		{
			Name:   "Cell96Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell97Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell98Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell99Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell100Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell101Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell102Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell103Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 19
		{
			Name:   "Cell104Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell105Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell106Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell107Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell108Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell109Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell110Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell111Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 20
		{
			Name:   "Cell112Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell113Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell114Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell115Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell116Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell117Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell118Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell119Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 21
		{
			Name:   "Cell120Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell121Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell122Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell123Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell124Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell125Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell126Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell127Voltage",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 22
		{
			Name:   "Cell0Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell1Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell2Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell3Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell4Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell5Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell6Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell7Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 23
		{
			Name:   "Cell8Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell9Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell10Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell11Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell12Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell13Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell14Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell15Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 24
		{
			Name:   "Cell16Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell17Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell18Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell19Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell20Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell21Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell22Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell23Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 25
		{
			Name:   "Cell24Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell25Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell26Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell27Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 26
		{
			Name:   "Cell28Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell29Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell30Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell31Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 27
		{
			Name:   "Cell32Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell33Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell34Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell35Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 28
		{
			Name:   "Cell36Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell37Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell38Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell39Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 29
		{
			Name:   "Cell40Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell41Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell42Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell43Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 30
		{
			Name:   "Cell44Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell45Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell46Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell47Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 31
		{
			Name:   "Cell48Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell49Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell50Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell51Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 32
		{
			Name:   "Cell52Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell53Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell54Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell55Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 33
		{
			Name:   "Cell56Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell57Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell58Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell59Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 34
		{
			Name:   "Cell60Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell61Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell62Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell63Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 35
		{
			Name:   "Cell64Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell65Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell66Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell67Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 36
		{
			Name:   "Cell68Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell69Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell70Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell71Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 37
		{
			Name:   "Cell72Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell73Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell74Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell75Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 38
		{
			Name:   "Cell76Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell77Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell78Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell79Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 39
		{
			Name:   "Cell80Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell81Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell82Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell83Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 40
		{
			Name:   "Cell84Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell85Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell86Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell87Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 41
		{
			Name:   "Cell88Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell89Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell90Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell91Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 42
		{
			Name:   "Cell92Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell93Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell94Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell95Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 43
		{
			Name:   "Cell96Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell97Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell98Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell99Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 44
		{
			Name:   "Cell100Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell101Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell102Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell103Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 45
		{
			Name:   "Cell104Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell105Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell106Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell107Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 46
		{
			Name:   "Cell108Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell109Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell110Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell111Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 47
		{
			Name:   "Cell112Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell113Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell114Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell115Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 48
		{
			Name:   "Cell116Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell117Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell118Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell119Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 49
		{
			Name:   "Cell120Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell121Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell122Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell123Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		// Row 50
		{
			Name:   "Cell124Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell125Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell126Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
		{
			Name:   "Cell127Temp",
			Size:   1,
			Sign:   mapache.Unsigned,
			Endian: mapache.BigEndian,
		},
	}
}
