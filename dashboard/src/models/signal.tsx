export interface Signal {
  timestamp: Number;
  vehicle_id: String;
  name: String;
  value: Number;
  raw_value: Number;
  produced_at: Date;
  created_at: Date;
}

export const initSignal: Signal = {
  timestamp: 0,
  vehicle_id: "",
  name: "",
  value: 0,
  raw_value: 0,
  produced_at: new Date(),
  created_at: new Date(),
};

export interface SignalDefinition {
  id: string;
  vehicle_type: string;
  name: string;
  description: string;
}

export const initSignalDefinition: SignalDefinition = {
  id: "",
  vehicle_type: "",
  name: "",
  description: "",
};
