# Steam Opportunity Finder
## Product & Technical Specification v0.1

### Working Product Statement

**Find underserved Steam markets that fit what your team can actually build.**

This is not intended to be another SteamDB, SteamSpy, or generic game analytics dashboard.

The product should answer:

> What kinds of games represent attractive Steam market opportunities for this specific development team?

The system combines:

**Market Demand × Market Gap × Timing × Team Fit**

The main output is an interactive **Opportunity Map**, where market clusters are represented as points.

---

# 1. Product Goals

The system must help developers answer five questions:

1. Where is player demand on Steam?
2. Where is supply becoming saturated?
3. Where is demand growing faster than supply?
4. What gameplay/theme combinations appear underserved?
5. Which of those opportunities realistically fit the user's team, budget, capabilities, and development time?

The tool must distinguish between:

**A good market**

and

**A good market for this team.**

These are not the same thing.

---

# 2. Product Principles

## 2.1 Do not define "market gap" as "few games exist"

Low supply can simply mean there is no demand.

A meaningful opportunity requires some combination of:

- demonstrated demand
- demand growth
- reasonable competition
- broad enough success distribution
- manageable incoming supply
- realistic production requirements
- strong team capability fit

---

## 2.2 Market data and Team Fit must remain separate

Never modify objective market coordinates because of team capability.

Example:

A Survival Craft market may have:

- Demand: 95
- Supply Pressure: 91
- Team Fit: 24

It must still appear in the high-demand/high-supply area of the map.

Team Fit affects:

- point emphasis
- opacity
- outline
- recommendation priority
- personalized opportunity score

It does **not** change the market's actual position.

---

## 2.3 Scores must be explainable

Never display an unexplained AI-generated score such as:

> Team Fit: 78

Every score must expose:

- contributing metrics
- weights
- data confidence
- shortfalls
- strengths
- blockers

Users must be able to understand why a score exists.

---

# 3. MVP Scope

The MVP should implement the complete decision loop:

```text
Steam Data
    ↓
Game Records
    ↓
Tag Clusters
    ↓
Market Metrics
    ↓
Market Gap Detection
    ↓
Team Capability Profile
    ↓
Market Requirement Profile
    ↓
Team Fit
    ↓
Personalized Opportunity
    ↓
Opportunity Map
```

The MVP does NOT need accurate revenue estimation.

Do not block the MVP on revenue estimates.

Primary signals for V1:

- review count
- review velocity
- review score
- current player snapshots
- release frequency
- release growth
- tag combinations
- market concentration
- successful-title distribution
- upcoming supply where available

---

# 4. Non-Goals for V1

Do not implement these initially:

- precise revenue estimates
- wishlist estimates
- console market analysis
- mobile market analysis
- publisher CRM
- influencer discovery
- Twitch/YouTube analysis
- automatic game concept generation
- financial forecasting
- prediction that a game "will succeed"
- full reconstruction of historical Steam CCU
- SteamDB scraping

Architect the system so some of these can be added later.

---

# 5. Core Product Object: Market Point

The fundamental object displayed on the Opportunity Map is a:

`MarketCluster`

A MarketCluster represents a meaningful combination of game characteristics.

Examples:

```text
Automation + Base Building + Cozy

First Person + Shop Management + Co-op

Roguelike + Creature Collector

Physics + Puzzle + Comedy

Deckbuilding + Tactical RPG
```

A point must NOT represent a single game.

Individual games belong to one or more MarketClusters.

---

# 6. Opportunity Map

This is the primary interface.

## Axes

```text
                         DEMAND
                           ↑
                           │
        Opportunity        │       Hot / Competitive
                           │
        ●                  │              ●
                           │
───────────────────────────┼────────────────────────→
                           │                      SUPPLY
         Niche             │          Saturated
                           │
        ●                  │              ●
                           │
```

### Y Axis

`Demand Score`

0–100.

### X Axis

`Supply Pressure`

0–100.

Low supply = left.

High supply = right.

---

# 7. Market Point Visual Encoding

Each MarketCluster point contains multiple dimensions.

### Position

X = Supply Pressure

Y = Demand Score

### Point Size

Represents market activity / evidence strength.

Suggested calculation:

- number of meaningful games
- total reviews
- activity volume

Do NOT directly equate point size with revenue.

### Team Fit

When "My Team" mode is active, Team Fit affects point visual prominence.

Example:

- high Team Fit → strong point
- medium Team Fit → normal point
- low Team Fit → visually subdued
- hard blocker → warning marker

