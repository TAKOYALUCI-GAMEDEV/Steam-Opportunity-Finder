# Steam Opportunity Finder
## Feature Extension Spec: Hidden Demand / Sleeper Market Search
### Version 0.1

## 1. Purpose

Add a new discovery engine to the existing Steam Opportunity Finder:

**Hidden Demand / Sleeper Market Search**

The goal is to find markets that appear relatively niche or low-supply, but where one or more products significantly outperform what would normally be expected.

This feature should help answer:

> Which small or underdeveloped Steam markets already show evidence of strong player demand?

This is different from the existing Market Gap feature.

- **Market Gap** asks: Is demand strong relative to supply?
- **Hidden Demand** asks: Are there unusually strong products inside a market that otherwise looks small or underdeveloped?
- **Team Fit** asks: Can this specific team realistically execute in that market?

These three discovery systems must remain separate but interoperable.

---

# 2. Core Product Principle

Do NOT define hidden demand as:

> "A small market with one successful game."

That creates too many false positives.

The feature must distinguish between:

1. **Single-hit anomaly**
2. **First proof of market**
3. **Repeatable hidden demand**
4. **Established niche**
5. **Dead niche**

The most strategically interesting cases are:

### First Proof Market

A small market where one product strongly outperforms expectations, but competitors have not yet flooded in.

### Repeatable Hidden Demand

A small market where multiple products outperform expectations, suggesting demand is repeatable rather than dependent on one breakout title.

---

# 3. Main User Story

A user should be able to open:

`Hidden Demand`

and see markets ranked by evidence that demand is stronger than visible supply suggests.

Example result:

| Market | Active Supply | Median Reviews | Best Title | Review Outperformance | Repeatability | Hidden Demand |
|---|---:|---:|---:|---:|---:|---:|
| First-person Antique Shop | 9 | 420 | 18,400 | 9.6x | 78 | 91 |
| Underwater Salvage Sim | 12 | 610 | 21,100 | 7.3x | 83 | 88 |
| Toy Shop Management | 6 | 190 | 14,200 | 13.8x | 32 | 74 |

The system must make it easy to distinguish:

- high-confidence repeatable markets
- interesting but fragile one-hit markets
- false positives caused by IP, F2P, publisher strength, meme virality, or other confounders

---

# 4. New Analytics Objects

Add the following metrics to `MarketCluster`.

```ts
MarketCluster {
  // existing fields...

  reviewOutperformanceScore
  reviewDensityScore
  repeatabilityScore
  hiddenDemandScore

  sleeperMarketType
  sleeperMarketConfidence

  outlierGameCount
  highOutperformerCount
}
```

Recommended enum:

```ts
type SleeperMarketType =
  | "single_hit_anomaly"
  | "first_proof_market"
  | "repeatable_hidden_demand"
  | "established_niche"
  | "dead_niche"
  | "insufficient_evidence";
```

---

# 5. Review Outperformance

This is the most important new metric.

Do not judge a game's performance only by raw review count.

A game's review performance should be compared against a relevant cohort.

## 5.1 Cohort Matching

For each game, create an expected-performance cohort using as many of the following as practical:

- release year
- release quarter
- price band
- Early Access vs full release
- free-to-play vs paid
- broad genre
- market cluster size
- release age

Minimum V1 cohort dimensions:

```text
Release Year
Price Band
Paid vs Free
Release Age Bucket
```

Example price bands:

```text
Free
< $5
$5–9.99
$10–19.99
$20–29.99
$30+
```

Example release-age buckets:

```text
0–90 days
91–365 days
1–2 years
2–5 years
5+ years
```

---

# 6. Expected Review Performance

For every game calculate:

```text
ExpectedReviews
```

Use the median review count of its matched cohort.

Prefer median over mean.

If cohort size is too small:

1. broaden release-age bucket
2. broaden price bucket
3. broaden genre requirement
4. lower confidence

