package model

import "strings"

// VehicleType is a known Gaucho Racing car generation. Config flags are defined
// per type, and individual vehicles are validated against this set. Add a new
// constant here when a new car is built.
type VehicleType string

const (
	GR24 VehicleType = "gr24"
	GR25 VehicleType = "gr25"
	GR26 VehicleType = "gr26"
)

// VehicleTypes is the canonical ordered list (newest first), surfaced via the
// API so the frontend's create-vehicle and flag dialogs don't hardcode it.
var VehicleTypes = []VehicleType{GR26, GR25, GR24}

// VehicleTypeInfo is the API shape for a selectable type.
type VehicleTypeInfo struct {
	Value string `json:"value"`
	Label string `json:"label"`
}

// VehicleTypeOptions returns the canonical list as {value,label} pairs.
func VehicleTypeOptions() []VehicleTypeInfo {
	out := make([]VehicleTypeInfo, 0, len(VehicleTypes))
	for _, t := range VehicleTypes {
		out = append(out, VehicleTypeInfo{Value: string(t), Label: strings.ToUpper(string(t))})
	}
	return out
}

func IsValidVehicleType(t string) bool {
	for _, vt := range VehicleTypes {
		if string(vt) == t {
			return true
		}
	}
	return false
}
