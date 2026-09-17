import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useDataset } from "@/state/useDataset";
import { useActiveTeam, useTeamStore } from "@/state/teamStore";
import { computePersonalizedOpportunity, computeTeamFit } from "@/lib/teamFit";
import type { MarketCluster } from "@/types/dataset";

type Encoding = "attractiveness" | "teamFit" | "hiddenDemand" | "growth" | "confidence";

function activitySize(c: MarketCluster): number {
  const reviews = c.gameCount * Math.max(1, c.successDistribution.medianReviews);
  const s = Math.log10(1 + c.gameCount * 3 + Math.log10(1 + reviews) * 6);
  return 16 + s * 9;
}

const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
function scale2(c1: number[], c2: number[], t: number) {
  return `rgb(${lerp(c1[0], c2[0], t)},${lerp(c1[1], c2[1], t)},${lerp(c1[2], c2[2], t)})`;
}
function scale3(c1: number[], c2: number[], c3: number[], t: number) {
  return t < 0.5 ? scale2(c1, c2, t * 2) : scale2(c2, c3, (t - 0.5) * 2);
}
function encodingColor(enc: Encoding, v: number): string {
  const t = Math.max(0, Math.min(1, v / 100));
  if (enc === "teamFit")
    return scale3([220, 70, 90], [242, 193, 78], [52, 211, 153], t); // rose→amber→emerald
  if (enc === "hiddenDemand")
    return scale2([48, 60, 74], [52, 211, 153], t); // slate → bright emerald (distinct)
  return scale2([70, 90, 130], [242, 193, 78], t); // blue→amber
}

const QUADRANTS: [number[], number[], string, string][] = [
  [[0, 50], [50, 100], "Opportunity", "insideTopLeft"],
  [[50, 50], [100, 100], "Hot / Competitive", "insideTopRight"],
  [[0, 0], [50, 50], "Niche", "insideBottomLeft"],
  [[50, 0], [100, 50], "Saturated", "insideBottomRight"],
];