Do not move the point.

### Growth

Represent growth separately, for example with:

- ring
- arrow
- growth indicator

### Confidence

Clusters with insufficient evidence should visually communicate uncertainty.

---

# 8. Opportunity Map Modes

Provide at minimum:

```text
Global Market
My Team
```

Later support:

```text
Team Scenario A
Team Scenario B
5-person Team
18-month Production
With Multiplayer
Without Multiplayer
```

Changing a Team Profile should immediately recalculate personalized opportunity scores.

---

# 9. MarketCluster Data Model

Each cluster should contain:

```ts
MarketCluster {
  id
  slug
  name
  description

  primaryTags[]
  secondaryTags[]

  gameCount
  releasedGameCount
  upcomingGameCount

  demandScore
  demandGrowthScore
  supplyPressureScore
  supplyGrowthScore
  successBreadthScore
  timingScore
  marketAttractivenessScore
  gapScore

  concentrationScore
  confidenceScore

  requirementProfile

  createdAt
  updatedAt
}
```

---

# 10. Steam Game Data Model

Minimum Game entity:

```ts
Game {
  appId
  name

  developer[]
  publisher[]

  releaseDate
  comingSoon
  earlyAccess

  price
  currency

  genres[]
  categories[]
  tags[]

  shortDescription
  aboutText

  supportedLanguages[]

  windows
  mac
  linux

  reviewPositive
  reviewNegative
  reviewTotal
  reviewScorePercent

  currentPlayers

  createdAt
  updatedAt
}
```

Do not overwrite historical metrics when refreshing.

Store snapshots separately.

---

# 11. Snapshot Models

## GameMetricSnapshot

```ts
GameMetricSnapshot {
  id
  appId
  timestamp

  totalReviews
  positiveReviews
  negativeReviews

  reviewScorePercent

  currentPlayers

  price
  discountPercent
}
```

Snapshots allow calculation of:

- review velocity
- CCU trends
- review growth
- price history
- market momentum

---

# 12. Data Sources

Implement all Steam integrations behind provider interfaces.

Never tightly couple analytics code to HTML parsing or one external provider.

Suggested interfaces:

```ts
interface AppCatalogProvider {}

interface GameMetadataProvider {}

interface ReviewProvider {}

interface PlayerCountProvider {}

interface TagProvider {}

interface TopSellerProvider {}
```

---

# 13. Steam Official Sources

Use official sources where possible.

### Application List

Steam Web API:

`IStoreService/GetAppList`

Use incremental updates when supported.

### Reviews

Steam review endpoint:

`store.steampowered.com/appreviews/<appid>?json=1`

Support cursor pagination.

### Current Players

Steam Web API:

`ISteamUserStats/GetNumberOfCurrentPlayers`

### Metadata

Implement a replaceable StoreMetadata provider.

If an undocumented Steam Store endpoint or public store-page parser is used, isolate it behind this provider.

The rest of the application must not depend on the implementation.

### Tags

Steam Tags are strategically important.

Store ordered tags when possible.

Tag ranking matters.

Steam's highest weighted tags should receive greater analytical importance than generic low-information tags.

Do not scrape SteamDB.

---

# 14. Data Provenance

Every externally sourced metric should contain:

```ts
DataProvenance {
  provider
  fetchedAt
  confidence
}
```

This is important because not all Steam-derived data will have the same reliability.

---

# 15. Collection Schedule

Recommended MVP schedule:

### App catalog

Daily.

### Game metadata

Every 7 days normally.

Every 24 hours for:

- new releases
- upcoming titles
- tracked markets

### Reviews

Daily.

### CCU

For tracked games:

Every 1–6 hours.

For broad market coverage:

Daily is sufficient for MVP.

### Top Seller data

Optional in V1.

Keep adapter support but do not make core scoring depend on this signal.

---

# 16. Historical Data Limitation

Do not pretend historical snapshots existed before collection began.

The database should clearly distinguish:

```text
Observed Historical Data

vs

Imported / Estimated Historical Data
```

The confidence score should reflect this.

---

# 17. Tag Normalization

Steam Tags are the primary V1 market taxonomy.

However, generic tags should receive reduced analytical weight.

Examples:

Low-information:

```text
Indie
Singleplayer
Action
Casual
Adventure
```

Higher-information:

```text
Automation
Creature Collector
Deckbuilding
Extraction Shooter
Colony Sim
Shop Keeper
Immersive Sim
Precision Platformer
```

