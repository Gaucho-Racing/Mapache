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
  id: "gr26-dev",
  name: "GR26 Dev",
  description: "GR26 development/test vehicle",
  type: "gr26",
  upload_key: 26026,
  updated_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};
