import Layout from "@/components/Layout";
import TcmResourceOverviewWidget from "@/components/widgets/gr25/live/TcmResourceOverviewWidget";
import TcmCpuWidget from "./components/widgets/gr25/live/TcmCpuWidget";
import { TimeProvider } from "./context/time-context";
import TcmCpuGraphWidget from "./components/widgets/gr25/live/TcmCpuGraphWidget";

function App() {
  return (
    <TimeProvider interval={100}>
      <Layout activeTab="dashboard" headerTitle="Dashboard">
        <div className="flex flex-col justify-start">
          coming soon or some shit ™
          <TcmResourceOverviewWidget vehicle_id="gr25-test" showDeltaBanner />
          <TcmCpuWidget vehicle_id="gr25-test" showDeltaBanner />
          <TcmCpuGraphWidget vehicle_id="gr25-test" showDeltaBanner />
        </div>
      </Layout>
    </TimeProvider>
  );
}

export default App;
