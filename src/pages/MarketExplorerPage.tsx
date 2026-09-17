import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDataset } from "@/state/useDataset";
import { conceptToTags, matchMarkets } from "@/lib/conceptMatch";

const STOPWORDS = new Set([
  "a", "an", "the", "i", "we", "want", "to", "make", "making", "like", "with",
  "and", "or", "of", "for", "game", "games", "about", "that", "where", "players",
  "player", "based", "style", "is", "in", "on", "my", "our", "some", "kind",
]);

function tokenize(q: string): string[] {
  return [
    ...new Set(
      q
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 2 && !STOPWORDS.has(w)),
    ),
  ];
}

export function MarketExplorerPage() {
  const { dataset } = useDataset();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    if (!dataset) return null;
    const needle = q.trim();
    const tokens = tokenize(needle);

    if (tokens.length === 0) {
      return {
        tokens,
        clusters: dataset.clusters,
        games: [],
        tags: dataset.tags.filter((t) => !t.generic).slice(0, 24),
      };
    }

    const has = (text: string) => {
      const t = text.toLowerCase();
      return tokens.filter((tok) => t.includes(tok)).length;
    };

    // Semantic layer: map the phrase to tags and score markets (reuses Concept Validator).
    const semantic = matchMarkets(conceptToTags(needle, dataset), dataset);
    const semanticScore = new Map(semantic.map((m) => [m.cluster.id, m.score]));

    const clusters = dataset.clusters
      .map((c) => {
        const text = `${c.name} ${c.description} ${[...c.primaryTags, ...c.secondaryTags].join(" ")}`;
        const tokenHits = has(text);
        const sem = semanticScore.get(c.id) ?? 0;
        return { c, score: tokenHits * 100 + sem };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.c);

    const games = dataset.games
      .map((g) => ({ g, score: has(`${g.name} ${g.tags.join(" ")}`) }))
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score || (b.g.reviewTotal ?? 0) - (a.g.reviewTotal ?? 0))
      .slice(0, 40)
      .map((x) => x.g);

    const tags = dataset.tags.filter((t) => tokens.some((tok) => t.name.toLowerCase().includes(tok))).slice(0, 30);

    return { tokens, clusters, games, tags };
  }, [dataset, q]);

  if (!results) return <div className="text-muted">Loading…</div>;

  const nothing =
    results.tokens.length > 0 &&
    results.clusters.length === 0 &&
    results.games.length === 0;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Market Explorer</h1>
        <p className="text-sm text-muted">
          Search by tag, mechanic, theme, cluster or game. Describing a whole concept?
          Use the{" "}
          <Link to="/validator" className="text-sky-400 hover:underline">Concept Validator</Link>.
        </p>
      </div>

      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="e.g. automation, deckbuilder, co-op horror, Stardew, roguelike…"
        className="w-full bg-panel border border-edge rounded-lg px-3 py-2 text-ink placeholder:text-muted/60"
      />

      {nothing && (
        <div className="rounded-lg border border-edge bg-panel p-4">
          <div className="text-ink text-sm">No markets or games matched “{q.trim()}”.</div>
          <p className="text-[13px] text-muted mt-1">
            That could be an underserved gap — or just not in the current dataset (12
            curated markets / 74 games). Try broader terms, or describe the whole idea in
            the{" "}
            <Link to="/validator" className="text-sky-400 hover:underline">Concept Validator</Link>{" "}
            to find the closest markets and adjacent fantasies.
          </p>
        </div>
      )}

      {results.clusters.length > 0 && (
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
      )}

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
