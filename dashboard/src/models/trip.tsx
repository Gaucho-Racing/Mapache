/*
{
      "id": "4",
      "vehicle_id": "gr24",
      "name": "shootoutJackson",
      "description": "",
      "start_time": "2024-11-10T21:07:43Z",
      "end_time": "2024-11-10T21:09:47Z",
      "laps": []
    },
*/

export interface Trip {
  id: string;
  vehicle_id: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  laps: Lap[];
}

export interface Lap {
  id: string;
  trip_id: string;
  name: string;
  timestamp: string;
}

export const initTrip: Trip = {
  id: "",
  vehicle_id: "",
  name: "",
  description: "",
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString(),
  laps: [],
};

export const initLap: Lap = {
  id: "",
  trip_id: "",
  name: "",
  timestamp: new Date().toISOString(),
};
