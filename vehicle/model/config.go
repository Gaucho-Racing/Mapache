package model

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"
)

// ConfigValueType is the scalar type a flag carries. Values are stored
// JSON-encoded (e.g. "true", "42", "\"front\"") so the published snapshot
// surfaces them with their real JSON type rather than as strings.
type ConfigValueType string

const (
	ConfigBool   ConfigValueType = "bool"
	ConfigInt    ConfigValueType = "int"
	ConfigFloat  ConfigValueType = "float"
	ConfigString ConfigValueType = "string"
)

// ConfigFlag defines a tunable flag for a vehicle TYPE, with its default
// value. Every vehicle of that type inherits the flag; an individual vehicle
// can override the value via VehicleConfigOverride. Keyed by (VehicleType, Key)
// so the same flag key can carry different defaults across types (e.g. a gr26
// default vs a gr25 default).
type ConfigFlag struct {
	VehicleType  string          `json:"vehicle_type" gorm:"primaryKey"`
	Key          string          `json:"key" gorm:"primaryKey"`
	ValueType    ConfigValueType `json:"value_type"`
	DefaultValue string          `json:"default_value"`
	Description  string          `json:"description"`
	UpdatedAt    time.Time       `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
	CreatedAt    time.Time       `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (ConfigFlag) TableName() string { return "config_flag" }

// VehicleConfigOverride pins a flag to a value for one specific vehicle,
// taking precedence over the type-level default. The flag must exist for that
// vehicle's type (validated on write); a vehicle has exactly one type, so
// (VehicleID, Key) maps unambiguously to a (VehicleType, Key) flag.
type VehicleConfigOverride struct {
	VehicleID string    `json:"vehicle_id" gorm:"primaryKey"`
	Key       string    `json:"key" gorm:"primaryKey"`
	Value     string    `json:"value"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;precision:6"`
}

func (VehicleConfigOverride) TableName() string { return "vehicle_config_override" }

// VehicleConfigStatus records what version the car last reported applying and
// when it last checked in. AppliedVersion + AppliedAt come from the version
// the car echoes on its next poll; LastPolledAt is updated on every poll. The
// desired version is computed on read (the current snapshot's content hash),
// not stored — so there is no write-path bookkeeping to keep in sync, and a
// flag deletion can't leave a stale counter behind. Drift = AppliedVersion !=
// current version; a stale LastPolledAt means the car is offline.
type VehicleConfigStatus struct {
	VehicleID      string    `json:"vehicle_id" gorm:"primaryKey"`
	AppliedVersion string    `json:"applied_version"`
	AppliedAt      time.Time `json:"applied_at" gorm:"precision:6"`
	LastPolledAt   time.Time `json:"last_polled_at" gorm:"precision:6"`
	UpdatedAt      time.Time `json:"updated_at" gorm:"autoUpdateTime;precision:6"`
}

func (VehicleConfigStatus) TableName() string { return "vehicle_config_status" }

// ConfigSnapshot is the full-state payload the car fetches from
// GET /vehicles/{id}/config. The car applies it wholesale and echoes Version
// back on its next poll. Full-state (not deltas) keeps application idempotent
// and self-healing: a car that missed changes just converges to the latest.
// Version is a content hash over the effective flags, so it doubles as the
// HTTP ETag (unchanged poll → 304) and changes whenever the resolved config
// changes — including on flag deletion.
type ConfigSnapshot struct {
	VehicleID   string         `json:"vehicle_id"`
	Version     string         `json:"version"`
	GeneratedAt time.Time      `json:"generated_at"`
	Flags       map[string]any `json:"flags"`
}

// SnapshotVersion is the deterministic content hash of a vehicle's effective
// flags. json.Marshal sorts map keys, so the encoding is canonical and the
// hash is stable across processes for identical content.
func SnapshotVersion(vehicleID string, flags map[string]any) string {
	b, _ := json.Marshal(struct {
		V string         `json:"v"`
		F map[string]any `json:"f"`
	}{vehicleID, flags})
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:8])
}

// DecodeScalar parses a JSON-encoded scalar into its typed Go value according
// to t. Used both to build snapshots and to validate values on write.
func DecodeScalar(t ConfigValueType, encoded string) (any, error) {
	switch t {
	case ConfigBool:
		var v bool
		err := json.Unmarshal([]byte(encoded), &v)
		return v, err
	case ConfigInt:
		var v int64
		err := json.Unmarshal([]byte(encoded), &v)
		return v, err
	case ConfigFloat:
		var v float64
		err := json.Unmarshal([]byte(encoded), &v)
		return v, err
	case ConfigString:
		var v string
		err := json.Unmarshal([]byte(encoded), &v)
		return v, err
	default:
		return nil, fmt.Errorf("unknown config value type %q", t)
	}
}

// ValidateValue reports whether encoded is a well-formed JSON scalar of type t.
func ValidateValue(t ConfigValueType, encoded string) error {
	_, err := DecodeScalar(t, encoded)
	return err
}

// ComputeFlags merges global defaults with per-vehicle overrides into the typed
// flag map for a snapshot. Overrides win; an override for an unknown flag is
// ignored. If an override fails to decode it falls back to the flag's default
// so one bad row can't poison the whole snapshot — non-fatal decode problems
// are returned for logging, not surfaced to the car.
func ComputeFlags(defaults []ConfigFlag, overrides []VehicleConfigOverride) (map[string]any, []error) {
	ovr := make(map[string]string, len(overrides))
	for _, o := range overrides {
		ovr[o.Key] = o.Value
	}

	flags := make(map[string]any, len(defaults))
	var errs []error
	for _, f := range defaults {
		raw, overridden := f.DefaultValue, false
		if v, ok := ovr[f.Key]; ok {
			raw, overridden = v, true
		}
		val, err := DecodeScalar(f.ValueType, raw)
		if err != nil && overridden {
			// Bad override — fall back to the default.
			if dv, derr := DecodeScalar(f.ValueType, f.DefaultValue); derr == nil {
				flags[f.Key] = dv
				errs = append(errs, fmt.Errorf("flag %q: bad override %q, using default: %w", f.Key, raw, err))
				continue
			}
		}
		if err != nil {
			errs = append(errs, fmt.Errorf("flag %q: %w", f.Key, err))
			continue
		}
		flags[f.Key] = val
	}
	return flags, errs
}