Never silently generate high-confidence estimates from a tiny cohort.

---

# 7. Review Outperformance Ratio

Calculate:

```text
ReviewOutperformanceRatio =
ActualReviews / max(ExpectedReviews, minimumExpectedReviews)
```

Example:

```text
Expected Reviews: 1,200
Actual Reviews: 14,400

Outperformance Ratio = 12.0x
```

Use log scaling before aggregation.

Example normalized signal:

```text
LogOutperformance = log2(1 + ReviewOutperformanceRatio)
```

Winsorize extreme values.

---

# 8. Recent Review Outperformance

Historical accumulated reviews can overstate old titles.

Also calculate recent performance where snapshot data exists.

Required windows:

```text
30 days
90 days
365 days
```

For each game calculate:

```text
ReviewVelocity30d
ReviewVelocity90d
ReviewVelocity365d
```

Then compare velocity against release-age-adjusted peers.

Example:

```text
RecentOutperformanceRatio =
GameReviewVelocity90d /
MedianPeerReviewVelocity90d
```

This is important for identifying niche games that remain commercially active.

---

# 9. Review Density

Add a market-level metric:

```text
ReviewDensity =
TotalMeaningfulReviews / ActiveSupply
```

Do NOT use this alone.

It is only a supporting metric.

Also calculate:

```text
MedianReviewsPerGame
P75ReviewsPerGame
P90ReviewsPerGame
```

Prefer medians and percentiles over average review counts.

---

# 10. Active Supply

`ActiveSupply` should represent relevant recent market supply.

V1 definition:

```text
Number of released games in the cluster
within the selected release window
```

Default windows:

```text
12 months
24 months
36 months
5 years
```

The Hidden Demand view should default to:

```text
36 months
```

Allow the user to switch windows.

---

# 11. Successful Product Thresholds

Reuse the existing success-tier system where possible.

Default:

```text
Tiny        < 50 reviews
Small       50–499
Viable      500–1,999
Successful  2,000–9,999
Breakout    10,000+
```

These thresholds must remain configurable.

---

# 12. High Outperformer Definition

A game is a `HighOutperformer` if:

```text
ReviewOutperformanceRatio >= 3.0
```

AND:

```text
ReviewTotal >= minimumMeaningfulReviews
```

Default:

```text
minimumMeaningfulReviews = 500
```

Allow configuration.

A stronger class:

```text
ExtremeOutperformer
```

Default:

```text
ReviewOutperformanceRatio >= 8.0
AND
ReviewTotal >= 2,000
```

---

# 13. Repeatability Score

A market is more attractive if multiple games outperform.

Do not allow one blockbuster to produce a high Repeatability Score.

Suggested V1 formula:

```text
RepeatabilityScore =

40% ShareOfGamesAbove3xExpected
30% CountOfIndependentHighOutperformers
20% SuccessBreadthScore
10% MedianOutperformance
```

Normalize to 0–100.

Cap the impact of any single title.

---

# 14. Independent Outperformers

Try to avoid counting multiple games from the same franchise or publisher as independent proof.

For V1, define independence heuristically.

Games should be considered more independent if they differ in:

- developer
- publisher
- franchise
- release year

Store:

```ts
IndependentOutperformer {
  appId
  independentGroupId
}
```

If franchise data is unavailable, use developer + publisher as a fallback approximation.

---

# 15. Hidden Demand Score

Initial formula:

```text
HiddenDemandScore =

35% ReviewOutperformanceScore
25% RecentReviewVelocityOutperformance
20% InverseSupplyPressure
10% RepeatabilityScore
10% ReviewQualityScore
```

If recent velocity data is unavailable:

redistribute its weight proportionally and lower confidence.

Always return components.

Example:

```json
{
  "hiddenDemandScore": 86,
  "components": {
    "reviewOutperformance": 91,
    "recentVelocityOutperformance": 84,
    "inverseSupplyPressure": 88,
    "repeatability": 72,
    "reviewQuality": 78
  },
  "confidence": 81
}
```

