export interface Vehicle {
  id: string;
  name: string;
  description: string;
  type: string;
  upload_key: number;
  updated_at: string;
  created_at: string;
}

export const initVehicle = {
  id: "gr24-main",
  name: "GR24",
  description: "2024 Gaucho Racing EV Competition Vehicle",
  type: "gr24",
  upload_key: 12345,
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};
