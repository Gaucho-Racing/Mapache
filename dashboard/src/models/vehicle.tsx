export interface Vehicle {
  id: string;
  name: string;
  description: string;
  type: string;
  upload_key: number;
  updated_at: string;
  created_at: string;
}

export const initVehicle: Vehicle = {
  id: "",
  name: "",
  description: "",
  type: "",
  upload_key: 0,
  updated_at: "",
  created_at: "",
};