export function OpportunityMapPage() {
  const { dataset, loading, error } = useDataset();
  const navigate = useNavigate();
  const mode = useTeamStore((s) => s.mode);
  const setMode = useTeamStore((s) => s.setMode);
  const team = useActiveTeam();

  const [encoding, setEncoding] = useState<Encoding>("attractiveness");
  const [minSize, setMinSize] = useState(0);
  const [minConfidence, setMinConfidence] = useState(0);
  const [tagFilter, setTagFilter] = useState<string>("");

  const allTags = useMemo(() => {
    if (!dataset) return [];
    const s = new Set<string>();
    for (const c of dataset.clusters) c.primaryTags.forEach((t) => s.add(t));
    return [...s].sort();
  }, [dataset]);

  const effectiveEncoding: Encoding =
    mode === "global" && encoding === "teamFit" ? "attractiveness" : encoding;

  const option = useMemo(() => {
    if (!dataset) return null;

    const clusters = dataset.clusters.filter(
      (c) =>
        c.gameCount >= minSize &&
        c.confidenceScore >= minConfidence &&
        (!tagFilter || c.primaryTags.includes(tagFilter)),
    );

    const points = clusters.map((c) => {
      const fit = mode === "team" ? computeTeamFit(team, c) : null;
      const po = fit ? computePersonalizedOpportunity(team, c, fit) : null;
      const encVal =
        effectiveEncoding === "teamFit"
          ? (fit?.teamFit ?? 0)
          : effectiveEncoding === "hiddenDemand"
            ? (c.hiddenDemand?.hiddenDemandScore.value ?? 0)
            : effectiveEncoding === "growth"
              ? c.demandGrowthScore.value
              : effectiveEncoding === "confidence"
                ? c.confidenceScore
                : c.marketAttractivenessScore.value;
      const blocked = (fit?.hardBlockers.length ?? 0) > 0;
      // When highlighting a market dimension (not team fit), let that dimension drive
      // prominence so the encoding is clearly visible; otherwise use team-fit emphasis.
      const encDrivesOpacity =
        effectiveEncoding === "hiddenDemand" ||
        effectiveEncoding === "growth" ||
        effectiveEncoding === "confidence";
      const opacity = encDrivesOpacity
        ? 0.4 + 0.55 * (encVal / 100)
        : mode === "team"
          ? 0.35 + 0.6 * ((fit?.teamFit ?? 0) / 100)
          : 0.92;
      return {
        name: c.name,
        slug: c.slug,
        value: [
          c.supplyPressureScore.value,
          c.demandScore.value,
          encVal,
          activitySize(c),
        ],
        itemStyle: {
          color: encodingColor(effectiveEncoding, encVal),
          borderColor: blocked ? "#f43f5e" : "#0b0f17",
          borderWidth: blocked ? 2.5 : 1.5,
          opacity,
        },
        cluster: c,
        fit,
        po,
        blocked,
      };
    });

    const opt: EChartsOption = {
      backgroundColor: "transparent",
      grid: { left: 56, right: 24, top: 24, bottom: 52 },
      tooltip: {
        trigger: "item",
        backgroundColor: "#121826",
        borderColor: "#26304a",
        textStyle: { color: "#e6ebf5", fontSize: 12 },
        formatter: (p: any) => {
          const c: MarketCluster = p.data.cluster;
          const fit = p.data.fit;
          const po = p.data.po;
          const row = (k: string, v: number | string, tone = "#e6ebf5") =>
            `<div style="display:flex;justify-content:space-between;gap:24px"><span style="color:#8b97b0">${k}</span><span style="color:${tone}">${v}</span></div>`;
          let extra = "";
          if (fit && po) {
            extra = `<div style="border-top:1px solid #26304a;margin:6px 0"></div>
              ${row("Team Fit", `${Math.round(fit.teamFit)} · ${fit.gate}`)}
              ${row("Personal Opportunity", po.personalizedOpportunity)}
              ${p.data.blocked ? `<div style="color:#f43f5e;margin-top:4px">⛔ hard blocker</div>` : ""}`;
          }
          return `<div style="min-width:210px">
            <div style="font-weight:600;margin-bottom:6px">${c.name}</div>
            ${row("Demand", c.demandScore.value)}
            ${row("Supply Pressure", c.supplyPressureScore.value)}
            ${row("Demand Growth", c.demandGrowthScore.value)}
            ${row("Success Breadth", c.successBreadthScore.value)}
            ${row("Market Attractiveness", c.marketAttractivenessScore.value)}
            ${row("Gap", c.gapScore.value)}
            ${row("Confidence", c.confidenceScore)}
            ${extra}
            <div style="color:#5f6b85;font-size:11px;margin-top:6px">click → cluster detail</div>
          </div>`;
        },
      },
      xAxis: {
        type: "value",
        name: "Supply Pressure →",
        nameLocation: "middle",
        nameGap: 30,
        min: 0,
        max: 100,
        nameTextStyle: { color: "#8b97b0" },
        axisLine: { lineStyle: { color: "#26304a" } },
        axisLabel: { color: "#5f6b85" },
        splitLine: { lineStyle: { color: "#1a2234" } },
      },
      yAxis: {
        type: "value",
        name: "Demand ↑",
        nameLocation: "middle",
        nameGap: 38,
        min: 0,
        max: 100,
        nameTextStyle: { color: "#8b97b0" },
        axisLine: { lineStyle: { color: "#26304a" } },
        axisLabel: { color: "#5f6b85" },
        splitLine: { lineStyle: { color: "#1a2234" } },
      },
      series: [
        {
          type: "scatter",
          symbolSize: (val: number[]) => val[3],
          label: {
            show: true,
            formatter: (p: any) => p.data.name,
            position: "top",
            color: "#c3cbe0",
            fontSize: 11,
          },
          labelLayout: { hideOverlap: true },
          emphasis: {
            focus: "self",
            itemStyle: { borderColor: "#e6ebf5", borderWidth: 2 },
          },
          data: points as any,
          markArea: {
            silent: true,
            itemStyle: { color: "transparent" },
            data: QUADRANTS.map(([from, to, text, pos]) => [
              {
                coord: from,
                label: { show: true, formatter: text, position: pos as any, color: "#4a5876", fontSize: 11 },
              },
              { coord: to },
            ]) as any,
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#26304a", type: "dashed" },
            label: { show: false },
            data: [{ xAxis: 50 }, { yAxis: 50 }] as any,
          },
        },
      ],
    };
    return opt;
  }, [dataset, mode, team, effectiveEncoding, minSize, minConfidence, tagFilter]);

  const onEvents = useMemo(
    () => ({
      click: (p: any) => {
        if (p?.data?.slug) navigate(`/cluster/${p.data.slug}`);
      },
    }),
    [navigate],
  );

  const encLabel: Record<Encoding, string> = {
    attractiveness: "Attractiveness",
    teamFit: "Team Fit",
    hiddenDemand: "Hidden Demand",
    growth: "Growth",
    confidence: "Confidence",
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-semibold text-ink">Opportunity Map</h1>
          <p className="text-sm text-muted">
            Each point is a market cluster. Position is objective Demand × Supply and
            never moves; team fit only changes emphasis.
          </p>
        </div>
        {dataset && (
          <div className="text-xs text-muted">
            {dataset.meta.clusterCount} clusters · {dataset.meta.gameCount} games ·{" "}
            {dataset.meta.analyticsVersion}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-edge bg-panel px-3 py-2 text-xs">
        <div className="inline-flex rounded-md border border-edge overflow-hidden">
          {(["global", "team"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 ${mode === m ? "bg-panel2 text-ink" : "text-muted hover:text-ink"}`}
            >
              {m === "global" ? "Global Market" : "My Team"}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-1.5 text-muted">
          Color by
          <select
            value={encoding}
            onChange={(e) => setEncoding(e.target.value as Encoding)}
            className="bg-panel border border-edge rounded px-2 py-1 text-ink"
          >
            {(Object.keys(encLabel) as Encoding[]).map((e) => (
              <option key={e} value={e} disabled={e === "teamFit" && mode === "global"}>
                {encLabel[e]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1.5 text-muted">
          Min games
          <input type="range" min={0} max={10} value={minSize} onChange={(e) => setMinSize(Number(e.target.value))} className="accent-sky-400" />
          <span className="tabular-nums text-ink w-4">{minSize}</span>
        </label>

        <label className="flex items-center gap-1.5 text-muted">
          Min confidence
          <input type="range" min={0} max={100} step={5} value={minConfidence} onChange={(e) => setMinConfidence(Number(e.target.value))} className="accent-sky-400" />
          <span className="tabular-nums text-ink w-6">{minConfidence}</span>
        </label>

        <label className="flex items-center gap-1.5 text-muted">
          Tag
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="bg-panel border border-edge rounded px-2 py-1 text-ink">
            <option value="">all</option>
            {allTags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>

        {mode === "team" && (
          <span className="text-muted ml-auto">
            team: <span className="text-ink">{team.name}</span>
          </span>
        )}
      </div>

      <div className="rounded-xl border border-edge bg-panel p-2 h-[64vh] min-h-[420px]">
        {loading && <div className="h-full grid place-items-center text-muted">Loading dataset…</div>}
        {error && <div className="h-full grid place-items-center text-center text-rose-300">{error}</div>}
        {option && <EChart option={option} onEvents={onEvents} />}
      </div>
    </div>
  );
}