Create:

```ts
Tag {
  id
  name
  informationWeight
  gameCount
}
```

Information weight can initially be based on inverse frequency.

Rare meaningful tags should generally carry more cluster information than extremely common tags.

---

# 18. Market Cluster Generation — V1

Do NOT start with an LLM.

Use deterministic clustering first.

### Step 1

Collect the highest-weighted tags for games.

### Step 2

Remove or down-weight generic tags.

### Step 3

Generate combinations of 2–4 informative tags.

### Step 4

Use frequent-itemset mining or tag co-occurrence analysis.

Possible implementation:

FP-Growth.

### Step 5

Discard clusters with insufficient support.

Example configurable threshold:

```text
minimum games = 8
```

### Step 6

Merge highly overlapping clusters.

Example:

```text
Automation + Base Building

Automation + Base Building + Singleplayer
```

should likely represent the same underlying market.

### Step 7

Generate a readable cluster name.

Example:

```text
Automation + Base Building + Relaxing

→ "Cozy Automation Builders"
```

AI can assist with naming, but clustering must remain deterministic.

---

# 19. Market Demand Score

All metrics must be normalized to percentile values before weighting.

Prefer:

- log transforms
- winsorization
- percentile ranking

Avoid averages heavily distorted by blockbuster games.

Initial Demand Score:

```text
DemandScore =

30% ReviewVelocity
25% CurrentPlayerStrength
20% ReleaseAdjustedReviewPerformance
15% ReviewVolume
10% ReviewQuality
```

If CCU data is unavailable:

redistribute its weight proportionally.

Every score should have:

```text
value
confidence
components
```

---

# 20. Review Velocity

Review Velocity is one of the most important V1 signals.

Calculate:

```text
Reviews gained / time
```

Support:

```text
7 days
30 days
90 days
365 days
```

Normalize for release age.

Do not directly compare a two-week-old game to a six-year-old title without cohort adjustment.

---

# 21. Supply Pressure

Supply Pressure represents how crowded the market is.

Initial formula:

```text
SupplyPressure =

60% ReleaseVolumePercentile
40% ReleaseGrowthPercentile
```

Inputs:

```text
games released in previous 12 months
games released in previous 24 months
YoY release growth
```

Later add:

```text
upcoming releases
publisher activity
wishlist competition
```

---

# 22. Demand Growth

Calculate market demand trends from snapshots.

Possible signals:

```text
median review velocity growth
median CCU growth
share of new releases outperforming cohort
```

Output:

```text
DemandGrowthScore 0–100
```

---

# 23. Market Success Breadth

This prevents blockbuster distortion.

Default success tiers using reviews:

```text
Tiny        < 50 reviews
Small       50–499
Viable      500–1,999
Successful  2,000–9,999
Breakout    10,000+
```

These thresholds must be configurable.

For each cluster calculate:

```text
% > 500
% > 2,000
% > 10,000

median reviews
P25
P50
P75
P90
```

---

# 24. Hit Dependency / Concentration

A market where one game owns almost all visible success is riskier than a market where multiple games succeed.

Calculate concentration.

Possible V1 approach:

```text
Top 1 share of cluster reviews
Top 3 share
Top 10 share
```

Later consider a formal HHI-style concentration metric.

Display:

```text
Distributed
Moderately Concentrated
Highly Concentrated
```

but preserve numerical metrics.

---

# 25. Gap Score

"Market Gap" should mean:

**Strong or growing demand relative to current supply.**

Initial:

```text
GapScore =

40% DemandScore
25% DemandGrowthScore
20% SuccessBreadthScore
15% InverseSupplyPressure
```

Do not interpret a high Gap Score as guaranteed commercial success.

---

# 26. Timing Score

Timing evaluates whether entering the market now appears favorable.

Initial:

```text
TimingScore =

60% DemandGrowthScore
40% InverseUpcomingSupplyPressure
```

If reliable upcoming supply data is unavailable:

use demand growth and current supply growth instead and reduce confidence.

---

# 27. Market Attractiveness Score

Keep this separate from Team Fit.

Initial formula:

```text
MarketAttractiveness =

35% DemandScore
25% DemandGrowthScore
20% SuccessBreadthScore
20% InverseSupplyPressure
```

Always expose the underlying metrics.

---

# 28. Team Profile

Team Profile is a first-class product object.