---

# 16. Sleeper Market Classification

Implement deterministic classification rules.

## 16.1 Single-Hit Anomaly

Suggested:

```text
HighOutperformerCount == 1
AND RepeatabilityScore < 35
AND cluster concentration is high
```

Interpretation:

> One game performed extremely well, but there is insufficient evidence that demand is repeatable.

---

## 16.2 First Proof Market

Suggested:

```text
HighOutperformerCount >= 1
AND HiddenDemandScore >= 65
AND SupplyPressure <= 50
AND RecentSupplyGrowth <= moderate
AND RepeatabilityScore < 60
```

Interpretation:

> A product has demonstrated strong demand, but the market is not yet crowded.

---

## 16.3 Repeatable Hidden Demand

Suggested:

```text
HighOutperformerCount >= 2
AND RepeatabilityScore >= 60
AND HiddenDemandScore >= 70
AND SupplyPressure <= 60
```

Interpretation:

> Multiple independent titles significantly outperform peers while market supply remains relatively limited.

This should be considered one of the strongest discovery signals.

---

## 16.4 Established Niche

Suggested:

```text
Demand is healthy
AND multiple titles succeed
AND supply is no longer especially low
```

This is still interesting, but no longer truly "hidden."

---

## 16.5 Dead Niche

Suggested:

```text
Supply low
AND Demand low
AND no meaningful outperformers
```

Never treat low supply alone as opportunity.

---

# 17. Outlier Quality Check

Every high-performing game should receive an `OutlierQualityCheck`.

Goal:

Identify reasons that the game may not represent transferable market demand.

Suggested fields:

```ts
OutlierQualityCheck {
  appId

  majorPublisher
  majorExistingIP
  franchiseTitle
  freeToPlay
  unusuallyLowPrice
  viralOrMemeRisk
  streamerDrivenRisk
  longEarlyAccessHistory

  clusterPeersAlsoOutperform

  confounderCount
  adjustedConfidence
}
```

Some fields may initially be unknown.

Unknown must not equal false.

---

# 18. Confounder Handling

V1 should support reliable confounders first.

Prioritize:

```text
Free-to-play
Franchise / sequel
Same developer/publisher dominance
Extreme discount / very low price
Long release age
```

Do not require automatic detection of meme virality or streamer-driven success for MVP.

Those can remain:

```text
unknown
```

or manual annotation.

---

# 19. Concentration Check

Reuse or extend existing market concentration metrics.

Required:

```text
Top 1 Review Share
Top 3 Review Share
Top 10 Review Share
```

Example:

```text
Top game owns 81% of all cluster reviews
```

This should heavily reduce confidence that the market has repeatable hidden demand.

Do NOT necessarily lower raw demand.

Instead lower:

```text
Repeatability
SleeperMarketConfidence
```

---

# 20. Hidden Demand Confidence

Calculate separately from Hidden Demand Score.

Suggested inputs:

```text
cluster game count
cohort sample size
snapshot history length
number of independent outperformers
review data completeness
CCU availability
concentration
metadata completeness
```

Example:

```text
Hidden Demand: 89
Confidence: 41
```

must remain possible.

This means:

> Interesting signal, weak evidence.

---

# 21. New Page: Hidden Demand

Add a main navigation item:

```text
Hidden Demand
```

Purpose:

Find low-supply or underdeveloped markets with unexpectedly strong product performance.

---

# 22. Hidden Demand Page — Default Table

Default columns:

```text
Market
Hidden Demand Score
Confidence
Sleeper Type
Active Supply
Median Reviews
P90 Reviews
Best Product Reviews
High Outperformers
Repeatability
Supply Growth
Team Fit
```

`Team Fit` only appears when a Team Profile is selected.

Default sort:

```text
Hidden Demand Score DESC
```

Secondary preference:

```text
Confidence DESC
```

---

# 23. Required Filters

