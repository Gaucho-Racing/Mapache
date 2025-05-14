import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { BACKEND_URL } from "@/consts/config";
import { notify } from "@/lib/notify";
import { useVehicle } from "@/lib/store";
import axios from "axios";
import { useEffect, useState } from "react";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { Trip } from "@/models/trip";
import { useNavigate } from "react-router-dom";

function TripsPage() {
  const vehicle = useVehicle();
  const [tripList, setTripList] = useState<Trip[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    getTrips();
  }, []);

  const getTrips = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/trips?vehicle_id=${vehicle.id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      if (response.status == 200) {
        const trips = response.data.data.filter(
          (trip: Trip) => trip.vehicle_id === vehicle.id,
        );
        trips.sort(
          (a: Trip, b: Trip) =>
            new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
        );
        setTripList(trips);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  return (
    <>
      <Layout activeTab="trips" headerTitle="Trips">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex justify-end"></div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tripList.map((trip) => (
              <div key={trip.id.toString()}>
                <Card
                  className="h-full w-full p-2 transition-all duration-150 hover:scale-[1.02] hover:cursor-pointer hover:bg-card"
                  onClick={() => {
                    navigate(`/trips/${trip.id}`);
                  }}
                >
                  <div className="relative">
                    <div className="absolute right-1 top-1">
                      <Card className="rounded-md bg-gradient-to-br from-gr-pink to-gr-purple px-2 py-1 text-xs font-medium text-white">
                        {/* {trip.vehicle_id} */}
                      </Card>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-2">
                        <img
                          src={`/icons/cars/${vehicle.type}-pixel.png`}
                          className="h-14 w-14 object-contain"
                        />
                      </div>
                      <div className="w-full">
                        <h4>{trip.name}</h4>
                        <p className="text-gray-400">{trip.description}</p>
                        <Separator className="my-2" />
                        <p className="text-sm text-white/80">
                          {new Date(trip.start_time).toLocaleString()} -{" "}
                          {new Date(trip.end_time).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    </>
  );
}

export default TripsPage;