```ts
TeamProfile {
  id
  name

  teamSize
  developmentMonths
  productionBudget
  outsourceBudget

  members[]

  capabilityProfile

  constraints
  preferences

  createdAt
  updatedAt
}
```

---

# 29. Team Members

Optional but strongly preferred.

Example:

```ts
TeamMember {
  id
  role
  seniority
  fte

  capabilityOverrides
}
```

Example roles:

```text
Game Designer
Gameplay Programmer
Network Engineer
3D Artist
2D Artist
Technical Artist
Animator
UX Designer
Writer
Producer
Audio Designer
```

Role templates can pre-populate capabilities.

Users must be able to override them.

---

# 30. The 15 Team Capability Dimensions

Use the following standardized capability dimensions.

Every dimension uses:

```text
0 = none
1 = minimal
2 = basic
3 = competent
4 = strong
5 = expert / core strength
```

## Engineering

### 1. Gameplay Systems Engineering

Gameplay mechanics, interactions, state systems, gameplay architecture.

### 2. Networking & Multiplayer

Replication, matchmaking, multiplayer architecture, synchronization.

### 3. Backend & Live Services

Accounts, persistence, servers, cloud infrastructure, telemetry services.

### 4. Procedural / Simulation Systems

Procedural generation, simulation, AI systems, automation systems.

### 5. Optimization & Platform Engineering

Performance, memory, platform integration, technical optimization.

## Content Production

### 6. 2D Art & Visual Design

Illustration, UI art, concept production, 2D asset pipelines.

### 7. 3D Asset Production

Modeling, texturing, materials, environment assets.

### 8. Animation & VFX

Character animation, effects, rigging, animation systems.

### 9. Level / World Content Production

Handcrafted levels, environments, missions, world-building workload.

### 10. Narrative & Writing

Story, dialogue, quests, narrative content.

### 11. Audio Production

Sound design, implementation, music production capability.

## Design

### 12. Systems / Economy Design

Progression, economy, balancing, systemic gameplay, reward structures.

### 13. UX / UI Design

Interaction design, information hierarchy, menus, onboarding, usability.

## Operations

### 14. QA / Release Operations

Testing, certification, build management, regression testing.

### 15. LiveOps / Community Capability

Post-launch content, events, community operations, ongoing support.

---

# 31. Team Constraints

Capabilities alone are not enough.

Support explicit constraints.

Example:

```ts
TeamConstraints {
  multiplayerAllowed
  backendAllowed

  maxDevelopmentMonths
  maxBudget

  preferredPlatforms[]

  contentHeavyAllowed

  liveOpsAllowed

  proceduralPreferred

  targetPriceMin
  targetPriceMax
}
```

Examples:

```text
"No PvP"

"Co-op is acceptable"

"No permanent backend"

"Maximum 12 months"

"Small handcrafted content budget"

"Strong preference for systemic gameplay"
```

Hard constraints must influence Team Fit.

---

# 32. Market Requirement Profile

Every MarketCluster must have a production requirement profile using the same 15 dimensions.

Example:

```text
Survival Craft

Gameplay Systems           5
Networking                 4
Backend                     3
Simulation                  5
Optimization                4

2D Art                      2
3D Art                      5
Animation                   4
World Content               5
Narrative                   2
Audio                       3

Systems Design              5
UX                          4

QA                          4
LiveOps                     3
```

Values use 0–5.

---

# 33. Requirement Profile Generation

V1 should use a combination of:

1. Tag rules
2. Game metadata
3. Cluster statistics
4. Optional AI inference
5. Manual override

Examples:

```text
Online Co-op
→ Networking requirement +3 or more

MMO
→ Networking 5
→ Backend 5
→ LiveOps 5

Open World
→ World Content +4

Story Rich
→ Narrative +4

Automation
→ Systems Design +4
→ Simulation +4

Physics
→ Gameplay Engineering +4
→ QA +3

Competitive
→ Networking +3
→ QA +3
→ LiveOps +3
```

Store explanations for each inferred requirement.

---

# 34. Requirement Confidence

Every cluster requirement profile must include:

```text
confidenceScore
```

The UI must communicate whether requirements come from:

```text
High-confidence rules
Observed games
AI inference
Manual override
```

---

# 35. Team Fit Calculation

For each capability dimension:

```text
TeamCapability = C
MarketRequirement = R
```

Scale internally to 0–100.

Calculate coverage:

```text
Coverage = min(C / R, 1)
```

If requirement is zero, ignore that dimension.

