import { Link, useParams } from "react-router-dom";
import { useDataset } from "@/state/useDataset";
import { clusterById, gamesOf } from "@/lib/dataset";
import { CAPABILITIES } from "@/lib/capabilities";
import type { ScoreValue } from "@/types/scores";
import type { MarketCluster } from "@/types/dataset";

function scoreTone(v: number): string {
  if (v >= 70) return "text-emerald-300";
  if (v >= 45) return "text-amber-300";
  return "text-rose-300";
}

function ScoreCard({ label, score }: { label: string; score: ScoreValue }) {
  return (
    <div className="rounded-lg border border-edge bg-panel2/40 p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted">{label}</span>
        <span className={`text-xl font-semibold tabular-nums ${scoreTone(score.value)}`}>
          {score.value}
        </span>
      </div>
      <div className="text-[11px] text-muted mb-2">confidence {score.confidence}</div>
      <div className="space-y-1">
        {score.components.map((c) => (
          <div key={c.key} className="flex items-center gap-2 text-[11px]">
            <span className="w-40 shrink-0 text-muted truncate" title={c.label}>
              {c.label}
            </span>
            <div className="flex-1 h-1.5 rounded bg-panel overflow-hidden">
              <div
                className="h-full bg-sky-500/70"
                style={{ width: `${c.value}%` }}
              />
            </div>
            <span className="w-8 text-right tabular-nums text-muted">{c.value}</span>
            <span className="w-10 text-right tabular-nums text-[10px] text-edge">
              ×{c.weight}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RequirementProfile({ cluster }: { cluster: MarketCluster }) {
  const rp = cluster.requirementProfile;
  return (
    <div className="rounded-lg border border-edge bg-panel2/40 p-3">
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-sm text-ink font-medium">Market Requirements (15-dim)</span>
        <span className="text-[11px] text-muted">
          scope {rp.scopeClass} · confidence {rp.confidence}
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
        {CAPABILITIES.map((cap) => {
          const v = rp.values[cap.id];
          const details = rp.details[cap.id];
          return (
            <div
              key={cap.id}
              className="flex items-center gap-2 text-[11px]"
              title={details?.map((d) => `+${d.value}: ${d.reason}`).join("\n")}
            >
              <span className="w-40 shrink-0 text-muted truncate">{cap.label}</span>
              <div className="flex-1 flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-2 flex-1 rounded-sm ${
                      i <= v ? "bg-indigo-400/80" : "bg-panel"
                    }`}
                  />
                ))}
              </div>
              <span className="w-4 text-right tabular-nums text-muted">{v}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ClusterDetailPage() {
  const { slug } = useParams();
  const { dataset, loading, error } = useDataset();

  if (loading) return <div className="text-muted">Loading…</div>;
  if (error) return <div className="text-rose-300">{error}</div>;
  if (!dataset) return null;

  const cluster = slug ? clusterById(dataset, slug) : undefined;
  if (!cluster)
    return (
      <div className="text-muted">
        Cluster not found. <Link to="/" className="text-sky-400">Back to map</Link>
      </div>
    );

  const games = gamesOf(dataset, cluster).sort(
    (a, b) => (b.reviewTotal ?? 0) - (a.reviewTotal ?? 0),
  );
  const sd = cluster.successDistribution;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link to="/" className="text-xs text-sky-400 hover:underline">
          ← Opportunity Map
        </Link>
        <h1 className="text-xl font-semibold text-ink mt-1">{cluster.name}</h1>
        <p className="text-sm text-muted max-w-3xl">{cluster.description}</p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {cluster.primaryTags.map((t) => (
            <span
              key={t}
              className="text-[11px] px-2 py-0.5 rounded-full border border-edge bg-panel2 text-ink"
            >
              {t}
            </span>
          ))}
          {cluster.secondaryTags.map((t) => (
            <span
              key={t}
              className="text-[11px] px-2 py-0.5 rounded-full border border-edge text-muted"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <ScoreCard label="Demand" score={cluster.demandScore} />
        <ScoreCard label="Supply Pressure" score={cluster.supplyPressureScore} />
        <ScoreCard label="Demand Growth" score={cluster.demandGrowthScore} />
        <ScoreCard label="Success Breadth" score={cluster.successBreadthScore} />
        <ScoreCard label="Market Attractiveness" score={cluster.marketAttractivenessScore} />
        <ScoreCard label="Gap" score={cluster.gapScore} />
        <ScoreCard label="Timing" score={cluster.timingScore} />
        <ScoreCard label="Supply Growth" score={cluster.supplyGrowthScore} />
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <RequirementProfile cluster={cluster} />

        <div className="rounded-lg border border-edge bg-panel2/40 p-3">
          <div className="text-sm text-ink font-medium mb-2">Success Distribution</div>
          <div className="grid grid-cols-5 gap-2 mb-3">
            {(["Tiny", "Small", "Viable", "Successful", "Breakout"] as const).map((t) => (
              <div key={t} className="text-center">
                <div className="text-lg font-semibold tabular-nums text-ink">
                  {sd.tierCounts[t]}
                </div>
                <div className="text-[10px] text-muted">{t}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-2 text-[11px] text-muted">
            <div>P25<div className="text-ink tabular-nums">{Math.round(sd.p25)}</div></div>
            <div>Median<div className="text-ink tabular-nums">{Math.round(sd.p50)}</div></div>
            <div>P75<div className="text-ink tabular-nums">{Math.round(sd.p75)}</div></div>
            <div>P90<div className="text-ink tabular-nums">{Math.round(sd.p90)}</div></div>
          </div>
          <div className="mt-3 text-[11px] text-muted">
            Concentration:{" "}
            <span className="text-ink">{cluster.concentration.band}</span>{" "}
            (top-1 {Math.round(cluster.concentration.top1Share * 100)}%, top-3{" "}
            {Math.round(cluster.concentration.top3Share * 100)}%)
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-edge bg-panel2/40 p-3">
        <div className="text-sm text-ink font-medium mb-2">
          Representative Games ({games.length})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] text-muted border-b border-edge">
                <th className="py-1.5 pr-4 font-medium">Game</th>
                <th className="py-1.5 pr-4 font-medium text-right">Reviews</th>
                <th className="py-1.5 pr-4 font-medium text-right">Score %</th>
                <th className="py-1.5 pr-4 font-medium text-right">Players</th>
                <th className="py-1.5 pr-4 font-medium">Released</th>
              </tr>
            </thead>
            <tbody>
              {games.map((g) => (
                <tr key={g.appId} className="border-b border-edge/40">
                  <td className="py-1.5 pr-4 text-ink">
                    {g.name}
                    {g.earlyAccess && (
                      <span className="ml-2 text-[10px] text-amber-300">EA</span>
                    )}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-muted">
                    {g.reviewTotal?.toLocaleString()}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-muted">
                    {g.reviewScorePercent}
                  </td>
                  <td className="py-1.5 pr-4 text-right tabular-nums text-muted">
                    {g.currentPlayers?.toLocaleString() ?? "—"}
                  </td>
                  <td className="py-1.5 pr-4 text-muted">{g.releaseDate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
