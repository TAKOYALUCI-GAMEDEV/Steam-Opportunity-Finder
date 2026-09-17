import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { OpportunityMapPage } from "@/pages/OpportunityMapPage";
import { ClusterDetailPage } from "@/pages/ClusterDetailPage";
import { OpportunityFinderPage } from "@/pages/OpportunityFinderPage";
import { TeamProfilePage } from "@/pages/TeamProfilePage";
import { ComparePage } from "@/pages/ComparePage";
import { MarketExplorerPage } from "@/pages/MarketExplorerPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OpportunityMapPage />} />
        <Route path="cluster/:slug" element={<ClusterDetailPage />} />
        <Route path="finder" element={<OpportunityFinderPage />} />
        <Route path="explorer" element={<MarketExplorerPage />} />
        <Route path="team" element={<TeamProfilePage />} />
        <Route path="compare" element={<ComparePage />} />
      </Route>
    </Routes>
  );
}
