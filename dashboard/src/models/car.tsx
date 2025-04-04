export interface Vehicle {
  id: string;
  name: string;
  description: string;
  type: string;
  upload_key: string;
  updated_at: Date;
  created_at: Date;
}

export const initVehicle = {
  id: "gr24-main",
  name: "GR24 Prod",
  description: "Gaucho Racing's 2024 EV Racecar",
  type: "gr24",
  upload_key: "",
  updated_at: new Date(),
  created_at: new Date(),
};
