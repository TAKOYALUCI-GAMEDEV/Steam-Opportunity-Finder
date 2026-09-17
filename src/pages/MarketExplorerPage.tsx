import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDataset } from "@/state/useDataset";

export function MarketExplorerPage() {
  const { dataset } = useDataset();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!dataset) return { clusters: [], games: [], tags: [] };
    const needle = q.trim().toLowerCase();
    const match = (s: string) => s.toLowerCase().includes(needle);
    if (!needle)
      return { clusters: dataset.clusters, games: [], tags: dataset.tags.slice(0, 20) };
    return {
      clusters: dataset.clusters.filter(
        (c) =>
          match(c.name) ||
          match(c.description) ||
          [...c.primaryTags, ...c.secondaryTags].some(match),
      ),
      games: dataset.games.filter((g) => match(g.name) || g.tags.some(match)).slice(0, 40),
      tags: dataset.tags.filter((t) => match(t.name)).slice(0, 30),
    };
  }, [dataset, q]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Market Explorer</h1>
        <p className="text-sm text-muted">Search by tag, mechanic, theme, cluster or game.</p>
      </div>

      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. automation, deckbuilding, co-op, Spellsplit…"
        className="w-full bg-panel border border-edge rounded-lg px-3 py-2 text-ink placeholder:text-muted/60"
      />

      <section>
        <div className="text-[11px] uppercase tracking-wider text-muted mb-2">
          Clusters ({results.clusters.length})
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {results.clusters.map((c) => (
            <Link
              key={c.id}
              to={`/cluster/${c.slug}`}
              className="rounded-lg border border-edge bg-panel p-3 hover:bg-panel2"
            >
              <div className="flex items-baseline justify-between">
                <span className="text-ink font-medium">{c.name}</span>
                <span className="text-xs text-muted">D {c.demandScore.value} · S {c.supplyPressureScore.value}</span>
              </div>
              <div className="text-[11px] text-muted mt-1 line-clamp-2">{c.description}</div>
            </Link>
          ))}
        </div>
      </section>

      {results.tags.length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Tags</div>
          <div className="flex flex-wrap gap-1.5">
            {results.tags.map((t) => (
              <span
                key={t.name}
                className={`text-[11px] px-2 py-0.5 rounded-full border ${
                  t.generic ? "border-edge text-muted" : "border-indigo-500/40 text-indigo-200"
                }`}
                title={`weight ${t.informationWeight} · ${t.gameCount} games`}
              >
                {t.name}
              </span>
            ))}
          </div>
        </section>
      )}

      {results.games.length > 0 && (
        <section>
          <div className="text-[11px] uppercase tracking-wider text-muted mb-2">
            Games ({results.games.length})
          </div>
          <div className="rounded-lg border border-edge bg-panel overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {results.games.map((g) => (
                  <tr key={g.appId} className="border-b border-edge/40">
                    <td className="py-1.5 px-3 text-ink">{g.name}</td>
                    <td className="py-1.5 px-3 text-muted text-[11px]">{g.tags.slice(0, 4).join(" · ")}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums text-muted">
                      {g.reviewTotal?.toLocaleString()} rev
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
