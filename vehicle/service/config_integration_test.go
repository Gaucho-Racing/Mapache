package service

import (
	"os"
	"testing"

	"github.com/gaucho-racing/mapache/vehicle/database"
	"github.com/gaucho-racing/mapache/vehicle/model"
	"github.com/gaucho-racing/mapache/vehicle/pkg/logger"

	mapache "github.com/gaucho-racing/mapache/mapache-go/v3"
)

// These tests exercise the real Postgres SQL paths (upserts, cascade delete,
// transactions) and only run when DATABASE_HOST is set. With no DB they skip,
// so `go test ./...` stays green without infrastructure.
func TestMain(m *testing.M) {
	if os.Getenv("DATABASE_HOST") == "" {
		os.Exit(0)
	}
	logger.Init(false)
	database.Init()
	os.Exit(m.Run())
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func TestConfigFlowEndToEnd(t *testing.T) {
	db := database.DB
	db.Exec("DELETE FROM vehicle_config_override")
	db.Exec("DELETE FROM vehicle_config_status")
	db.Exec("DELETE FROM config_flag")
	db.Where("id = ?", "test-car-1").Delete(&mapache.Vehicle{})

	must(t, CreateVehicle(mapache.Vehicle{ID: "test-car-1", Name: "Test", Type: "gr26"}))

	must(t, UpsertFlag(model.ConfigFlag{VehicleType: "gr26", Key: "mqtt_publish_enabled", ValueType: model.ConfigBool, DefaultValue: "true"}))
	must(t, UpsertFlag(model.ConfigFlag{VehicleType: "gr26", Key: "camera_enabled", ValueType: model.ConfigBool, DefaultValue: "false"}))

	// Unknown type and bad default are rejected.
	if err := UpsertFlag(model.ConfigFlag{VehicleType: "gr99", Key: "x", ValueType: model.ConfigBool, DefaultValue: "true"}); err == nil {
		t.Fatal("expected unknown vehicle type rejection")
	}
	if err := UpsertFlag(model.ConfigFlag{VehicleType: "gr26", Key: "x", ValueType: model.ConfigBool, DefaultValue: "notbool"}); err == nil {
		t.Fatal("expected bad default rejection")
	}

	snap, err := BuildSnapshot("test-car-1")
	must(t, err)
	if snap.Flags["mqtt_publish_enabled"] != true || snap.Flags["camera_enabled"] != false {
		t.Fatalf("type defaults wrong: %+v", snap.Flags)
	}
	v1 := snap.Version

	// Per-vehicle override wins and changes the version.
	must(t, SetOverride("test-car-1", "camera_enabled", "true"))
	snap2, _ := BuildSnapshot("test-car-1")
	if snap2.Flags["camera_enabled"] != true {
		t.Fatal("override not applied")
	}
	if snap2.Version == v1 {
		t.Fatal("version should change after override")
	}

	// Invalid value and unknown-flag overrides are rejected.
	if err := SetOverride("test-car-1", "camera_enabled", "notbool"); err == nil {
		t.Fatal("expected invalid value rejection")
	}
	if err := SetOverride("test-car-1", "nonexistent", "true"); err == nil {
		t.Fatal("expected unknown flag rejection")
	}

	// Poll accounting.
	must(t, RecordPoll("test-car-1", snap2.Version))
	st := GetStatus("test-car-1")
	if st.AppliedVersion != snap2.Version {
		t.Fatalf("applied version not recorded: %q", st.AppliedVersion)
	}
	if st.LastPolledAt.IsZero() {
		t.Fatal("last polled not set")
	}

	// Deleting the flag cascades to the vehicle override and drops it from the snapshot.
	must(t, DeleteFlag("gr26", "camera_enabled"))
	var cnt int64
	db.Model(&model.VehicleConfigOverride{}).
		Where("vehicle_id = ? AND key = ?", "test-car-1", "camera_enabled").Count(&cnt)
	if cnt != 0 {
		t.Fatalf("override should be cascade-deleted, found %d", cnt)
	}
	snap3, _ := BuildSnapshot("test-car-1")
	if _, ok := snap3.Flags["camera_enabled"]; ok {
		t.Fatal("deleted flag should not appear in snapshot")
	}
	if _, ok := snap3.Flags["mqtt_publish_enabled"]; !ok {
		t.Fatal("untouched flag should remain")
	}
}