Weighted Team Fit:

```text
CapabilityFit =
Σ(Coverage × RequirementWeight)
/
Σ(RequirementWeight)
```

High requirements should carry more weight.

---

# 36. Scope Fit

Calculate separately:

```text
ScopeFit
```

Based on:

- team size
- development duration
- production budget
- outsource budget

V1 may initially use heuristic market scope classes:

```text
Micro
Small
Medium
Large
Very Large
```

Example:

A large open-world survival title should strongly mismatch:

```text
2 people
9 months
€80k
```

even if the team has strong systems skills.

---

# 37. Final Team Fit

Initial:

```text
TeamFit =

75% CapabilityFit
25% ScopeFit
```

---

# 38. Hard Blockers

Team Fit must support hard blockers.

Example blocker:

```text
Market requires Networking >= 4

Team Networking <= 1

AND user has multiplayerAllowed = false
```

Return:

```text
Hard Blocker:
Multiplayer architecture exceeds team constraints.
```

Other possible blockers:

- backend requirement
- massive content production
- LiveOps requirement
- production duration
- budget

---

# 39. Team Fit Gates

Team Fit is not just another weighted score.

Apply gates.

Suggested defaults:

```text
Team Fit >= 75
Strong fit

60–74
Viable

40–59
High execution risk

< 40
Poor fit
```

If TeamFit < 40:

Personalized Opportunity cannot exceed 55.

If a hard blocker exists:

Personalized Opportunity cannot exceed 45.

Scores remain visible so users understand the underlying market opportunity.

---

# 40. Personalized Opportunity Score

This score exists mainly for sorting and recommendations.

Do not hide its components.

Initial:

```text
PersonalizedOpportunity =

45% MarketAttractiveness
35% TeamFit
20% TimingScore
```

Then apply Team Fit gates.

Display:

```text
Market Attractiveness   84
Team Fit                91
Timing                  77
──────────────────────────
Personal Opportunity    86
```

---

# 41. Team Fit Explanation

Every cluster must generate an explanation.

Example:

```text
TEAM FIT: 91 / 100

Strengths

✓ Strong systems design capability
✓ Low narrative requirement
✓ Low handcrafted content burden
✓ Fits 12-month development window
✓ No permanent backend required

Risks

⚠ Physics interactions require strong engineering
⚠ Multiplayer would significantly increase complexity
```

The explanation should come from structured metrics first.

An LLM may rewrite it for readability.

The LLM must NOT invent reasons.

---

# 42. Capability Gap Simulation

This is an important product feature.

Users should eventually be able to ask:

```text
What happens if we add one network programmer?
```

or:

```text
What if development changes from 12 to 18 months?
```

or:

```text
What if we remove co-op?
```

The Team Profile should be clonable.

Recalculate all opportunity scores immediately.

Example:

```text
Current Team Fit: 61

Add:
1 Senior Network Engineer

New Team Fit: 79
```

Do not rebuild market analytics when only the Team Profile changes.

---

# 43. Page 1 — Opportunity Map

Primary landing page.

Required controls:

```text
Market mode:
Global / My Team

Release window:
12m / 24m / 36m / 5y

Minimum cluster size

Minimum confidence

Tag filters

Team profile selector
```

Tooltip for every point:

```text
Cozy Automation

Demand                  82
Supply Pressure         34
Demand Growth           88
Success Breadth         72
Market Attractiveness   81

Team Fit                93
Personal Opportunity    87

Games                    38
```

Click point → Cluster Detail.

---

# 44. Page 2 — Market Explorer

Allow searching:

```text
tag
genre
mechanic
theme
cluster name
game
```

Results should include:

```text
related clusters
related games
market metrics
trend
```

---

# 45. Page 3 — Cluster Detail

Example:

```text
Co-op Shop Management
```

Sections:

### Market Summary

Demand
Supply
Growth
Timing
Team Fit

### Historical Trend

Review velocity
Release volume
CCU

### Success Distribution

P25
Median
P75
P90

Success tiers.

### Top Games

Representative games.

Do not only show the biggest games.

Include:

```text
market leaders
median performers
recent breakout games
recent failures
```

### Market Requirements

15-dimension production profile.

### Team Fit

Capability comparison.

### Risks

Examples:

```text
incoming competition
high concentration
high production burden
low evidence confidence
```

---

# 46. Page 4 — Team Profile

User can configure:

```text
Team size
Members
Roles
Seniority
Budget
Development time
Outsourcing

Capabilities
Constraints
Preferences
```

