package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// Insulation Monitoring Device (IMD). Only IMD_general has a usable
// CAN-ID layout; IMD_RESPONSE (0x23) and the 0x18EFF4FE request/response
// frames are J1939-multiplexed (several messages share one CAN ID,
// disambiguated by payload), which this ID-keyed decoder cannot split.
// TODO(grcan-sync): model the multiplexed 0x18EFF4FE IMD frames if needed.

var IMDGeneral = mp.Message{
	mp.NewField("r_iso_corrected", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "r_iso_corrected", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("r_iso_status", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "r_iso_status", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("iso_meas_count", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "iso_meas_count", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("status", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "status", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("activity", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "activity", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}