Add filters:

```text
Release Window

Minimum Hidden Demand Score
Minimum Confidence

Maximum Active Supply
Maximum Supply Pressure

Minimum High Outperformers
Minimum Repeatability

Paid Only
Exclude F2P

Exclude Franchise-heavy Markets
Exclude High Concentration

Minimum Review Quality

Team Profile
Minimum Team Fit
```

---

# 24. Important Preset Filters

Provide presets:

## Hidden Gems

```text
Low Supply
High Outperformance
At least 1 extreme outperformer
```

## First Proof

```text
Low Supply
Strong Hidden Demand
Low Repeatability requirement
Recent proof of demand
```

## Repeatable Demand

```text
At least 2 independent outperformers
High Repeatability
Low-to-medium supply
```

## Strong Fit For My Team

```text
Hidden Demand >= 65
Team Fit >= 70
Confidence >= 50
```

---

# 25. Hidden Demand Scatter Plot

Add an optional scatter visualization.

Axes:

```text
Y = Review Performance / Hidden Demand
X = Supply Pressure
```

Conceptual layout:

```text
                    REVIEW PERFORMANCE
                           ↑
                           │
      Hidden Demand        │      Proven / Competitive
                           │
            ●              │            ●
                           │
───────────────────────────┼────────────────────→ SUPPLY
                           │
         Dead Niche        │        Oversupplied
                           │
            ●              │            ●
```

This visualization is separate from the main Demand vs Supply Opportunity Map.

Do not replace the main map.

---

# 26. Hidden Demand Point Tooltip

Example:

```text
Antique Shop Management

Hidden Demand             88
Confidence                79

Active Supply              9
Median Reviews           420
P90 Reviews            8,900

High Outperformers          3
Repeatability              81

Best Outperformance      9.6x

Sleeper Type:
Repeatable Hidden Demand
```

When Team Profile selected:

```text
Team Fit                  87
Personal Opportunity      84
```

---

# 27. Cluster Detail Additions

Add a section:

```text
Hidden Demand Analysis
```

Display:

### Performance Distribution

```text
Expected review range
Actual review distribution
P50
P75
P90
```

### Outperforming Titles

For each:

```text
Game
Actual Reviews
Expected Reviews
Outperformance Ratio
Recent Review Velocity
Confounders
```

### Repeatability

Explain whether success appears:

```text
isolated
partially repeatable
repeatable
```

### Supply Response

Show:

```text
release count before breakout
release count after breakout
upcoming supply if available
```

This helps identify whether competitors are already entering.

---

# 28. First Proof Detection

A particularly important pattern is:

```text
Successful breakout appears
↓
Demand proven
↓
Supply has not reacted strongly yet
```

Add:

```text
FirstProofScore
```

Suggested formula:

```text
FirstProofScore =

40% BestRecentOutperformance
25% RecentReviewVelocity
20% LowSupply
15% LowSupplyGrowth
```

Use only games released within a recent period.

Default:

```text
last 36 months
```

---

# 29. Supply Reaction

Track whether supply increases after a major breakout.

For a breakout date:

```text
Before:
releases in previous 12 months

After:
releases in next/current 12 months
```

Calculate:

```text
SupplyReactionRatio
```

Example:

```text
Before breakout: 4 releases/year
After breakout: 5 releases/year

Supply reaction: weak
```

Potentially interesting.

Versus:

```text
Before: 5
After: 31

Supply reaction: strong
```

The opportunity may already be closing.

---

# 30. Recent Breakout Detection

Add market-level:

```text
recentBreakoutCount
```

Definition:

A game released in the selected recent window that reaches:

```text
ReviewOutperformanceRatio >= 5
```

and:

```text
ReviewTotal >= 2,000
```

Defaults should be configurable.

---

# 31. Integration With Existing Opportunity Map

Do not move market points.

Existing:

```text
X = Supply Pressure
Y = Demand Score
```

Add a display toggle:

