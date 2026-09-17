import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDataset } from "@/state/useDataset";
import { useActiveTeam, useTeamStore } from "@/state/teamStore";
import { computePersonalizedOpportunity, computeTeamFit } from "@/lib/teamFit";
import type { RequirementProfile } from "@/types/dataset";

const SCOPE_ORDER: RequirementProfile["scopeClass"][] = [
  "Micro",
  "Small",
  "Medium",
  "Large",
  "Very Large",
];

function tone(v: number) {
  return v >= 70 ? "text-emerald-300" : v >= 45 ? "text-amber-300" : "text-rose-300";
}

export function OpportunityFinderPage() {
  const { dataset } = useDataset();
  const team = useActiveTeam();
  const { profiles, activeId, setActive, cloneActive } = useTeamStore();
  const navigate = useNavigate();

  const [minTeamFit, setMinTeamFit] = useState(0);
  const [minDemand, setMinDemand] = useState(0);
  const [maxSupply, setMaxSupply] = useState(100);
  const [minGrowth, setMinGrowth] = useState(0);
  const [singleplayerOnly, setSingleplayerOnly] = useState(false);
  const [maxScope, setMaxScope] = useState<RequirementProfile["scopeClass"]>("Very Large");
  const [compare, setCompare] = useState<string[]>([]);

  const ranked = useMemo(() => {
    if (!dataset) return [];
    return dataset.clusters
      .map((c) => {
        const fit = computeTeamFit(team, c);
        const po = computePersonalizedOpportunity(team, c, fit);
        return { c, fit, po };
      })
      .filter(({ c, fit }) => {
        if (fit.teamFit < minTeamFit) return false;
        if (c.demandScore.value < minDemand) return false;
        if (c.supplyPressureScore.value > maxSupply) return false;
        if (c.demandGrowthScore.value < minGrowth) return false;
        if (singleplayerOnly && (c.requirementProfile.values.networking ?? 0) >= 3)
          return false;
        if (
          SCOPE_ORDER.indexOf(c.requirementProfile.scopeClass) >
          SCOPE_ORDER.indexOf(maxScope)
        )
          return false;
        return true;
      })
      .sort((a, b) => b.po.personalizedOpportunity - a.po.personalizedOpportunity);
  }, [dataset, team, minTeamFit, minDemand, maxSupply, minGrowth, singleplayerOnly, maxScope]);

  function toggleCompare(slug: string) {
    setCompare((cur) =>
      cur.includes(slug)
        ? cur.filter((s) => s !== slug)
        : cur.length >= 5
          ? cur
          : [...cur, slug],
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-ink">Opportunity Finder</h1>
          <p className="text-sm text-muted">
            Markets ranked by Personalized Opportunity for the active team — these are
            markets deserving deeper investigation, not predictions of success.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <select value={activeId} onChange={(e) => setActive(e.target.value)} className="bg-panel border border-edge rounded px-2 py-1.5 text-ink">
            {Object.values(profiles).map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button onClick={() => cloneActive()} className="px-3 py-1.5 rounded border border-edge text-ink hover:bg-panel2">
            Clone scenario
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-muted">
        {[
          ["Min Team Fit", minTeamFit, setMinTeamFit, 0, 100],
          ["Min Demand", minDemand, setMinDemand, 0, 100],
          ["Max Supply", maxSupply, setMaxSupply, 0, 100],
          ["Min Growth", minGrowth, setMinGrowth, 0, 100],
        ].map(([label, val, setter, lo, hi]) => (
          <label key={label as string} className="flex items-center gap-1.5">
            {label as string}
            <input
              type="range"
              min={lo as number}
              max={hi as number}
              step={5}
              value={val as number}
              onChange={(e) => (setter as (n: number) => void)(Number(e.target.value))}
              className="accent-sky-400"
            />
            <span className="tabular-nums text-ink w-6">{val as number}</span>
          </label>
        ))}
        <label className="flex items-center gap-1.5">
          Max scope
          <select value={maxScope} onChange={(e) => setMaxScope(e.target.value as RequirementProfile["scopeClass"])} className="bg-panel border border-edge rounded px-2 py-1 text-ink">
            {SCOPE_ORDER.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <button
          onClick={() => setSingleplayerOnly((v) => !v)}
          className={`px-2 py-1 rounded border ${singleplayerOnly ? "border-sky-500 text-sky-300" : "border-edge text-muted"}`}
        >
          Singleplayer only
        </button>
        {compare.length >= 2 && (
          <button
            onClick={() => navigate(`/compare?slugs=${compare.join(",")}`)}
            className="ml-auto px-3 py-1 rounded bg-sky-600/80 text-white hover:bg-sky-600"
          >
            Compare {compare.length} →
          </button>
        )}
      </div>

      <div className="rounded-xl border border-edge bg-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] text-muted border-b border-edge">
              <th className="py-2 px-3 font-medium">#</th>
              <th className="py-2 px-3 font-medium">Market</th>
              <th className="py-2 px-3 font-medium text-right">Personal Opp.</th>
              <th className="py-2 px-3 font-medium text-right">Attractiveness</th>
              <th className="py-2 px-3 font-medium text-right">Team Fit</th>
              <th className="py-2 px-3 font-medium text-right">Timing</th>
              <th className="py-2 px-3 font-medium text-right">Demand</th>
              <th className="py-2 px-3 font-medium text-right">Supply</th>
              <th className="py-2 px-3 font-medium">Scope</th>
              <th className="py-2 px-3 font-medium text-center">Cmp</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ c, fit, po }, i) => (
              <tr key={c.id} className="border-b border-edge/40 hover:bg-panel2/40">
                <td className="py-2 px-3 text-muted tabular-nums">{i + 1}</td>
                <td className="py-2 px-3">
                  <Link to={`/cluster/${c.slug}`} className="text-ink hover:text-sky-300">
                    {c.name}
                  </Link>
                  {po.cap != null && (
                    <span className="ml-2 text-[10px] text-rose-300" title={po.capReason ?? ""}>
                      capped
                    </span>
                  )}
                </td>
                <td className={`py-2 px-3 text-right tabular-nums font-semibold ${tone(po.personalizedOpportunity)}`}>
                  {po.personalizedOpportunity}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-muted">{c.marketAttractivenessScore.value}</td>
                <td className={`py-2 px-3 text-right tabular-nums ${tone(fit.teamFit)}`} title={fit.gate}>
                  {Math.round(fit.teamFit)}
                </td>
                <td className="py-2 px-3 text-right tabular-nums text-muted">{c.timingScore.value}</td>
                <td className="py-2 px-3 text-right tabular-nums text-muted">{c.demandScore.value}</td>
                <td className="py-2 px-3 text-right tabular-nums text-muted">{c.supplyPressureScore.value}</td>
                <td className="py-2 px-3 text-muted">{c.requirementProfile.scopeClass}</td>
                <td className="py-2 px-3 text-center">
                  <input
                    type="checkbox"
                    checked={compare.includes(c.slug)}
                    onChange={() => toggleCompare(c.slug)}
                    className="accent-sky-500"
                  />
                </td>
              </tr>
            ))}
            {ranked.length === 0 && (
              <tr>
                <td colSpan={10} className="py-6 text-center text-muted">
                  No markets match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
