import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { useDataset } from "@/state/useDataset";
import type { MarketCluster } from "@/types/dataset";

// Activity → symbol size (spec §7: size = market activity / evidence strength,
// NOT revenue). Uses game count + total reviews, log-compressed.
function activitySize(c: MarketCluster): number {
  const reviews = c.gameCount * Math.max(1, c.successDistribution.medianReviews);
  const s = Math.log10(1 + c.gameCount * 3 + Math.log10(1 + reviews) * 6);
  return 16 + s * 9;
}

// Attractiveness → color: muted blue (low) → amber (high opportunity).
function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}
function attractivenessColor(v: number): string {
  const t = Math.max(0, Math.min(1, v / 100));
  const c1 = [70, 90, 130]; // #465a82-ish
  const c2 = [242, 193, 78]; // #f2c14e
  return `rgb(${lerp(c1[0], c2[0], t)}, ${lerp(c1[1], c2[1], t)}, ${lerp(c1[2], c2[2], t)})`;
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

  const option = useMemo(() => {
    if (!dataset) return null;
    const points = dataset.clusters.map((c) => ({
      name: c.name,
      slug: c.slug,
      value: [
        c.supplyPressureScore.value,
        c.demandScore.value,
        c.marketAttractivenessScore.value,
        activitySize(c),
      ],
      cluster: c,
    }));

    return {
      backgroundColor: "transparent",
      grid: { left: 56, right: 24, top: 24, bottom: 52 },
      tooltip: {
        trigger: "item",
        backgroundColor: "#121826",
        borderColor: "#26304a",
        textStyle: { color: "#e6ebf5", fontSize: 12 },
        formatter: (p: any) => {
          const c: MarketCluster = p.data.cluster;
          const row = (k: string, v: number | string) =>
            `<div style="display:flex;justify-content:space-between;gap:24px"><span style="color:#8b97b0">${k}</span><span>${v}</span></div>`;
          return `<div style="min-width:200px">
            <div style="font-weight:600;margin-bottom:6px">${c.name}</div>
            ${row("Demand", c.demandScore.value)}
            ${row("Supply Pressure", c.supplyPressureScore.value)}
            ${row("Demand Growth", c.demandGrowthScore.value)}
            ${row("Success Breadth", c.successBreadthScore.value)}
            ${row("Market Attractiveness", c.marketAttractivenessScore.value)}
            ${row("Gap", c.gapScore.value)}
            <div style="border-top:1px solid #26304a;margin:6px 0"></div>
            ${row("Games", c.gameCount)}
            ${row("Confidence", c.confidenceScore)}
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
          itemStyle: {
            color: (p: any) => attractivenessColor(p.value[2]),
            borderColor: "#0b0f17",
            borderWidth: 1.5,
            opacity: 0.92,
          },
          label: {
            show: true,
            formatter: (p: any) => p.data.name,
            position: "top",
            color: "#c3cbe0",
            fontSize: 11,
          },
          emphasis: {
            focus: "self",
            itemStyle: { borderColor: "#e6ebf5", borderWidth: 2 },
          },
          data: points,
          markArea: {
            silent: true,
            itemStyle: { color: "transparent" },
            emphasis: { disabled: true },
            data: QUADRANTS.map(([from, to, text, pos]) => [
              {
                coord: from,
                itemStyle: { color: "transparent" },
                label: {
                  show: true,
                  formatter: text,
                  position: pos,
                  color: "#4a5876",
                  fontSize: 11,
                },
              },
              { coord: to },
            ]),
          },
          markLine: {
            silent: true,
            symbol: "none",
            lineStyle: { color: "#26304a", type: "dashed" },
            label: { show: false },
            data: [{ xAxis: 50 }, { yAxis: 50 }],
          },
        },
      ],
    };
  }, [dataset]);

  const onEvents = useMemo(
    () => ({
      click: (p: any) => {
        if (p?.data?.slug) navigate(`/cluster/${p.data.slug}`);
      },
    }),
    [navigate],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Opportunity Map</h1>
          <p className="text-sm text-muted">
            Each point is a market cluster — never a single game. Position is objective
            Demand × Supply; color is market attractiveness; size is market activity.
          </p>
        </div>
        {dataset && (
          <div className="text-xs text-muted">
            {dataset.meta.clusterCount} clusters · {dataset.meta.gameCount} games ·{" "}
            {dataset.meta.source} · {dataset.meta.analyticsVersion}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-edge bg-panel p-2 h-[70vh] min-h-[420px]">
        {loading && (
          <div className="h-full grid place-items-center text-muted">Loading dataset…</div>
        )}
        {error && (
          <div className="h-full grid place-items-center text-center text-red-300">
            {error}
          </div>
        )}
        {option && (
          <EChart option={option as unknown as EChartsOption} onEvents={onEvents} />
        )}
      </div>
    </div>
  );
}
