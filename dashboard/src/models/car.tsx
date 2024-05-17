export interface Vehicle {
  id: string;
  name: string;
  description: string;
  type: string;
  updatedAt: Date;
  createdAt: Date;
}

export const initVehicle = {
  id: "",
  name: "",
  description: "",
  type: "gr24",
  updatedAt: new Date(),
  createdAt: new Date(),
};