Show radar/bar comparison between:

```text
Team capability
Market requirement
```

for selected markets.

---

# 47. Page 5 — Opportunity Finder

Rank clusters by:

```text
Personalized Opportunity
```

Filters:

```text
Minimum Team Fit

Minimum Demand

Maximum Supply Pressure

Minimum Growth

Maximum production complexity

Multiplayer / Singleplayer

Development duration

Budget
```

Example output:

```text
1. Cozy Automation
2. Physics Puzzle
3. Small Co-op Management
4. Creature Collector Roguelite
```

Do NOT describe these as predictions of commercial success.

Describe them as markets deserving deeper investigation.

---

# 48. Market Gap Explorer

This should be a dedicated view or mode.

Quadrants:

```text
High Demand / Low Supply
High Demand / High Supply
Low Demand / Low Supply
Low Demand / High Supply
```

Provide an additional filter:

```text
Show only high Team Fit
```

This is one of the core product experiences.

---

# 49. Latent Market Gaps — Phase 2

Tag combinations only reveal known classifications.

The future system should identify markets not explicitly represented by Steam Tags.

Example:

```text
"Run a physical small business"

player manually performs tasks
→ earns money
→ upgrades workspace
→ expands operation
```

Games may include:

```text
supermarket
gas station
card shop
restaurant
repair shop
pawn shop
```

Steam may not contain one tag representing this gameplay fantasy.

Phase 2 should use semantic embeddings to identify these clusters.

---

# 50. Semantic Game Representation — Phase 2

Generate embeddings from:

```text
short description
about text
important tags
feature descriptions
```

Create vectors using `pgvector`.

Potential latent dimensions include:

```text
player fantasy
core loop
interaction model
progression model
social structure
content structure
```

Do NOT replace Tag Clusters.

Semantic clusters should exist beside Tag Clusters.

---

# 51. Latent Gap Detection — Phase 2

Goal:

Find gameplay fantasies where:

```text
similar player demand exists
+
multiple adjacent concepts succeed
+
few direct implementations exist
```

Output should use cautious language:

```text
Possible Concept Space
```

not:

```text
Guaranteed Market Gap
```

---

# 52. Concept Validator — Phase 2

User input:

```text
"We want to make a game where players run a toy store,
physically stock shelves, buy inventory, and expand the
shop, with optional four-player co-op."
```

System should:

1. Generate semantic representation.
2. Find closest games.
3. Find closest MarketClusters.
4. Identify adjacent player fantasies.
5. Evaluate demand.
6. Evaluate supply.
7. Evaluate Team Fit.
8. Surface production risks.

Output:

```text
Closest Market:
First-person Shop Management

Adjacent Markets:
Co-op Job Sim
Business Simulation
Hands-on Sandbox

Market Attractiveness
Team Fit
Competition
Possible Differentiators
Production Risks
```

---

# 53. Recommended Technical Stack

Use a monorepo.

Suggested:

```text
Frontend
Next.js
TypeScript
Tailwind
shadcn/ui
D3 or ECharts for market visualization

Backend
Python
FastAPI
Pydantic
SQLAlchemy
Alembic

Analytics
Python
pandas
numpy
scikit-learn
mlxtend for FP-Growth if appropriate

Database
PostgreSQL
pgvector

Background Jobs
Redis
RQ or Celery

Development
Docker Compose
```

Avoid excessive infrastructure for V1.

---

# 54. Repository Structure

Suggested:

```text
/apps
  /web

/services
  /api
  /worker

/packages
  /shared

/analytics
  /clustering
  /scoring
  /team_fit

/data
  /fixtures

/docs

/docker-compose.yml
README.md
```

---

# 55. Backend API

Minimum API routes:

```text
GET /games
GET /games/{appid}

GET /clusters
GET /clusters/{id}

GET /clusters/{id}/games
GET /clusters/{id}/metrics

GET /opportunities

GET /teams
POST /teams
GET /teams/{id}
PATCH /teams/{id}
DELETE /teams/{id}

POST /teams/{id}/simulate

POST /admin/ingestion/run
GET /admin/ingestion/status

POST /analytics/rebuild-clusters
POST /analytics/recalculate
```

---

# 56. Opportunity Query Example

```text
GET /opportunities
  ?teamId=abc
  &releaseWindow=36m
  &minTeamFit=60
  &minConfidence=50
```

Response:

