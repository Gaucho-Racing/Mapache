import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { Mobile, initMobile } from "@/models/gr24/mobile";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card } from "@/components/ui/card";

function AltitudeGraphLiveWidget() {
  const [socketUrl] = React.useState("ws://localhost:10310/ws/gr24/mobile");
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<Mobile>(initMobile);
  const [data, setData] = useState([]);

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      data.altitude = Math.round(data.altitude);
      data.heading = Math.round(data.heading);
      setMessageJson(data);
      setData((prevData) => [...prevData.slice(-50), data]);
    }
  }, [lastMessage]);

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

  const testData = [
    {
      name: "Page A",
      uv: 4000,
      pv: 2400,
      amt: 2400,
    },
    {
      name: "Page B",
      uv: 3000,
      pv: 1398,
      amt: 2210,
    },
    {
      name: "Page C",
      uv: 2000,
      pv: 9800,
      amt: 2290,
    },
    {
      name: "Page D",
      uv: 2780,
      pv: 3908,
      amt: 2000,
    },
    {
      name: "Page E",
      uv: 1890,
      pv: 4800,
      amt: 2181,
    },
    {
      name: "Page F",
      uv: 2390,
      pv: 3800,
      amt: 2500,
    },
    {
      name: "Page G",
      uv: 3490,
      pv: 4300,
      amt: 2100,
    },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <Card className="px-4 py-2">
            <h5 className="text-center">{new Date(label).toLocaleString()}</h5>
            <div className="flex flex-row">
              <p className="pr-2 font-semibold text-gr-pink">Altitude:</p>
              <p className="pr-2 font-semibold text-gr-pink">
                {payload[0].value} m
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
            <h4 className="my-2">Altitude</h4>
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
                  scale={"linear"}
                  tick={{ fill: "gray" }}
                  domain={["dataMin", "dataMax"]}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="heading"
                  stroke="#e105a3"
                  strokeWidth={2}
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

export default AltitudeGraphLiveWidget;
