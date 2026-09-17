import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDataset } from "@/state/useDataset";
import { useActiveTeam } from "@/state/teamStore";
import {
  conceptToTags,
  differentiators,
  matchGames,
  matchMarkets,
} from "@/lib/conceptMatch";
import { computePersonalizedOpportunity, computeTeamFit } from "@/lib/teamFit";

const EXAMPLES = [
  "We want to make a game where players run a toy store, physically stock shelves, buy inventory and expand the shop, with optional four-player co-op.",
  "A cozy relaxing automation game about building a small factory on a peaceful island.",
  "A run-based roguelike deckbuilder with tight combat and lots of card synergies.",
  "Co-op survival horror where 3 friends explore a haunted facility for loot.",
];

function tone(v: number) {
  return v >= 70 ? "text-emerald-300" : v >= 45 ? "text-amber-300" : "text-rose-300";
}

export function ConceptValidatorPage() {
  const { dataset } = useDataset();
  const team = useActiveTeam();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState("");

  const result = useMemo(() => {
    if (!dataset || !submitted.trim()) return null;
    const query = conceptToTags(submitted, dataset);
    const markets = matchMarkets(query, dataset);
    const games = matchGames(query, dataset);
    return { query, markets, games };
  }, [dataset, submitted]);

  const closest = result?.markets[0];
  const fit = closest ? computeTeamFit(team, closest.cluster) : null;
  const po = closest ? computePersonalizedOpportunity(team, closest.cluster, fit!) : null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-semibold text-ink">Concept Validator</h1>
        <p className="text-sm text-muted max-w-3xl">
          Describe a game concept in plain language. It maps to the closest Steam markets
          and evaluates demand, competition and fit for your team — a starting point for
          investigation, not a verdict. (Tag/keyword matching over real data; deep
          embeddings are Phase 2.)
        </p>
      </div>

      <div className="rounded-xl border border-edge bg-panel p-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. We want to make a game where players run a toy store, stock shelves, buy inventory and expand, with optional co-op."
          rows={3}
          className="w-full bg-panel2/40 border border-edge rounded-lg px-3 py-2 text-ink placeholder:text-muted/50 text-sm"
        />
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <button
            onClick={() => setSubmitted(text)}
            disabled={!text.trim()}
            className="px-4 py-1.5 rounded-md bg-sky-600/80 text-white text-sm hover:bg-sky-600 disabled:opacity-40"
          >
            Analyze concept
          </button>
          <span className="text-[11px] text-muted">or try:</span>
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => {
                setText(ex);
                setSubmitted(ex);
              }}
              className="text-[11px] px-2 py-1 rounded border border-edge text-muted hover:text-ink hover:bg-panel2"
            >
              {ex.split(" ").slice(0, 4).join(" ")}…
            </button>
          ))}
        </div>
      </div>

      {result && result.query.length === 0 && (
        <div className="text-sm text-muted">
          Couldn't map that to known market signals — try naming a mechanic, theme or genre
          (e.g. "shop", "co-op", "automation", "deckbuilder", "survival").
        </div>
      )}

      {result && result.query.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted">Detected signals:</span>
            {result.query.map((q) => (
              <span
                key={q.tag}
                className="text-[11px] px-2 py-0.5 rounded-full border border-indigo-500/40 text-indigo-200"
              >
                {q.tag}
              </span>
            ))}
          </div>

          {closest && fit && po ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* Closest market */}
              <div className="lg:col-span-2 rounded-xl border border-edge bg-panel p-4">
                <div className="text-[11px] uppercase tracking-wider text-muted">Closest market</div>
                <Link to={`/cluster/${closest.cluster.slug}`} className="text-lg font-semibold text-ink hover:text-sky-300">
                  {closest.cluster.name}
                </Link>
                <p className="text-sm text-muted mt-1">{closest.cluster.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                  {[
                    ["Attractiveness", closest.cluster.marketAttractivenessScore.value],
                    ["Demand", closest.cluster.demandScore.value],
                    ["Supply", closest.cluster.supplyPressureScore.value],
                    ["Gap", closest.cluster.gapScore.value],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <div className={`text-xl font-semibold tabular-nums ${tone(v as number)}`}>{v as number}</div>
                      <div className="text-[10px] text-muted">{k as string}</div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Team Fit</div>
                    <div className={`text-2xl font-semibold tabular-nums ${tone(fit.teamFit)}`}>
                      {Math.round(fit.teamFit)} <span className="text-xs text-muted font-normal">{fit.gate}</span>
                    </div>
                    <div className="text-[11px] text-muted">
                      Personal Opportunity {po.personalizedOpportunity}
                      {po.cap != null && <span className="text-rose-300"> (capped)</span>}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Competition</div>
                    <div className="text-ink text-sm">{closest.cluster.concentration.band}</div>
                    <div className="text-[11px] text-muted">
                      top-1 {Math.round(closest.cluster.concentration.top1Share * 100)}% ·{" "}
                      {closest.cluster.gameCount} games
                    </div>
                  </div>
                </div>

                {differentiators(result.query, closest.cluster).length > 0 && (
                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-wider text-muted mb-1">
                      Possible differentiators
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {differentiators(result.query, closest.cluster).map((d) => (
                        <span key={d} className="text-[11px] px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-200">
                          {d}
                        </span>
                      ))}
                    </div>
                    <p className="text-[11px] text-muted mt-1">
                      Angles in your concept the closest market doesn't already center on.
                    </p>
                  </div>
                )}

                {(fit.risks.length > 0 || fit.hardBlockers.length > 0) && (
                  <div className="mt-4">
                    <div className="text-[11px] uppercase tracking-wider text-muted mb-1">Production risks</div>
                    <div className="space-y-1">
                      {fit.hardBlockers.map((b) => (
                        <div key={b.code} className="text-[11px] text-rose-300">⛔ {b.message}</div>
                      ))}
                      {fit.risks.map((r) => (
                        <div key={r} className="text-[11px] text-amber-300/90">⚠ {r}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Adjacent markets + closest games */}
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-edge bg-panel p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Adjacent markets</div>
                  <div className="space-y-1.5">
                    {result.markets.slice(1, 5).map((m) => (
                      <Link key={m.cluster.id} to={`/cluster/${m.cluster.slug}`} className="flex items-center justify-between text-sm hover:text-sky-300">
                        <span className="text-ink truncate">{m.cluster.name}</span>
                        <span className="text-[11px] text-muted tabular-nums">{m.score}%</span>
                      </Link>
                    ))}
                    {result.markets.length <= 1 && <div className="text-[11px] text-muted">No close alternatives.</div>}
                  </div>
                </div>

                <div className="rounded-xl border border-edge bg-panel p-4">
                  <div className="text-[11px] uppercase tracking-wider text-muted mb-2">Closest existing games</div>
                  <div className="space-y-1.5">
                    {result.games.map((g) => (
                      <div key={g.game.appId} className="flex items-center justify-between text-sm">
                        <span className="text-ink truncate" title={g.matchedTags.join(", ")}>{g.game.name}</span>
                        <span className="text-[11px] text-muted tabular-nums">
                          {g.game.reviewTotal?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted">No market matched those signals closely.</div>
          )}

          <p className="text-[11px] text-muted">
            Language note: this surfaces markets that deserve deeper validation — it does not
            predict commercial success.
          </p>
        </>
      )}
    </div>
  );
}
