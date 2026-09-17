import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { OpportunityMapPage } from "@/pages/OpportunityMapPage";
import { ClusterDetailPage } from "@/pages/ClusterDetailPage";
import { OpportunityFinderPage } from "@/pages/OpportunityFinderPage";
import { TeamProfilePage } from "@/pages/TeamProfilePage";
import { ComparePage } from "@/pages/ComparePage";
import { MarketExplorerPage } from "@/pages/MarketExplorerPage";
import { ConceptValidatorPage } from "@/pages/ConceptValidatorPage";
import { HiddenDemandPage } from "@/pages/HiddenDemandPage";

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OpportunityMapPage />} />
        <Route path="cluster/:slug" element={<ClusterDetailPage />} />
        <Route path="finder" element={<OpportunityFinderPage />} />
        <Route path="hidden" element={<HiddenDemandPage />} />
        <Route path="explorer" element={<MarketExplorerPage />} />
        <Route path="team" element={<TeamProfilePage />} />
        <Route path="validator" element={<ConceptValidatorPage />} />
        <Route path="compare" element={<ComparePage />} />
      </Route>
    </Routes>
  );
}
