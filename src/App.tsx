import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { OpportunityMapPage } from "@/pages/OpportunityMapPage";
import { ClusterDetailPage } from "@/pages/ClusterDetailPage";

function Placeholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-xl border border-edge bg-panel p-8">
      <h1 className="text-lg font-semibold text-ink">{title}</h1>
      <p className="text-sm text-muted mt-2">{note}</p>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<OpportunityMapPage />} />
        <Route path="cluster/:slug" element={<ClusterDetailPage />} />
        <Route
          path="finder"
          element={
            <Placeholder
              title="Opportunity Finder"
              note="Milestone 5 — ranks clusters by Personalized Opportunity for the active team."
            />
          }
        />
        <Route
          path="explorer"
          element={
            <Placeholder
              title="Market Explorer"
              note="Search by tag / mechanic / theme / cluster / game (coming next)."
            />
          }
        />
        <Route
          path="team"
          element={
            <Placeholder
              title="Team Profile"
              note="Milestone 3 — 15 capability dimensions, constraints, scenarios."
            />
          }
        />
      </Route>
    </Routes>
  );
}
