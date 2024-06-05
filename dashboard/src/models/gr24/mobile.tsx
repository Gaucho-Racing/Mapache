export interface Mobile {
  id: string;
  vehicle_id: string;
  created_at: Date;
  latitude: number;
  longitude: number;
  altitude: number;
  speed: number;
  heading: number;
  accelerometer_x: number;
  accelerometer_y: number;
  accelerometer_z: number;
  gyroscope_x: number;
  gyroscope_y: number;
  gyroscope_z: number;
  magnetometer_x: number;
  magnetometer_y: number;
  magnetometer_z: number;
  battery: number;
  millis: number;
}

export const initMobile = {
  id: "",
  vehicle_id: "",
  created_at: new Date(),
  latitude: 0,
  longitude: 0,
  altitude: 0,
  speed: 0,
  heading: 0,
  accelerometer_x: 0,
  accelerometer_y: 0,
  accelerometer_z: 0,
  gyroscope_x: 0,
  gyroscope_y: 0,
  gyroscope_z: 0,
  magnetometer_x: 0,
  magnetometer_y: 0,
  magnetometer_z: 0,
  battery: 0,
  millis: 0,
};
