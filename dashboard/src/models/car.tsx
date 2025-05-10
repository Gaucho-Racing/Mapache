export interface Vehicle {
  id: string;
  name: string;
  description: string;
  type: string;
  upload_key: number;
  updated_at: Date;
  created_at: Date;
}

export const initVehicle = {
  id: "gr24",
  name: "GR24",
  description: "2024 Gaucho Racing EV Competition Vehicle",
  type: "gr24",
  upload_key: 12345,
  updated_at: new Date(),
  created_at: new Date(),
};
