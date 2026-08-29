package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// PAS is 0x165 from PAS.
var PAS = mp.Message{
	mp.NewField("bytes_0_0", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			flag("PAS_KeyPresent", f.Value, 0),
			sig("PAS_KeyPosition", f.Value, 2, 2, false, 1, 0),
		}
	}),
}