```json
{
  "clusters": [
    {
      "id": "...",
      "name": "Cozy Automation",
      "demandScore": 82,
      "supplyPressure": 37,
      "marketAttractiveness": 81,
      "teamFit": 93,
      "timing": 84,
      "personalizedOpportunity": 87
    }
  ]
}
```

---

# 57. Score Transparency API

Every score endpoint should support detailed components.

Example:

```json
{
  "teamFit": 74,
  "capabilityFit": 79,
  "scopeFit": 59,
  "hardBlockers": [],
  "dimensions": [
    {
      "dimension": "networking",
      "teamCapability": 40,
      "marketRequirement": 65,
      "coverage": 0.62
    }
  ]
}
```

This is essential.

---

# 58. Database Tables

Minimum tables:

```text
games
game_tags
tags

game_metric_snapshots

market_clusters
market_cluster_tags
market_cluster_games
market_cluster_snapshots

team_profiles
team_members
team_capabilities

cluster_requirements

opportunity_scores

ingestion_runs
data_provenance
```

Phase 2:

```text
game_embeddings
semantic_clusters
semantic_cluster_games
```

---

# 59. Data Quality

Never silently substitute missing metrics with zero.

Use:

```text
null
```

and recalculate weights when necessary.

Every aggregate score should include:

```text
confidenceScore
```

Example:

```text
Demand: 78
Confidence: 92

Timing: 71
Confidence: 44
```

---

# 60. Confidence Score

Confidence can initially consider:

```text
number of games
snapshot history length
data completeness
review sample size
CCU availability
cluster stability
```

Markets with weak evidence must not rank highly without warning.

---

# 61. Analytics Versioning

Score formulas will change.

Every calculated result should include:

```text
analyticsVersion
```

Example:

```text
market_score_v1
team_fit_v1
cluster_model_v1
```

Do not make historical results impossible to reproduce.

---

# 62. UI Design Direction

The product should feel like:

```text
market intelligence
+
strategy tool
```

not:

```text
Steam storefront
```

Prioritize:

- dense but readable data
- strong hierarchy
- interactive charts
- explanations
- comparisons
- minimal decorative UI

The Opportunity Map should dominate the main experience.

---

# 63. Main Opportunity Map Interaction

On hover:

show market metrics.

On click:

open Cluster Detail.

Allow toggling:

```text
Market Attractiveness
Team Fit
Growth
Confidence
```

Point position remains Demand vs Supply.

Only visual encoding changes.

---

# 64. Compare Markets

Allow selecting 2–5 clusters.

Comparison table:

```text
                    Cozy Auto    Survival    Physics Puzzle

Demand                 82            94            68
Supply                 35            91            29
Growth                 88            71            61
Success Breadth        73            64            66
Team Fit               94            27            91
Timing                 85            48            72
```

Do not automatically declare a "winner."

---

# 65. Scenario Simulation

Team Profiles should support duplication.

Example:

```text
Current Team

Scenario:
+ Senior Network Programmer
```

The user can compare maps side by side later.

V1 only needs instant recalculation.

---

# 66. Admin / Data Health

Provide a simple internal page showing:

```text
games indexed
games enriched
last Steam sync
last review sync
CCU snapshots
clusters generated
failed requests
queued jobs
```

Failures must be inspectable.

---

# 67. Rate Limiting and External Requests

All Steam requests must use:

- caching
- retry with exponential backoff
- configurable concurrency
- rate limiting
- identifiable user-agent where appropriate

Never build architecture that depends on aggressively scraping Steam.

External provider collectors must be replaceable.

---

# 68. Testing

Required test layers:

### Unit

Score calculations.

Team Fit.

Gates.

Cluster requirement rules.

### Integration

Database.

Steam provider adapters using fixtures/mocks.

### Analytics Regression

Given a fixed dataset:

cluster membership and major scores should remain deterministic.

### Frontend

Opportunity Map renders correctly from fixture data.

---

# 69. Fixtures

The application must be usable without Steam network access.

Include fixture datasets representing markets such as:

```text
Cozy Automation
Survival Craft
Physics Puzzle
Roguelike Deckbuilder
Shop Management
```

Fixtures should intentionally contain:

- high demand / high supply
- high demand / low supply
- low demand / low supply
- blockbuster-dominated market
- distributed-success market
- strong Team Fit
- poor Team Fit

This makes UI and analytics development deterministic.

---

# 70. MVP Acceptance Criteria

The MVP is considered complete when a user can:

