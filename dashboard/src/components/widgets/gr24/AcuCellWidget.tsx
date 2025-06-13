import { useMemo, useState, useEffect } from "react";
import SignalWidget from "@/components/widgets/SignalWidget";
import { ReactFlow, useNodesState, useEdgesState } from "@xyflow/react";

interface AcuCellWidgetProps {
  vehicle_id: string;
  start_time: string;
  end_time: string;
  current_millis: number;
  showDeltaBanner?: boolean;
}

export default function AcuCellWidget({
  vehicle_id,
  start_time,
  end_time,
  current_millis,
  showDeltaBanner = false,
}: AcuCellWidgetProps) {
  const signals = [
    ...Array.from({ length: 128 }, (_, i) => `acu_cell${i}_temp`),
    ...Array.from({ length: 128 }, (_, i) => `acu_cell${i}_voltage`),
  ];

  const maxVoltage = 4.2;

  // Memoize the initial node structure (positions and static data)
  const initialNodes = useMemo(() => {
    const cellsPerGroup = 16;
    const columnsPerGroup = 2;
    const cellWidth = 100;
    const cellHeight = 100;
    const groupWidth = columnsPerGroup * cellWidth;
    const groupSpacing = 20;

    const nodes = [];
    for (let i = 0; i < 128; i++) {
      const groupIndex = Math.floor(i / cellsPerGroup);
      const groupOffsetX = groupIndex * (groupWidth + groupSpacing);
      const localIndex = i % cellsPerGroup;
      const column = localIndex % columnsPerGroup;
      const row = Math.floor(localIndex / columnsPerGroup);

      nodes.push({
        id: `cell${i}`,
        type: "cell",
        data: {
          label: `Cell ${i}`,
          voltage: 0,
          temp: 0,
        },
        position: {
          x: 20 + groupOffsetX + column * cellWidth,
          y: 20 + row * cellHeight,
        },
      });
    }
    return nodes;
  }, []); // Only calculate once

  const initialEdges: any[] = [];

  // Use ReactFlow's state management hooks
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, onEdgesChange] = useEdgesState(initialEdges);

  // State to hold current signal data
  const [currentSignalData, setCurrentSignalData] = useState<any>({});

  // Update nodes when signal data changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const cellIndex = parseInt(node.id.replace("cell", ""));
        const voltage = currentSignalData[`acu_cell${cellIndex}_voltage`] || 0;
        const temp = currentSignalData[`acu_cell${cellIndex}_temp`] || 0;

        // Create a new node object for ReactFlow to detect changes
        return {
          ...node,
          data: {
            ...node.data,
            voltage: voltage.toFixed(2),
            temp: temp.toFixed(2),
          },
        };
      }),
    );
  }, [currentSignalData, setNodes]);

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

  const getVoltageBackgroundColor = (voltage: number) => {
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

  return (
    <SignalWidget
      vehicle_id={vehicle_id}
      start_time={start_time}
      end_time={end_time}
      current_millis={current_millis}
      signals={signals}
      showDeltaBanner={showDeltaBanner}
      width={1000}
      height={500}
    >
      {(_, currentSignals) => {
        // Update signal data state, which will trigger the useEffect to update nodes
        setCurrentSignalData(currentSignals);

        return (
          <div className="h-full w-full p-4">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              nodesDraggable={false}
              defaultViewport={{ x: 0, y: 0, zoom: 0.55 }}
              proOptions={{ hideAttribution: true }}
            ></ReactFlow>
          </div>
        );
      }}
    </SignalWidget>
  );
}
