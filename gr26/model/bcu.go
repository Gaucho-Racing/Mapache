package model

import (
	"fmt"

	mp "github.com/gaucho-racing/mapache/mapache-go/v3"
)

var BCUStatus1 = mp.Message{
	mp.NewField("accumulator_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "accumulator_voltage", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("ts_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "ts_voltage", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("accumulator_current", 2, mp.Signed, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "accumulator_current", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("accumulator_soc", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "accumulator_soc", Value: float64(f.Value) * 20.0 / 51.0, RawValue: f.Value},
		}
	}),
	mp.NewField("glv_soc", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "glv_soc", Value: float64(f.Value) * 20.0 / 51.0, RawValue: f.Value},
		}
	}),
}

var BCUStatus2 = mp.Message{
	mp.NewField("20v_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "20v_voltage", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("12v_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "12v_voltage", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("sdc_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "sdc_voltage", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("min_cell_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "min_cell_voltage", Value: float64(f.Value)*0.01 + 2.0, RawValue: f.Value},
		}
	}),
	mp.NewField("max_cell_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "max_cell_temp", Value: float64(f.Value) * 0.25, RawValue: f.Value},
		}
	}),
	mp.NewField("status_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "status_flags", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("precharge_latch_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "precharge_latch_flags", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

var BCUStatus3 = mp.Message{
	mp.NewField("hv_input_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "hv_input_voltage", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("hv_output_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "hv_output_voltage", Value: float64(f.Value) * 0.01, RawValue: f.Value},
		}
	}),
	mp.NewField("hv_input_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "hv_input_current", Value: float64(f.Value) * 0.001, RawValue: f.Value},
		}
	}),
	mp.NewField("hv_output_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "hv_output_current", Value: float64(f.Value) * 0.001, RawValue: f.Value},
		}
	}),
}

var BCUPrecharge = mp.Message{
	mp.NewField("set_ts_active", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "set_ts_active", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
}

var BCUConfigChargeParameters = mp.Message{
	mp.NewField("charge_voltage", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "charge_voltage", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
	mp.NewField("charge_current", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "charge_current", Value: float64(f.Value) * 0.1, RawValue: f.Value},
		}
	}),
}

var BCUConfigOperationalParameters = mp.Message{
	mp.NewField("min_cell_voltage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "min_cell_voltage", Value: float64(f.Value)*0.01 + 2.0, RawValue: f.Value},
		}
	}),
	mp.NewField("max_cell_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "max_cell_temp", Value: float64(f.Value) * 0.25, RawValue: f.Value},
		}
	}),
}

func cellDataMessage(startCell int) mp.Message {
	msg := mp.Message{}
	for i := 0; i < 32; i++ {
		cell := startCell + i
		voltageName := fmt.Sprintf("cell_%d_voltage", cell)
		tempName := fmt.Sprintf("cell_%d_temp", cell)
		msg = append(msg, mp.NewField(voltageName, 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
			return []mp.Signal{
				{Name: f.Name, Value: float64(f.Value)*0.01 + 2.0, RawValue: f.Value},
			}
		}))
		msg = append(msg, mp.NewField(tempName, 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
			return []mp.Signal{
				{Name: f.Name, Value: float64(f.Value) * 0.25, RawValue: f.Value},
			}
		}))
	}
	return msg
}

var BCUCellData1 = cellDataMessage(0)
var BCUCellData2 = cellDataMessage(32)
var BCUCellData3 = cellDataMessage(64)
var BCUCellData4 = cellDataMessage(96)
var BCUCellData5 = cellDataMessage(128)
