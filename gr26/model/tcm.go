package model

import mp "github.com/gaucho-racing/mapache/mapache-go/v3"

// TCM Status is a synthetic 8-byte message the relay publishes every 5s
// summarizing on-vehicle connectivity. status_bits is a flat bitfield;
// each bit is exposed as its own boolean signal so consumers can query
// "is X reachable?" without bit-twiddling.
//
//   connection_ok — TCM has general internet (DNS reachable)
//   mqtt_ok       — cloud MQTT broker is connected
//   mapache_ok    — cloud Mapache is responding (recent pong)
//   mapache_ping  — RTT to Mapache in ms (from most recent pong)
var TCMStatus = mp.Message{
	mp.NewField("status_bits", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			bit(f.Value, 0, "connection_ok"),
			bit(f.Value, 1, "mqtt_ok"),
			bit(f.Value, 2, "mapache_ok"),
		}
	}),
	mp.NewField("mapache_ping", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "mapache_ping", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 5, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

// TCMShelterHeartbeat is emitted by the shelter service on the TCM every
// few seconds. It surfaces shelter's current phase and the depth of the
// unsynced queue so the dash + cloud Mapache can show drain progress
// without poking at shelter directly.
//
//   state         u8 enum  0=idle, 1=claiming, 2=uploading, 3=error
//   pending_rows  u32 LE   count of rows in gr26_message with synced=0
var TCMShelterHeartbeat = mp.Message{
	mp.NewField("state", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "shelter_state", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("pending_rows", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "shelter_pending_rows", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 3, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

// MsgIDShelterBatch is the canonical name for 0x211 — used by gr26
// service code that needs to recognize TCMShelterBatch as a side-channel
// trigger (e.g. enqueueing a downstream ingest job).
const MsgIDShelterBatch = 0x211

// TCMShelterBatch is a 16-byte CAN-FD frame emitted by shelter after each
// successful Parquet upload — combines what landed (rows, compressed size)
// with how it went (claim/upload timing, compression ratio, trigger).
//
//   rows              u32 LE  row count in the uploaded batch
//   compressed_bytes  u32 LE  size of the parquet file on S3 (after zstd)
//   upload_ms         u16 LE  parquet write + S3 multipart upload duration
//   claim_ms          u16 LE  postgres claim CTE duration
//   ratio_x100        u16 LE  compression ratio × 100 (e.g. 724 → 7.24x)
//   trigger           u8      0=size 1=age 2=startup
var TCMShelterBatch = mp.Message{
	mp.NewField("rows", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "shelter_batch_rows", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("compressed_bytes", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "shelter_batch_compressed_bytes", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("upload_ms", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "shelter_batch_upload_ms", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("claim_ms", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "shelter_batch_claim_ms", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("ratio_x100", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "shelter_batch_ratio", Value: float64(f.Value) / 100.0, RawValue: f.Value},
		}
	}),
	mp.NewField("trigger", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return []mp.Signal{
			{Name: "shelter_batch_trigger", Value: float64(f.Value), RawValue: f.Value},
		}
	}),
	mp.NewField("_reserved", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		return nil
	}),
}

var TCMResourceUtil = mp.Message{
	mp.NewField("cpu0_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu0_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu0_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu0_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu1_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu1_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu1_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu1_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu2_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu2_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu2_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu2_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu3_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu3_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu3_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu3_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu4_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu4_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu4_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu4_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu5_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu5_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu5_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu5_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu_total_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu_total_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ram_total", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ram_total",
			Value:    float64(f.Value), // MB
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ram_used", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ram_used",
			Value:    float64(f.Value), // MB
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("ram_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "ram_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gpu_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gpu_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gpu_freq", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gpu_freq",
			Value:    float64(f.Value), // MHz
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("disk_total", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "disk_total",
			Value:    float64(f.Value), // GB
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("disk_used", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "disk_used",
			Value:    float64(f.Value), // GB
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("disk_util", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "disk_util",
			Value:    float64(f.Value), // Percentage
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("cpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "cpu_temp",
			Value:    float64(f.Value), // Celsius
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("gpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "gpu_temp",
			Value:    float64(f.Value), // Celsius
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("voltage_draw", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "voltage_draw",
			Value:    float64(f.Value) / 1000, // Volts (assuming raw is in millivolts)
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("current_draw", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "current_draw",
			Value:    float64(f.Value) / 1000, // Amps (assuming raw is in milliamps)
			RawValue: f.Value,
		})
		return signals
	}),
	mp.NewField("power_draw", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "power_draw",
			Value:    float64(f.Value) / 1000, // Watts (assuming raw is in milliWatts)
			RawValue: f.Value,
		})
		return signals
	}),
}