```text
Color/Highlight by:
Market Attractiveness
Hidden Demand
Team Fit
Growth
Confidence
```

When:

```text
Highlight = Hidden Demand
```

markets with strong Hidden Demand become visually prominent.

Coordinates remain unchanged.

---

# 32. Integration With Team Fit

Hidden Demand must combine with Team Fit.

A hidden market is not automatically useful if the team cannot execute.

Add filter:

```text
Show hidden demand that fits my team
```

Recommended combined score:

```text
HiddenOpportunityForTeam =

50% HiddenDemandScore
35% TeamFit
15% TimingScore
```

Apply the same Team Fit gates already defined in the main spec.

Do NOT replace the existing `PersonalizedOpportunity`.

This is a specialized search score for Hidden Demand mode.

---

# 33. Example

Market:

```text
First-person Toy Shop Management
```

Metrics:

```text
Active Supply             7
Supply Pressure          19

Median Reviews          260
P90 Reviews           9,600

High Outperformers        2
Best Outperformance    12.4x

Repeatability            68
Hidden Demand            87
Confidence               71

Team Fit                 91
```

Interpretation:

```text
Possible repeatable hidden demand.

The market has limited recent supply, while two independent
titles significantly outperform comparable Steam releases.

Current team capability is a strong production match.

Main uncertainty:
small market sample size.
```

---

# 34. False Positive Example

Market:

```text
Licensed Anime Arena Fighter
```

Metrics:

```text
Active Supply             5
Median Reviews          300
Best Reviews          44,000
Best Outperformance    18.0x

High Outperformers        1
Repeatability            18
Top 1 Review Share       89%
Existing IP             true
```

Classification:

```text
Single-Hit Anomaly
```

Explanation:

```text
The market appears undersupplied, but observed demand is
dominated by one franchise title.

This is not sufficient evidence of transferable hidden demand.
```

---

# 35. Database Changes

Add tables or columns as appropriate.

Suggested new table:

```text
game_performance_cohorts
```

Fields:

```ts
GamePerformanceCohort {
  id

  releaseYear
  releaseAgeBucket
  priceBand
  freeToPlay

  gameCount

  medianReviews
  p25Reviews
  p75Reviews
  p90Reviews

  medianReviewVelocity30d
  medianReviewVelocity90d
  medianReviewVelocity365d

  createdAt
  analyticsVersion
}
```

Add:

```text
game_outperformance_metrics
```

```ts
GameOutperformanceMetric {
  appId
  cohortId

  expectedReviews
  actualReviews
  outperformanceRatio

  velocity30dOutperformance
  velocity90dOutperformance
  velocity365dOutperformance

  outlierClass

  calculatedAt
  analyticsVersion
}
```

Add:

```text
cluster_hidden_demand_metrics
```

```ts
ClusterHiddenDemandMetric {
  clusterId

  activeSupply
  reviewDensity

  reviewOutperformanceScore
  repeatabilityScore
  hiddenDemandScore
  firstProofScore

  highOutperformerCount
  independentOutperformerCount

  sleeperMarketType
  confidenceScore

  calculatedAt
  analyticsVersion
}
```

---

# 36. API Changes

Add:

```text
GET /hidden-demand
```

Parameters:

```text
releaseWindow
minHiddenDemand
minConfidence
maxSupply
minRepeatability
minOutperformers
teamId
minTeamFit
excludeF2P
excludeFranchiseHeavy
```

Add:

```text
GET /clusters/{id}/hidden-demand
```

Add:

```text
GET /games/{appid}/outperformance
```

Optional:

```text
POST /analytics/rebuild-hidden-demand
```

---

# 37. API Example

```json
{
  "clusterId": "toy-shop-management",
  "name": "Toy Shop Management",

  "hiddenDemandScore": 87,
  "confidence": 71,
  "sleeperMarketType": "repeatable_hidden_demand",

  "activeSupply": 7,
  "medianReviews": 260,
  "p90Reviews": 9600,

  "highOutperformerCount": 2,
  "independentOutperformerCount": 2,
  "repeatabilityScore": 68,

  "bestOutperformanceRatio": 12.4,

  "teamFit": 91,
  "hiddenOpportunityForTeam": 88
}
```

