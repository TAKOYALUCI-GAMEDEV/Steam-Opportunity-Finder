// Curated real Steam app universe for M1 ingestion, grouped by the same market seeds
// as the fixtures. Membership is explicit (spec allows curated clusters for V1, §18);
// tags & metrics come from live Steam. Automatic tag co-occurrence clustering over a
// larger catalog is the M2 swap-in. Unknown/incorrect appIds are skipped gracefully.

export const SEED_APPS: Record<string, number[]> = {
  "cozy-automation": [
    427520, // Factorio
    526870, // Satisfactory
    1366540, // Dyson Sphere Program
    1457320, // Techtonica
    1594320, // Captain of Industry
    983870, // FOUNDRY
    1127400, // Mindustry
  ],
  "survival-craft": [
    892970, // Valheim
    252490, // Rust
    346110, // ARK: Survival Evolved
    962130, // Grounded
    1623730, // Palworld
    242760, // The Forest
    1326470, // Sons of the Forest
    1604030, // V Rising
    1203620, // Enshrouded
    1149460, // Icarus
    648800, // Raft
  ],
  "physics-puzzle": [
    477160, // Human: Fall Flat
    367450, // Poly Bridge
    1062160, // Poly Bridge 2
    346010, // Besiege
    1167630, // Teardown
    508440, // Totally Accurate Battle Simulator
    285900, // Gang Beasts
  ],
  "roguelike-deckbuilder": [
    646570, // Slay the Spire
    1102190, // Monster Train
    1092790, // Inscryption
    2379780, // Balatro
    1385380, // Across the Obelisk
    1076200, // Roguebook
    601840, // Griftlands
    1811990, // Wildfrost
  ],
  "shop-management": [
    2670630, // Supermarket Simulator
    3070070, // TCG Card Shop Simulator
    1599600, // PlateUp!
    1258080, // Shop Titans
    70400, // Recettear: An Item Shop's Tale
    606150, // Moonlighter
  ],
};

export function allSeedAppIds(): number[] {
  return [...new Set(Object.values(SEED_APPS).flat())];
}
