export interface Signal {
  timestamp: number;
  vehicle_id: string;
  name: string;
  value: number;
  raw_value: number;
  produced_at: string;
  created_at: string;
}

export const initSignal: Signal = {
  timestamp: 0,
  vehicle_id: "",
  name: "",
  value: 0,
  raw_value: 0,
  produced_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
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
