import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useDataset } from "@/state/useDataset";
import { useActiveTeam, useTeamStore } from "@/state/teamStore";
import { computeHiddenOpportunityForTeam } from "@/lib/hiddenOpportunity";
import type { MarketCluster } from "@/types/dataset";
import type { SleeperMarketType } from "@/types/scores";

const SLEEPER_LABEL: Record<SleeperMarketType, string> = {
  repeatable_hidden_demand: "Repeatable",
  first_proof_market: "First Proof",
  single_hit_anomaly: "Single Hit",
  established_niche: "Established",
  dead_niche: "Dead Niche",
  insufficient_evidence: "Insufficient",
};
const SLEEPER_COLOR: Record<SleeperMarketType, string> = {
  repeatable_hidden_demand: "text-emerald-300 border-emerald-500/40",
  first_proof_market: "text-sky-300 border-sky-500/40",
  single_hit_anomaly: "text-amber-300 border-amber-500/40",
  established_niche: "text-slate-300 border-edge",
  dead_niche: "text-rose-300 border-rose-500/40",
  insufficient_evidence: "text-muted border-edge",
};

interface Filters {
  minHD: number;
  minConfidence: number;
  maxSupplyPressure: number;
  minOutperformers: number;
  minRepeatability: number;
  excludeHighConcentration: boolean;
  minTeamFit: number;
  experimental: boolean;
}
const DEFAULT_FILTERS: Filters = {
  minHD: 0, minConfidence: 0, maxSupplyPressure: 100, minOutperformers: 0,
  minRepeatability: 0, excludeHighConcentration: false, minTeamFit: 0, experimental: false,
};

const PRESETS: Record<string, Partial<Filters>> = {
  "Hidden Gems": { minHD: 60, maxSupplyPressure: 55, minOutperformers: 1 },
  "First Proof": { minHD: 60, maxSupplyPressure: 50, minOutperformers: 1 },
  "Repeatable Demand": { minHD: 65, minRepeatability: 55, minOutperformers: 2, maxSupplyPressure: 60 },
  "Strong Fit For My Team": { minHD: 55, minConfidence: 45, minTeamFit: 60 },
};

function tone(v: number) {
  return v >= 70 ? "text-emerald-300" : v >= 45 ? "text-amber-300" : "text-rose-300";
}

