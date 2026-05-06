import Layout from "@/components/Layout";
import TcmResourceOverviewWidget from "@/components/widgets/gr25/live/TcmResourceOverviewWidget";
import TcmCpuWidget from "./components/widgets/gr25/live/TcmCpuWidget";
import TcmCpuGraphWidget from "./components/widgets/gr25/live/TcmCpuGraphWidget";
import Gr25EcuDebugWidget from "./components/widgets/gr25/live/EcuDebugWidget";
import Gr25InverterDebugWidget from "./components/widgets/gr25/live/InverterDebugWidget";
import Gr26EcuDebugWidget from "./components/widgets/gr26/live/EcuDebugWidget";
import Gr26BcuDebugWidget from "./components/widgets/gr26/live/BcuDebugWidget";
import Gr26DtiDebugWidget from "./components/widgets/gr26/live/DtiDebugWidget";
import Gr26InverterDebugWidget from "./components/widgets/gr26/live/InverterDebugWidget";
import { TimeProvider } from "./context/time-context";
import { useVehicle } from "./lib/store";

function DashboardContent() {
  const vehicle = useVehicle();

  const widgets = (() => {
    switch (vehicle.type) {
      case "gr25":
        return (
          <>
            <TcmResourceOverviewWidget
              vehicle_id={vehicle.id}
              showDeltaBanner
            />
            <TcmCpuWidget vehicle_id={vehicle.id} showDeltaBanner />
            <TcmCpuGraphWidget vehicle_id={vehicle.id} showDeltaBanner />
            <Gr25EcuDebugWidget vehicle_id={vehicle.id} showDeltaBanner />
            <Gr25InverterDebugWidget vehicle_id={vehicle.id} showDeltaBanner />
          </>
        );
      case "gr26":
        return (
          <>
            <TcmResourceOverviewWidget
              vehicle_id={vehicle.id}
              showDeltaBanner
            />
            <TcmCpuWidget vehicle_id={vehicle.id} showDeltaBanner />
            <TcmCpuGraphWidget vehicle_id={vehicle.id} showDeltaBanner />
            <Gr26EcuDebugWidget vehicle_id={vehicle.id} showDeltaBanner />
            <Gr26BcuDebugWidget vehicle_id={vehicle.id} showDeltaBanner />
            <Gr26DtiDebugWidget vehicle_id={vehicle.id} showDeltaBanner />
            <Gr26InverterDebugWidget vehicle_id={vehicle.id} showDeltaBanner />
          </>
        );
      default:
        return (
          <div className="text-sm text-muted-foreground">
            No live widgets configured for vehicle type{" "}
            <span className="font-mono">{vehicle.type || "(none)"}</span>.
          </div>
        );
    }
  })();

  return (
    <Layout activeTab="dashboard" headerTitle="Dashboard">
      <div className="flex flex-col gap-4">{widgets}</div>
    </Layout>
  );
}

function App() {
  return (
    <TimeProvider interval={100}>
      <DashboardContent />
    </TimeProvider>
  );
}

export default App;
