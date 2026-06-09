export type ConfigValueType = "bool" | "int" | "float" | "string";

// Flag definition for a vehicle type. default_value/value are JSON-encoded
// scalars (e.g. "true", "42", "\"front\"") matching value_type.
export interface ConfigFlag {
  vehicle_type: string;
  key: string;
  value_type: ConfigValueType;
  default_value: string;
  description: string;
  updated_at: string;
  created_at: string;
}

export interface VehicleConfigOverride {
  vehicle_id: string;
  key: string;
  value: string;
  updated_at: string;
  created_at: string;
}

// Effective config the car pulls. flags is the resolved map keyed by flag key.
export interface ConfigSnapshot {
  vehicle_id: string;
  generated_at: string;
  flags: Record<string, unknown>;
}

export interface ConfigStatus {
  vehicle_id: string;
  in_sync: boolean;
  config_updated_at: string;
  last_synced_at: string;
}

export interface VehicleTypeInfo {
  value: string;
  label: string;
}
