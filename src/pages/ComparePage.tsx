import { Link, useSearchParams } from "react-router-dom";
import { useDataset } from "@/state/useDataset";
import { useActiveTeam } from "@/state/teamStore";
import { computePersonalizedOpportunity, computeTeamFit } from "@/lib/teamFit";
import type { MarketCluster } from "@/types/dataset";

export function ComparePage() {
  const { dataset } = useDataset();
  const team = useActiveTeam();
  const [params] = useSearchParams();
  const slugs = (params.get("slugs") ?? "").split(",").filter(Boolean);

  if (!dataset) return <div className="text-muted">Loading…</div>;
  const clusters = slugs
    .map((s) => dataset.clusters.find((c) => c.slug === s))
    .filter((c): c is MarketCluster => !!c);

  if (clusters.length < 2)
    return (
      <div className="text-muted">
        Select 2–5 markets in the{" "}
        <Link to="/finder" className="text-sky-400">Opportunity Finder</Link> to compare.
      </div>
    );

  const rows: { label: string; get: (c: MarketCluster) => string | number }[] = [
    { label: "Demand", get: (c) => c.demandScore.value },
    { label: "Supply Pressure", get: (c) => c.supplyPressureScore.value },
    { label: "Demand Growth", get: (c) => c.demandGrowthScore.value },
    { label: "Success Breadth", get: (c) => c.successBreadthScore.value },
    { label: "Market Attractiveness", get: (c) => c.marketAttractivenessScore.value },
    { label: "Gap", get: (c) => c.gapScore.value },
    { label: "Timing", get: (c) => c.timingScore.value },
    { label: "Confidence", get: (c) => c.confidenceScore },
    { label: "Concentration", get: (c) => c.concentration.band },
    { label: "Scope", get: (c) => c.requirementProfile.scopeClass },
    { label: "Team Fit", get: (c) => Math.round(computeTeamFit(team, c).teamFit) },
    {
      label: "Personal Opportunity",
      get: (c) => computePersonalizedOpportunity(team, c).personalizedOpportunity,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/finder" className="text-xs text-sky-400 hover:underline">← Finder</Link>
        <h1 className="text-lg font-semibold text-ink mt-1">Compare Markets</h1>
        <p className="text-sm text-muted">
          Side-by-side for the active team ({team.name}). No market is declared a winner —
          the right choice depends on your strategy.
        </p>
      </div>

      <div className="rounded-xl border border-edge bg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-edge">
              <th className="py-2 px-3 text-left text-[11px] text-muted font-medium">Metric</th>
              {clusters.map((c) => (
                <th key={c.id} className="py-2 px-3 text-right text-ink font-medium">
                  <Link to={`/cluster/${c.slug}`} className="hover:text-sky-300">{c.name}</Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-edge/40">
                <td className="py-2 px-3 text-muted">{r.label}</td>
                {clusters.map((c) => (
                  <td key={c.id} className="py-2 px-3 text-right tabular-nums text-ink">
                    {r.get(c)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