1. Import/update Steam game data.
2. See games and historical snapshots.
3. Generate Tag-based MarketClusters.
4. See Demand and Supply metrics for each cluster.
5. View clusters on the Opportunity Map.
6. Open a Cluster Detail page.
7. Create a Team Profile.
8. Configure all 15 capabilities.
9. Set budget/time/team constraints.
10. Generate Market Requirement Profiles.
11. Calculate explainable Team Fit.
12. Apply hard blockers.
13. Calculate Personalized Opportunity.
14. Filter Opportunity Map by Team Fit.
15. See why a market is or is not appropriate for the team.
16. Compare market opportunity with execution feasibility.

Revenue estimation is explicitly NOT required for MVP completion.

---

# 71. Implementation Milestones

## Milestone 0 — Foundation

Create:

- monorepo
- Docker setup
- PostgreSQL
- FastAPI
- Next.js
- migrations
- fixture loader

Deliver a working local application.

## Milestone 1 — Steam Data Layer

Implement:

- app catalog provider
- metadata provider
- reviews
- CCU
- snapshots
- ingestion jobs
- admin status

## Milestone 2 — Market Analytics

Implement:

- tag normalization
- tag information weight
- cluster generation
- demand
- supply
- growth
- success breadth
- concentration
- gap
- market attractiveness
- confidence

## Milestone 3 — Team Fit Engine

Implement:

- Team Profiles
- role templates
- 15 capability dimensions
- market requirement rules
- capability coverage
- scope fit
- hard blockers
- Team Fit explanations

## Milestone 4 — Opportunity Map

Implement:

- Demand vs Supply scatter plot
- cluster point visualization
- Global / My Team switch
- filters
- tooltip
- Cluster Detail navigation

## Milestone 5 — Opportunity Finder

Implement:

- personalized scoring
- filtering
- ranking
- comparison
- scenario cloning

Stop here for MVP.

## Milestone 6 — Semantic / AI Layer

Only begin after the V1 analytics loop is useful.

Implement:

- pgvector
- game embeddings
- latent market clusters
- gameplay fantasy detection
- semantic concept comparison

## Milestone 7 — Concept Validator

Implement natural-language concept input and semantic market matching.

---

# 72. Development Rule

Do not build Phase 2 features before Milestones 0–5 work end-to-end.

The first success criterion is NOT:

> "We collected all Steam data."

It is:

> "A developer can look at the Opportunity Map, select their team, and discover why specific Steam markets are attractive or unattractive for them."

---

# 73. Recommended Initial Demo Team

Use this example Team Profile for development/testing:

```text
Team Size:
3

Development:
12 months

Budget:
€120,000

Team:

Senior Game / Systems Designer
Gameplay Programmer
3D Generalist / Technical Artist

Strengths:

Gameplay Systems          4
Simulation                4
Systems Design            5
UX/UI                     4
3D Production             3
Optimization              3

Weaknesses:

Networking                2
Backend                   1
Animation                 2
Narrative                 1
LiveOps                   1

Constraints:

No MMO
No competitive PvP
Optional small-scale co-op
Avoid permanent backend if possible
Avoid content-heavy narrative games
Prefer systemic gameplay
Maximum development time: 12 months
```

Use this profile to validate that:

- large multiplayer survival markets remain visible but score poorly for Team Fit
- systemic low-content games receive stronger Team Fit
- changing networking capability changes relevant opportunities
- increasing production duration affects Scope Fit

---

# 74. Product Language Rules

Avoid statements such as:

```text
"You should make this game."

"This game will sell."

"This is guaranteed underserved demand."
```

Use:

```text
"Strong market signal"

"Potential opportunity"

"High demand relative to observed supply"

"Strong fit for this team"

"Requires deeper validation"

"High execution risk"
```

The tool supports strategy.

It does not predict the future.

---

# 75. Final Product Model

The core conceptual model is:

```text
MARKET

Demand
Supply
Growth
Success Breadth
Competition
Timing
      ↓
Market Attractiveness


TEAM

Capabilities
Budget
Time
Team Size
Constraints
Production Strengths
      ↓
Team Fit


MARKET × TEAM

Market Attractiveness
+
Team Fit
+
Timing
      ↓
Personalized Opportunity
```

The primary insight the product should deliver is:

> There is no universally "best" Steam market.

> There are markets with attractive demand/supply conditions, and there are teams unusually well positioned to exploit particular opportunities.

The system's purpose is to identify the intersection.