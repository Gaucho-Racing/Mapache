package mapache

import "testing"

func TestVehicle_TableName(t *testing.T) {
	v := Vehicle{}
	if v.TableName() != "vehicle" {
		t.Error("Expected vehicle, got", v.TableName())
	}
}

func TestTrip_TableName(t *testing.T) {
	tr := Trip{}
	if tr.TableName() != "trip" {
		t.Error("Expected trip, got", tr.TableName())
	}
}

func TestLap_TableName(t *testing.T) {
	l := Lap{}
	if l.TableName() != "trip_lap" {
		t.Error("Expected trip_lap, got", l.TableName())
	}
}
