// Explainable score primitives (spec §2.3, §57, §59, §61).
// Every score exposes value + confidence + the weighted components that produced it,
// plus the analytics version that computed it so results stay reproducible.

export interface ScoreComponent {
  key: string;
  label: string;
  /** Relative weight of this component within the parent score (0..1). */
  weight: number;
  /** Normalized 0..100 input value this component contributed. */
  value: number;
}

export interface ScoreValue {
  /** 0..100. */
  value: number;
  /** 0..100 data confidence (spec §59, §60). */
  confidence: number;
  components: ScoreComponent[];
  analyticsVersion: string;
}

export type ConcentrationBand =
  | "Distributed"
  | "Moderately Concentrated"
  | "Highly Concentrated";

export type SuccessTier =
  | "Tiny"
  | "Small"
  | "Viable"
  | "Successful"
  | "Breakout";
