import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleXmark } from "@fortawesome/free-regular-svg-icons";
import { Mobile, initMobile } from "@/models/gr24/mobile";
import { MAPACHE_WS_URL } from "@/consts/config";
import {
  ACU,
  getSegments,
  initACU,
  setRandomTemps,
  setRandomVoltages,
} from "@/models/gr24/acu";
import ReactFlow, { Handle, Position } from "reactflow";

function SegmentLiveWidget() {
  const [socketUrl] = React.useState(`${MAPACHE_WS_URL}/ws/gr24/acu`);
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<ACU>(initACU);

  const messageJsonRef = useRef(messageJson);

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  const maxVoltage = 4.2 * 16;

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      setMessageJson(data);
    }
  }, [lastMessage]);

  useEffect(() => {
    messageJsonRef.current = messageJson;
  }, [messageJson]);

  useEffect(() => {
    const interval = setInterval(() => {
      createSegments(messageJsonRef.current); // Always gets current value
    }, 1000);

    return () => clearInterval(interval);
  }, []); // Empty dependency array is fine now

  const nodeTypes = useMemo(() => {
    return {
      segment: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border text-xl font-bold text-white"
            style={{
              width: 125,
              height: 250,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              className={`absolute ${getVoltageBackgroundColor(data.voltage)} bottom-0 opacity-25`}
              style={{
                width: 125,
                height: `${(data.voltage / maxVoltage) * 100}%`,
                transition: "height 0.3s ease",
                zIndex: 0,
              }}
            />
            <div
              className="text-center"
              style={{ position: "relative", zIndex: 1 }}
            >
              <h4>{data.label}</h4>
              <div>{`${data.voltage} V`}</div>
              <div className={`${getTempColor(data.temp)}`}>
                {`${data.temp} °C`}
              </div>
            </div>
          </div>
        );
      },
    };
  }, []);

  const getVoltageBackgroundColor = (voltage) => {
    const fraction = voltage / maxVoltage;
    if (fraction < 0.2) {
      return "bg-red-400";
    } else if (fraction < 0.4) {
      return "bg-yellow-400";
    } else {
      return "bg-green-400";
    }
  };

  const getTempColor = (temp: number) => {
    if (temp < 45) {
      return "text-green-400";
    } else if (temp < 60) {
      return "text-yellow-400";
    } else {
      return "text-red-400";
    }
  };

  function createSegments(data: ACU) {
    for (let i = 0; i < 8; i++) {
      const segment = {
        id: `segment${i}`,
        type: "segment",
        data: {
          label: `Segment ${i}`,
          voltage: (getSegments(data) as any)[`segment${i}_voltage_sum`].toFixed(
            2,
          ),
          temp: (getSegments(data) as any)[`segment${i}_temp`].toFixed(2),
        },
        position: {
          x: 20 * (i + 1) + i * 125,
          y: 20,
        },
      };
      setNodes((nodes) => [...nodes, segment]);
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

  return (
    <>
      <div className="h-full w-full">
        {lastMessage ? (
          <div style={{ height: "100%", width: "100%" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              proOptions={{ hideAttribution: true }}
            ></ReactFlow>
          </div>
        ) : (
          <LoadingComponent />
        )}
      </div>
    </>
  );
}

export default SegmentLiveWidget;