---

# 38. Analytics Versioning

Add versions:

```text
outperformance_model_v1
hidden_demand_v1
repeatability_v1
first_proof_v1
```

All calculations must remain reproducible.

---

# 39. Minimum Data Requirements

A cluster should not receive a normal-confidence Hidden Demand rating unless:

```text
gameCount >= 5
```

For:

```text
gameCount < 5
```

classification should default to:

```text
insufficient_evidence
```

unless manually overridden.

It may still be displayed when:

```text
Show Experimental Signals = true
```

---

# 40. Required Testing Scenarios

Create deterministic fixtures for:

## Scenario A — Repeatable Hidden Demand

```text
10 games
3 outperform strongly
low supply
multiple developers
```

Expected:

```text
high Hidden Demand
high Repeatability
repeatable_hidden_demand
```

## Scenario B — One Franchise Hit

```text
8 games
1 game owns 85% reviews
major IP
```

Expected:

```text
single_hit_anomaly
low Repeatability
```

## Scenario C — Dead Niche

```text
7 games
all underperform
low reviews
```

Expected:

```text
dead_niche
```

## Scenario D — Market Already Flooding

```text
historically low supply
recent hit
release supply +300%
```

Expected:

```text
Hidden Demand may remain high
Timing should decrease
```

## Scenario E — Hidden Demand + Strong Team Fit

Expected:

```text
high HiddenOpportunityForTeam
```

## Scenario F — Hidden Demand + Poor Team Fit

Expected:

```text
market remains visible
Team Fit low
combined recommendation suppressed
```

---

# 41. Acceptance Criteria

The feature is complete when:

1. Every eligible game receives a review outperformance estimate.
2. Review expectations are cohort-adjusted.
3. Recent review velocity can influence hidden-demand scoring.
4. Markets expose Active Supply.
5. Markets expose Review Density.
6. Markets expose Repeatability.
7. One-hit markets can be distinguished from repeatable markets.
8. Market concentration influences confidence.
9. Hidden Demand has its own confidence score.
10. Users can browse a dedicated Hidden Demand page.
11. Users can filter by supply, repeatability, confidence, and Team Fit.
12. Users can open a cluster and inspect outperforming games.
13. Users can see why an outperformer may be misleading.
14. Hidden Demand can be used as a highlight mode on the main Opportunity Map.
15. Team Fit remains independent from market metrics.
16. Hidden Demand + Team Fit can generate a specialized combined search score.
17. All scores expose components.
18. No feature claims that a market or concept is guaranteed to succeed.

---

# 42. Implementation Priority

Implement in this order:

## Phase HD-1

```text
Performance cohorts
Review outperformance
Active supply
Review density
```

## Phase HD-2

```text
High outperformer detection
Repeatability
Concentration checks
Hidden Demand Score
```

## Phase HD-3

```text
Sleeper market classification
Hidden Demand page
Filters
Cluster detail section
```

## Phase HD-4

```text
First Proof detection
Supply reaction
Recent breakout logic
```

## Phase HD-5

```text
Team Fit integration
Hidden Opportunity for Team
Opportunity Map highlight mode
```

Do not block HD-1 through HD-3 on advanced AI analysis.

---

# 43. Product Definition

The feature should ultimately answer:

> "Where are Steam players already demonstrating stronger demand than the visible size of the market would suggest?"

The strongest signal is not:

```text
few games
```

It is:

```text
few games
+
unexpectedly strong review performance
+
recent demand
+
multiple independent proofs
+
supply has not yet caught up
```

When combined with Team Fit, the final question becomes:

> "Which hidden-demand markets are this specific team unusually well positioned to enter?"
