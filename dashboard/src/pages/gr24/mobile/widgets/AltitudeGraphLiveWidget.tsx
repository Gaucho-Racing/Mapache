import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";
import { MAPACHE_WS_URL } from "@/consts/config";
import { Mobile } from "@/models/gr24/mobile";

function GraphLiveWidget({ field }: { field: string }) {
  const [socketUrl] = React.useState(`${MAPACHE_WS_URL}/ws/gr24/mobile`);
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [data, setData] = useState<Mobile[]>([]);

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      data.altitude = Math.round(data.altitude);
      data.heading = Math.round(data.heading);
      data.accelerometer_x = (data.accelerometer_x / 9.80665).toFixed(6);
      data.accelerometer_y = (data.accelerometer_y / 9.80665).toFixed(6);
      data.accelerometer_z = (data.accelerometer_z / 9.80665).toFixed(6);
      setData((prevData) => [...prevData.slice(-50), data]);
    }
  }, [lastMessage]);

  function getChartTitle() {
    switch (field) {
      case "latitude":
        return "Latitude";
      case "longitude":
        return "Longitude";
      case "altitude":
        return "Altitude";
      case "heading":
        return "Heading";
      case "speed":
        return "Speed";
      case "accelerometer_x":
        return "Acceleration X";
      case "accelerometer_y":
        return "Acceleration Y";
      case "accelerometer_z":
        return "Acceleration Z";
      case "gyroscope_x":
        return "Gyroscope X";
      case "gyroscope_y":
        return "Gyroscope Y";
      case "gyroscope_z":
        return "Gyroscope Z";
      case "magnetometer_x":
        return "Magnetometer X";
      case "magnetometer_y":
        return "Magnetometer Y";
      case "magnetometer_z":
        return "Magnetometer Z";
      case "battery":
        return "Battery";
      case "millis":
        return "Millis";
      default:
        return "Invalid Field";
    }
  }

  function getYAxisDomain() {
    switch (field) {
      case "heading":
        return [0, 360];
      case "accelerometer_x":
        return [-3, 3];
      case "accelerometer_y":
        return [-3, 3];
      case "accelerometer_z":
        return [-3, 3];
      case "gyroscope_x":
        return [-1, 1];
      case "gyroscope_y":
        return [-1, 1];
      case "gyroscope_z":
        return [-1, 1];
      case "battery":
        return [0, 100];
      default:
        return ["dataMin", "dataMax"];
    }
  }

  const LoadingComponent = () => {
    if (readyState === ReadyState.CONNECTING) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
          <p className="mt-2 text-neutral-400">Connecting...</p>
        </div>
      );
    } else if (readyState === ReadyState.CLOSED) {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <FontAwesomeIcon
            icon={faCircleXmark}
            className="mr-2 h-8 w-8 text-red-500"
          />
          <p className="mt-2 text-neutral-400">Connection Closed</p>
        </div>
      );
    } else {
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        </div>
      );
    }
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active: boolean;
    payload: any[];
    label: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <Card className="px-4 py-2">
            <h5 className="text-center">{new Date(label).toLocaleString()}</h5>
            <div className="flex flex-row">
              <p className="pr-2 font-semibold text-gr-pink">
                {getChartTitle()}:
              </p>
              <p className="pr-2 font-semibold text-gr-pink">
                {payload[0].value}
              </p>
            </div>
          </Card>
        </div>
      );
    }
    return null;
  };

  return (
    <>
      <div className="h-full w-full">
        {lastMessage ? (
          <div className="mx-2 text-center">
            <h4 className="my-2">{getChartTitle()}</h4>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                width={500}
                height={300}
                data={data}
                margin={{ left: -20, right: 10 }}
              >
                <CartesianGrid strokeDasharray="4 3" stroke="#343434" />
                <XAxis
                  dataKey="created_at"
                  stroke="white"
                  tick={{ fill: "gray" }}
                  tickFormatter={(timestamp) =>
                    new Date(timestamp).toLocaleTimeString()
                  }
                />
                <YAxis
                  stroke="white"
                  tick={{ fill: "gray" }}
                  domain={getYAxisDomain()}
                  allowDataOverflow={true}
                />
                <Tooltip
                  content={
                    <CustomTooltip active={false} payload={[]} label={""} />
                  }
                />
                <Line
                  type="monotone"
                  dataKey={field}
                  stroke="#e105a3"
                  strokeWidth={2}
                  animateNewValues={false}
                />
                {/* <Line type="monotone" dataKey="altitude" stroke="#82ca9d" /> */}
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <LoadingComponent />
        )}
      </div>
    </>
  );
}

export default GraphLiveWidget;
