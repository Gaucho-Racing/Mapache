package model

import "testing"

func defs() []ConfigFlag {
	return []ConfigFlag{
		{VehicleType: "gr26", Key: "mqtt_publish_enabled", ValueType: ConfigBool, DefaultValue: "true"},
		{VehicleType: "gr26", Key: "epic_shelter_enabled", ValueType: ConfigBool, DefaultValue: "true"},
		{VehicleType: "gr26", Key: "camera_enabled", ValueType: ConfigBool, DefaultValue: "false"},
		{VehicleType: "gr26", Key: "sample_rate_hz", ValueType: ConfigInt, DefaultValue: "100"},
	}
}

func TestComputeFlagsDefaultsOnly(t *testing.T) {
	flags, errs := ComputeFlags(defs(), nil)
	if len(errs) != 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
	if flags["mqtt_publish_enabled"] != true {
		t.Errorf("mqtt default: want true, got %v", flags["mqtt_publish_enabled"])
	}
	if flags["camera_enabled"] != false {
		t.Errorf("camera default: want false, got %v", flags["camera_enabled"])
	}
	if flags["sample_rate_hz"] != int64(100) {
		t.Errorf("sample_rate default: want int64(100), got %v (%T)", flags["sample_rate_hz"], flags["sample_rate_hz"])
	}
}

func TestComputeFlagsOverrideWins(t *testing.T) {
	ovr := []VehicleConfigOverride{
		{VehicleID: "gr26", Key: "camera_enabled", Value: "true"},
		{VehicleID: "gr26", Key: "sample_rate_hz", Value: "250"},
	}
	flags, errs := ComputeFlags(defs(), ovr)
	if len(errs) != 0 {
		t.Fatalf("unexpected errors: %v", errs)
	}
	if flags["camera_enabled"] != true {
		t.Errorf("camera override: want true, got %v", flags["camera_enabled"])
	}
	if flags["sample_rate_hz"] != int64(250) {
		t.Errorf("sample_rate override: want 250, got %v", flags["sample_rate_hz"])
	}
	// Untouched flag keeps its default.
	if flags["mqtt_publish_enabled"] != true {
		t.Errorf("mqtt untouched: want true, got %v", flags["mqtt_publish_enabled"])
	}
}

func TestComputeFlagsUnknownOverrideIgnored(t *testing.T) {
	ovr := []VehicleConfigOverride{
		{VehicleID: "gr26", Key: "nonexistent_flag", Value: "true"},
	}
	flags, _ := ComputeFlags(defs(), ovr)
	if _, ok := flags["nonexistent_flag"]; ok {
		t.Error("override for undefined flag should not appear in snapshot")
	}
	if len(flags) != len(defs()) {
		t.Errorf("flag count: want %d, got %d", len(defs()), len(flags))
	}
}

func TestComputeFlagsBadOverrideFallsBackToDefault(t *testing.T) {
	ovr := []VehicleConfigOverride{
		{VehicleID: "gr26", Key: "camera_enabled", Value: "not-a-bool"},
	}
	flags, errs := ComputeFlags(defs(), ovr)
	if len(errs) == 0 {
		t.Error("expected a non-fatal decode error for the bad override")
	}
	if flags["camera_enabled"] != false {
		t.Errorf("bad override should fall back to default false, got %v", flags["camera_enabled"])
	}
}

func TestValidateValue(t *testing.T) {
	cases := []struct {
		t       ConfigValueType
		v       string
		wantErr bool
	}{
		{ConfigBool, "true", false},
		{ConfigBool, "1", true},
		{ConfigInt, "42", false},
		{ConfigInt, "4.2", true},
		{ConfigFloat, "4.2", false},
		{ConfigString, `"front"`, false},
		{ConfigString, "front", true}, // unquoted is not a JSON string
		{"weird", "true", true},
	}
	for _, c := range cases {
		err := ValidateValue(c.t, c.v)
		if (err != nil) != c.wantErr {
			t.Errorf("ValidateValue(%s, %q): err=%v, wantErr=%v", c.t, c.v, err, c.wantErr)
		}
	}
}
