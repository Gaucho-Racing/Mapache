import Layout from "@/components/Layout";
import { BACKEND_URL } from "@/consts/config";
import { getAxiosErrorMessage } from "@/lib/axios-error-handler";
import { notify } from "@/lib/notify";
import { useVehicle } from "@/lib/store";
import axios from "axios";
import { useEffect, useState } from "react";

function QueryPage() {
  const vehicle = useVehicle();
  const [availableSignals, setAvailableSignals] = useState<any>([]);
  const [data, setData] = useState<any>([]);
  const [metadata, setMetadata] = useState<any>({});

  useEffect(() => {
    getAvailableSignals();
  }, [vehicle]);

  const getAvailableSignals = async () => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/query/signals?vehicle_type=${vehicle.type}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      if (response.status === 200) {
        setAvailableSignals(response.data.data);
      } else {
        notify.error(response.data.message);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  const queryData = async (params: String) => {
    try {
      const response = await axios.get(
        `${BACKEND_URL}/query/signals?${params}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("sentinel_access_token")}`,
          },
        },
      );
      if (response.status === 200) {
        setData(response.data.data);
        setMetadata(response.data.metadata);
      } else {
        notify.error(response.data.message);
      }
    } catch (error) {
      notify.error(getAxiosErrorMessage(error));
    }
  };

  return (
    <>
      <Layout activeTab="query" headerTitle="Query">
        <div className="flex flex-col justify-start">
          coming soon or some shit ™
        </div>
      </Layout>
    </>
  );
}

export default QueryPage;
