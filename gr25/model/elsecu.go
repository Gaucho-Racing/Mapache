package model

import mp "github.com/gaucho-racing/mapache-go"

// 470
var SAMBrakeIR = mp.Message{
	// 471
	mp.NewField("sam_brake_ir_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_brake_ir_temp",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 472
var SAMTireTemp = mp.Message{
	// 473
	mp.NewField("sam_tire_temp_outside", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_tire_temp_outside",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 474
	mp.NewField("sam_tire_temp_outside_middle", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_tire_temp_outside_middle",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 475
	mp.NewField("sam_tire_temp_inside_middle", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_tire_temp_inside_middle",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 476
	mp.NewField("sam_tire_temp_inside", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_tire_temp_inside",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 477
var SAMIMU = mp.Message{
	// 478
	mp.NewField("sam_imu_accel_x", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_imu_accel_x",
			Value:    float64(int32(f.Value) - 32768) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	// 479
	mp.NewField("sam_imu_accel_y", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_imu_accel_y",
			Value:    float64(int32(f.Value) - 32768) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	// 480
	mp.NewField("sam_imu_accel_z", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_imu_accel_z",
			Value:    float64(int32(f.Value) - 32768) * 0.01,
			RawValue: f.Value,
		})
		return signals
	}),
	// 481
	mp.NewField("sam_imu_gyro_x", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_imu_gyro_x",
			Value:    float64(int32(f.Value) - 32768) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
	// 482
	mp.NewField("sam_imu_gyro_y", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_imu_gyro_y",
			Value:    float64(int32(f.Value) - 32768) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
	// 483
	mp.NewField("sam_imu_gyro_z", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_imu_gyro_z",
			Value:    float64(int32(f.Value) - 32768) * 0.001,
			RawValue: f.Value,
		})
		return signals
	}),
}

// 484
var SAMGPS1 = mp.Message{
	// 485
	mp.NewField("sam_gps_1_lat", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_gps_1_lat",
			Value:    float64(89.987654321),
			RawValue: f.Value,
		})
		return signals
	}),
	// 486
	mp.NewField("sam_gps_1_long", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_gps_1_long",
			Value:    float64(89.987654321),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 487
var SAMGPS2 = mp.Message{
	// 488
	mp.NewField("sam_gps_2_accuracy", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_gps_2_accuracy",
			Value:    float64(89.987654321),
			RawValue: f.Value,
		})
		return signals
	}),
	// 489
	mp.NewField("sam_gps_2_attitude", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_gps_2_attitude",
			Value:    float64(89.987654321),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 490
var SAMGPSTime = mp.Message{
	// 491
	mp.NewField("sam_gps_time_time", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_gps_time_time",
			Value:    float64(2025-05-05/11-59),
			RawValue: f.Value,
		})
		return signals
	}),
	// 492
	mp.NewField("sam_gps_time_of_week_ms", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_gps_time_of_week_ms",
			Value:    float64(2025-05-05/11-59),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 493
var SAMGPSHeading = mp.Message{
	// 494
	mp.NewField("sam_gps_heading_north", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_gps_heading_north",
			Value:    float64(57.2957795131),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 495
var SAMSusPots = mp.Message{
	// 496
	mp.NewField("sam_sus_pots_suspension_angle", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_sus_pots_suspension_angle",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 497
var SAMTOF = mp.Message{
	// 498
	mp.NewField("sam_tof_height", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_tof_height",
			Value:    float64(f.Value) / 256,
			RawValue: f.Value,
		})
		return signals
	}),
}

// 499
var SAMRearWheelspeed = mp.Message{
	// 500
	mp.NewField("sam_rear_wheelspeed_speed", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_rear_wheelspeed_speed",
			Value:    float64(uint32(f.Value) - 32768) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

// 501
var SAMPushrodForce = mp.Message{
	// 502
	mp.NewField("sam_pushrod_force_load_force", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "sam_pushrod_force_load_force",
			Value:    float64(uint32(f.Value) - 32768) * 0.1,
			RawValue: f.Value,
		})
		return signals
	}),
}

// 503
var TCMStatus = mp.Message{
	// 504
	mp.NewField("tcm_status_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"tcm_status_connection_status",
			"tcm_status_mqtt_status",
			"tcm_status_epic_shelter_status",
			"tcm_status_camera_status",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.CheckBit(i)),
				RawValue: f.CheckBit(i),
			})
		}
		return signals
	}),
	// 509
	mp.NewField("tcm_status_ping", 2, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_status_ping",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 510
	mp.NewField("tcm_status_cache_size", 4, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_status_cache_size",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 512
var TCMResourceUtilization = mp.Message{
	// 513
	mp.NewField("tcm_cpu_usage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_cpu_usage",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 514
	mp.NewField("tcm_gpu_usage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_gpu_usage",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 515
	mp.NewField("tcm_memory_usage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_memory_usage",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 516
	mp.NewField("tcm_storage_usage", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_storage_usage",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 517
	mp.NewField("tcm_power_consumption", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_power_consumption",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 518
	mp.NewField("tcm_cpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_cpu_temp",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
	// 519
	mp.NewField("tcm_gpu_temp", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		signals = append(signals, mp.Signal{
			Name:     "tcm_gpu_temp",
			Value:    float64(f.Value),
			RawValue: f.Value,
		})
		return signals
	}),
}

// 520
var DashWarningFlags = mp.Message{
	// 511
	mp.NewField("dash_warning_flags", 1, mp.Unsigned, mp.LittleEndian, func(f mp.Field) []mp.Signal {
		signals := []mp.Signal{}
		bitMap := []string{
			"dash_warning_flags_bse_apps_violation",
		}
		for i := 0; i < len(bitMap); i++ {
			signals = append(signals, mp.Signal{
				Name:     bitMap[i],
				Value:    float64(f.CheckBit(i)),
				RawValue: f.CheckBit(i),
			})
		}
		return signals
	}),
}
