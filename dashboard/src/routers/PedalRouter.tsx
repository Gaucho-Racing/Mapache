import PedalDetailsPage from "@/pages/pedal/PedalDetailsPage";
import { Route, Routes } from "react-router-dom";

export const PedalRouter = () => {
  return (
    <Routes>
      <Route path="/pedal" element={<PedalDetailsPage />} />
    </Routes>
  );
};

export default PedalRouter;