export function HiddenDemandPage() {
  const { dataset } = useDataset();
  const team = useActiveTeam();
  const mode = useTeamStore((s) => s.mode);
  const navigate = useNavigate();
  const [f, setF] = useState<Filters>(DEFAULT_FILTERS);
  const [view, setView] = useState<"table" | "scatter">("table");

  const teamMode = mode === "team";

  const rows = useMemo(() => {
    if (!dataset) return [];
    return dataset.clusters
      .filter((c) => c.hiddenDemand)
      .map((c) => {
        const hd = c.hiddenDemand!;
        const opp = teamMode ? computeHiddenOpportunityForTeam(team, c) : null;
        return { c, hd, opp };
      })
      .filter(({ c, hd, opp }) => {
        if (!f.experimental && hd.sleeperMarketType === "insufficient_evidence") return false;
        if (hd.hiddenDemandScore.value < f.minHD) return false;
        if (hd.confidence < f.minConfidence) return false;
        if (c.supplyPressureScore.value > f.maxSupplyPressure) return false;
        if (hd.highOutperformerCount < f.minOutperformers) return false;
        if (hd.repeatabilityScore.value < f.minRepeatability) return false;
        if (f.excludeHighConcentration && c.concentration.band === "Highly Concentrated") return false;
        if (teamMode && opp && opp.teamFit < f.minTeamFit) return false;
        return true;
      })
      .sort((a, b) =>
        teamMode && a.opp && b.opp
          ? b.opp.hiddenOpportunityForTeam - a.opp.hiddenOpportunityForTeam
          : b.hd.hiddenDemandScore.value - a.hd.hiddenDemandScore.value ||
            b.hd.confidence - a.hd.confidence,
      );
  }, [dataset, team, teamMode, f]);

  const scatterOption = useMemo<EChartsOption | null>(() => {
    if (!dataset) return null;
    const pts = rows.map(({ c, hd }) => ({
      name: c.name, slug: c.slug,
      value: [c.supplyPressureScore.value, hd.hiddenDemandScore.value, 16 + hd.highOutperformerCount * 3],
      cluster: c, hd,
    }));
    return {
      backgroundColor: "transparent",
      grid: { left: 56, right: 24, top: 24, bottom: 52 },
      tooltip: {
        trigger: "item", backgroundColor: "#121826", borderColor: "#26304a",
        textStyle: { color: "#e6ebf5", fontSize: 12 },
        formatter: (p: any) => {
          const c: MarketCluster = p.data.cluster; const hd = p.data.hd;
          return `<b>${c.name}</b><br/>Hidden Demand ${hd.hiddenDemandScore.value} · conf ${hd.confidence}<br/>${SLEEPER_LABEL[hd.sleeperMarketType as SleeperMarketType]} · ${hd.highOutperformerCount} outperformers · best ${hd.bestOutperformanceRatio}×`;
        },
      },
      xAxis: { type: "value", name: "Supply Pressure →", nameLocation: "middle", nameGap: 30, min: 0, max: 100, nameTextStyle: { color: "#8b97b0" }, axisLine: { lineStyle: { color: "#26304a" } }, axisLabel: { color: "#5f6b85" }, splitLine: { lineStyle: { color: "#1a2234" } } },
      yAxis: { type: "value", name: "Hidden Demand ↑", nameLocation: "middle", nameGap: 38, min: 0, max: 100, nameTextStyle: { color: "#8b97b0" }, axisLine: { lineStyle: { color: "#26304a" } }, axisLabel: { color: "#5f6b85" }, splitLine: { lineStyle: { color: "#1a2234" } } },
      series: [{
        type: "scatter", symbolSize: (v: number[]) => v[2],
        itemStyle: { color: "#34d399", borderColor: "#0b0f17", borderWidth: 1.5, opacity: 0.9 },
        label: { show: true, formatter: (p: any) => p.data.name, position: "top", color: "#c3cbe0", fontSize: 11 },
        labelLayout: { hideOverlap: true },
        data: pts as any,
        markLine: { silent: true, symbol: "none", lineStyle: { color: "#26304a", type: "dashed" }, label: { show: false }, data: [{ xAxis: 50 }, { yAxis: 50 }] as any },
      }],
    };
  }, [dataset, rows]);

  const setPreset = (name: string) => setF({ ...DEFAULT_FILTERS, ...PRESETS[name] });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold text-ink">Hidden Demand</h1>
          <p className="text-sm text-muted max-w-3xl">
            Small or underdeveloped markets where products already outperform their
            release cohort — evidence demand is stronger than the visible market size.
            Not the same as Market Gap; not a prediction of success.
          </p>
        </div>
        <div className="inline-flex rounded-md border border-edge overflow-hidden text-xs">
          {(["table", "scatter"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 ${view === v ? "bg-panel2 text-ink" : "text-muted hover:text-ink"}`}>{v}</button>
          ))}
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-muted">Presets:</span>
        {Object.keys(PRESETS).map((p) => (
          <button key={p} onClick={() => setPreset(p)} className="text-[11px] px-2 py-1 rounded border border-edge text-muted hover:text-ink hover:bg-panel2">{p}</button>
        ))}
        <button onClick={() => setF(DEFAULT_FILTERS)} className="text-[11px] px-2 py-1 rounded border border-edge text-muted hover:text-ink">Reset</button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border border-edge bg-panel px-3 py-2 text-xs text-muted">
        {([
          ["Min HD", "minHD", 0, 100],
          ["Min Conf", "minConfidence", 0, 100],
          ["Max Supply", "maxSupplyPressure", 0, 100],
          ["Min Repeatability", "minRepeatability", 0, 100],
        ] as const).map(([label, key, lo, hi]) => (
          <label key={key} className="flex items-center gap-1.5">
            {label}
            <input type="range" min={lo} max={hi} step={5} value={f[key] as number} onChange={(e) => setF({ ...f, [key]: Number(e.target.value) })} className="accent-emerald-400" />
            <span className="tabular-nums text-ink w-6">{f[key] as number}</span>
          </label>
        ))}
        <label className="flex items-center gap-1.5">
          Min Outperformers
          <input type="range" min={0} max={5} value={f.minOutperformers} onChange={(e) => setF({ ...f, minOutperformers: Number(e.target.value) })} className="accent-emerald-400" />
          <span className="tabular-nums text-ink w-4">{f.minOutperformers}</span>
        </label>
        <button onClick={() => setF({ ...f, excludeHighConcentration: !f.excludeHighConcentration })} className={`px-2 py-1 rounded border ${f.excludeHighConcentration ? "border-emerald-500 text-emerald-300" : "border-edge"}`}>Exclude high concentration</button>
        {teamMode && (
          <label className="flex items-center gap-1.5">
            Min Team Fit
            <input type="range" min={0} max={100} step={5} value={f.minTeamFit} onChange={(e) => setF({ ...f, minTeamFit: Number(e.target.value) })} className="accent-emerald-400" />
            <span className="tabular-nums text-ink w-6">{f.minTeamFit}</span>
          </label>
        )}
        <button onClick={() => setF({ ...f, experimental: !f.experimental })} className={`px-2 py-1 rounded border ${f.experimental ? "border-sky-500 text-sky-300" : "border-edge"}`}>Show experimental</button>
        <span className="ml-auto text-muted">{teamMode ? `team: ${team.name}` : "Global (switch to My Team on the map for Team Fit)"}</span>
      </div>

      {view === "scatter" ? (
        <div className="rounded-xl border border-edge bg-panel p-2 h-[62vh] min-h-[420px]">
          {scatterOption && <EChart option={scatterOption} onEvents={{ click: (p: any) => p?.data?.slug && navigate(`/cluster/${p.data.slug}`) }} />}
        </div>
      ) : (
        <div className="rounded-xl border border-edge bg-panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-edge">
                <th className="py-2 px-3 font-medium">Market</th>
                <th className="py-2 px-3 font-medium text-right">Hidden Demand</th>
                <th className="py-2 px-3 font-medium text-right">Conf</th>
                <th className="py-2 px-3 font-medium">Type</th>
                <th className="py-2 px-3 font-medium text-right">Supply</th>
                <th className="py-2 px-3 font-medium text-right">Med Rev</th>
                <th className="py-2 px-3 font-medium text-right">P90</th>
                <th className="py-2 px-3 font-medium text-right">Outperf.</th>
                <th className="py-2 px-3 font-medium text-right">Best</th>
                <th className="py-2 px-3 font-medium text-right">Repeat</th>
                {teamMode && <th className="py-2 px-3 font-medium text-right">Team Fit</th>}
                {teamMode && <th className="py-2 px-3 font-medium text-right">Hidden Opp.</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, hd, opp }) => (
                <tr key={c.id} className="border-b border-edge/40 hover:bg-panel2/40">
                  <td className="py-2 px-3"><Link to={`/cluster/${c.slug}`} className="text-ink hover:text-emerald-300">{c.name}</Link></td>
                  <td className={`py-2 px-3 text-right tabular-nums font-semibold ${tone(hd.hiddenDemandScore.value)}`}>{hd.hiddenDemandScore.value}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted">{hd.confidence}</td>
                  <td className="py-2 px-3"><span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${SLEEPER_COLOR[hd.sleeperMarketType]}`}>{SLEEPER_LABEL[hd.sleeperMarketType]}</span></td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted">{hd.activeSupply}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted">{hd.medianReviewsPerGame.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted">{hd.p90ReviewsPerGame.toLocaleString()}</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted">{hd.highOutperformerCount}<span className="text-edge">/{hd.independentOutperformerCount}i</span></td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted">{hd.bestOutperformanceRatio}×</td>
                  <td className="py-2 px-3 text-right tabular-nums text-muted">{hd.repeatabilityScore.value}</td>
                  {teamMode && <td className={`py-2 px-3 text-right tabular-nums ${opp ? tone(opp.teamFit) : "text-muted"}`}>{opp ? Math.round(opp.teamFit) : "—"}</td>}
                  {teamMode && <td className={`py-2 px-3 text-right tabular-nums font-semibold ${opp ? tone(opp.hiddenOpportunityForTeam) : "text-muted"}`}>{opp?.hiddenOpportunityForTeam ?? "—"}{opp?.cap != null && <span className="text-[10px] text-rose-300"> cap</span>}</td>}
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={teamMode ? 12 : 10} className="py-6 text-center text-muted">No markets match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[11px] text-muted">Markets deserving deeper validation — not predictions of commercial success. Switch the map to “My Team” to enable Team Fit and Hidden Opportunity columns.</p>
    </div>
  );
}
