import { useMemo, useState } from "react";
import type { EChartsOption } from "echarts";
import { EChart } from "@/components/EChart";
import { CAPABILITIES, RATING_LABELS, type CapabilityGroup } from "@/lib/capabilities";
import { computeTeamFit } from "@/lib/teamFit";
import { useActiveTeam, useTeamStore } from "@/state/teamStore";
import { useDataset } from "@/state/useDataset";

const GROUPS: CapabilityGroup[] = ["Engineering", "Content", "Design", "Operations"];

function NumberField({
  label,
  value,
  onChange,
  step = 1,
  prefix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  prefix?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      <span className="flex items-center gap-1">
        {prefix && <span className="text-muted text-xs">{prefix}</span>}
        <input
          type="number"
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-24 bg-panel border border-edge rounded px-2 py-1 text-ink tabular-nums"
        />
      </span>
    </label>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between gap-3 text-sm w-full text-left"
    >
      <span className="text-muted">{label}</span>
      <span
        className={`w-9 h-5 rounded-full relative transition-colors ${
          checked ? "bg-emerald-500/70" : "bg-panel border border-edge"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-ink transition-all ${
            checked ? "left-4" : "left-0.5"
          }`}
        />
      </span>
    </button>
  );
}

export function TeamProfilePage() {
  const { dataset } = useDataset();
  const team = useActiveTeam();
  const {
    profiles,
    activeId,
    setActive,
    patchActive,
    setCapability,
    patchConstraints,
    cloneActive,
    resetDemo,
    removeProfile,
  } = useTeamStore();

  const [compareSlug, setCompareSlug] = useState<string>("");
  const clusters = dataset?.clusters ?? [];
  const compareCluster =
    clusters.find((c) => c.slug === compareSlug) ?? clusters[0];

  const fit = useMemo(
    () => (compareCluster ? computeTeamFit(team, compareCluster) : null),
    [team, compareCluster],
  );

  const radar = useMemo<EChartsOption | null>(() => {
    if (!compareCluster) return null;
    const indicators = CAPABILITIES.map((c) => ({ name: c.label, max: 100 }));
    return {
      backgroundColor: "transparent",
      tooltip: {},
      legend: {
        data: ["Team", "Market Requirement"],
        textStyle: { color: "#8b97b0" },
        top: 0,
      },
      radar: {
        indicator: indicators,
        radius: "62%",
        center: ["50%", "56%"],
        axisName: { color: "#7c88a6", fontSize: 10 },
        splitLine: { lineStyle: { color: "#1a2234" } },
        splitArea: { areaStyle: { color: ["#0e1420", "#121826"] } },
        axisLine: { lineStyle: { color: "#26304a" } },
      },
      series: [
        {
          type: "radar",
          data: [
            {
              name: "Team",
              value: CAPABILITIES.map((c) => team.capabilityProfile[c.id] * 20),
              itemStyle: { color: "#38bdf8" },
              areaStyle: { color: "rgba(56,189,248,0.18)" },
            },
            {
              name: "Market Requirement",
              value: CAPABILITIES.map(
                (c) => compareCluster.requirementProfile.values[c.id] * 20,
              ),
              itemStyle: { color: "#f2c14e" },
              areaStyle: { color: "rgba(242,193,78,0.12)" },
            },
          ],
        },
      ],
    };
  }, [team, compareCluster]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-lg font-semibold text-ink">Team Profile</h1>
          <p className="text-sm text-muted">
            Editing recalculates Team Fit instantly — market data never changes.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={activeId}
            onChange={(e) => setActive(e.target.value)}
            className="bg-panel border border-edge rounded px-2 py-1.5 text-sm text-ink"
          >
            {Object.values(profiles).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => cloneActive()}
            className="text-sm px-3 py-1.5 rounded border border-edge text-ink hover:bg-panel2"
            title="Duplicate for a what-if scenario (spec §42/§65)"
          >
            Clone scenario
          </button>
          {Object.keys(profiles).length > 1 && (
            <button
              onClick={() => removeProfile(activeId)}
              className="text-sm px-3 py-1.5 rounded border border-edge text-rose-300 hover:bg-panel2"
            >
              Delete
            </button>
          )}
          <button
            onClick={resetDemo}
            className="text-sm px-3 py-1.5 rounded border border-edge text-muted hover:bg-panel2"
          >
            Reset demo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: meta + constraints */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-edge bg-panel p-4 space-y-3">
            <div className="text-sm font-medium text-ink">Studio</div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted">Name</span>
              <input
                value={team.name}
                onChange={(e) => patchActive({ name: e.target.value })}
                className="w-48 bg-panel border border-edge rounded px-2 py-1 text-ink"
              />
            </label>
            <NumberField label="Team size" value={team.teamSize} onChange={(v) => patchActive({ teamSize: v })} />
            <NumberField label="Development (months)" value={team.developmentMonths} onChange={(v) => patchActive({ developmentMonths: v })} />
            <NumberField label="Production budget" prefix="€" step={5000} value={team.productionBudget} onChange={(v) => patchActive({ productionBudget: v })} />
            <NumberField label="Outsource budget" prefix="€" step={5000} value={team.outsourceBudget} onChange={(v) => patchActive({ outsourceBudget: v })} />
          </div>

          <div className="rounded-xl border border-edge bg-panel p-4 space-y-2.5">
            <div className="text-sm font-medium text-ink mb-1">Constraints</div>
            <Toggle label="Multiplayer allowed" checked={team.constraints.multiplayerAllowed} onChange={(v) => patchConstraints({ multiplayerAllowed: v })} />
            <Toggle label="Persistent backend allowed" checked={team.constraints.backendAllowed} onChange={(v) => patchConstraints({ backendAllowed: v })} />
            <Toggle label="Content-heavy allowed" checked={team.constraints.contentHeavyAllowed} onChange={(v) => patchConstraints({ contentHeavyAllowed: v })} />
            <Toggle label="LiveOps allowed" checked={team.constraints.liveOpsAllowed} onChange={(v) => patchConstraints({ liveOpsAllowed: v })} />
            <Toggle label="Prefer systemic gameplay" checked={team.constraints.proceduralPreferred} onChange={(v) => patchConstraints({ proceduralPreferred: v })} />
            <NumberField label="Max dev months" value={team.constraints.maxDevelopmentMonths ?? 0} onChange={(v) => patchConstraints({ maxDevelopmentMonths: v || null })} />
            <NumberField label="Max budget" prefix="€" step={10000} value={team.constraints.maxBudget ?? 0} onChange={(v) => patchConstraints({ maxBudget: v || null })} />
          </div>
        </div>

        {/* Middle: capabilities */}
        <div className="rounded-xl border border-edge bg-panel p-4">
          <div className="text-sm font-medium text-ink mb-3">
            Capabilities (0–5)
          </div>
          <div className="space-y-4">
            {GROUPS.map((group) => (
              <div key={group}>
                <div className="text-[11px] uppercase tracking-wider text-muted mb-1.5">
                  {group}
                </div>
                <div className="space-y-2">
                  {CAPABILITIES.filter((c) => c.group === group).map((cap) => {
                    const v = team.capabilityProfile[cap.id];
                    return (
                      <div key={cap.id} className="flex items-center gap-3">
                        <span className="w-44 shrink-0 text-xs text-ink truncate" title={cap.blurb}>
                          {cap.label}
                        </span>
                        <input
                          type="range"
                          min={0}
                          max={5}
                          step={1}
                          value={v}
                          onChange={(e) => setCapability(cap.id, Number(e.target.value))}
                          className="flex-1 accent-sky-400"
                        />
                        <span className="w-16 text-right text-[11px] text-muted">
                          {v} · {RATING_LABELS[v]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: compare radar + live fit */}
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-edge bg-panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium text-ink">Team vs Market</div>
              <select
                value={compareCluster?.slug ?? ""}
                onChange={(e) => setCompareSlug(e.target.value)}
                className="bg-panel border border-edge rounded px-2 py-1 text-xs text-ink"
              >
                {clusters.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="h-72">{radar && <EChart option={radar as unknown as EChartsOption} />}</div>
          </div>

          {fit && compareCluster && (
            <div className="rounded-xl border border-edge bg-panel p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Team Fit · {compareCluster.name}</span>
                <span
                  className={`text-2xl font-semibold tabular-nums ${
                    fit.teamFit >= 60 ? "text-emerald-300" : fit.teamFit >= 40 ? "text-amber-300" : "text-rose-300"
                  }`}
                >
                  {Math.round(fit.teamFit)}
                </span>
              </div>
              <div className="text-[11px] text-muted mb-2">
                {fit.gate} · capability {Math.round(fit.capabilityFit)} · scope {Math.round(fit.scopeFit)}
              </div>
              {fit.hardBlockers.length > 0 && (
                <div className="mb-2 space-y-1">
                  {fit.hardBlockers.map((b) => (
                    <div key={b.code} className="text-[11px] text-rose-300">⛔ {b.message}</div>
                  ))}
                </div>
              )}
              <div className="grid grid-cols-1 gap-1">
                {fit.strengths.map((s) => (
                  <div key={s} className="text-[11px] text-emerald-300/90">✓ {s}</div>
                ))}
                {fit.risks.map((r) => (
                  <div key={r} className="text-[11px] text-amber-300/90">⚠ {r}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
