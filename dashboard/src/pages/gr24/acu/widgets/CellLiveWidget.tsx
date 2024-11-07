import { Loader2 } from "lucide-react";
import useWebSocket, { ReadyState } from "react-use-websocket";
import React, { useEffect, useMemo, useState } from "react";
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

function CellLiveWidget() {
  const [socketUrl] = React.useState(`${MAPACHE_WS_URL}/ws/gr24/acu`);
  const { lastMessage, readyState } = useWebSocket(socketUrl);
  const [messageJson, setMessageJson] = useState<ACU>(initACU);

  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);

  const maxVoltage = 4.2;

  useEffect(() => {
    if (lastMessage !== null) {
      const data = JSON.parse(lastMessage.data);
      setMessageJson(data);
    }
  }, [lastMessage]);

  useEffect(() => {
    const interval = setInterval(() => {
      // setRandomVoltages(messageJson);
      // setRandomTemps(messageJson);
      setMessageJson({ ...messageJson });
      createSegments();
    }, 1000);

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  const nodeTypes = useMemo(() => {
    return {
      cell: ({ data }: { data: any }) => {
        return (
          <div
            className="border-primary-500 flex items-center justify-center rounded-md border text-xl font-bold text-white"
            style={{
              width: 100,
              height: 100,
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

  function createSegments() {
    const cellsPerGroup = 16;
    const columnsPerGroup = 2;
    const cellWidth = 100;
    const cellHeight = 100;
    const groupWidth = columnsPerGroup * cellWidth;
    const groupSpacing = 20;

    for (let i = 0; i < 128; i++) {
      const groupIndex = Math.floor(i / cellsPerGroup);
      const groupOffsetX = groupIndex * (groupWidth + groupSpacing);
      const localIndex = i % cellsPerGroup;
      const column = localIndex % columnsPerGroup;
      const row = Math.floor(localIndex / columnsPerGroup);

      const cell = {
        id: `cell${i}`,
        type: "cell",
        data: {
          label: `Cell ${i}`,
          voltage: messageJson[`cell${i}_voltage`].toFixed(2),
          temp: messageJson[`cell${i}_temp`].toFixed(2),
        },
        position: {
          x: 20 + groupOffsetX + column * cellWidth,
          y: 20 + row * cellHeight,
        },
      };
      setNodes((nodes) => [...nodes, cell]);
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
        {!lastMessage ? (
          <div style={{ height: "100%", width: "100%" }}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              defaultViewport={{ x: 0, y: 0, zoom: 0.675 }}
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

export default CellLiveWidget;
