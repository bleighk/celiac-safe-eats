export type SafetyTier =
  | "dedicated-gf"
  | "gf-aware"
  | "gf-options"
  | "risky";

export const PIN_COLORS: Record<SafetyTier, "green" | "yellow" | "red"> = {
  "dedicated-gf": "green",
  "gf-aware": "green",
  "gf-options": "yellow",
  risky: "red",
};

export const TIER_LABELS: Record<SafetyTier, string> = {
  "dedicated-gf": "Dedicated GF",
  "gf-aware": "GF Aware",
  "gf-options": "GF Options",
  risky: "Risky",
};

export const TIER_ORDER: SafetyTier[] = [
  "dedicated-gf",
  "gf-aware",
  "gf-options",
  "risky",
];

export interface Restaurant {
  placeId: string;
  name: string;
  location: { lat: number; lng: number };
  types: string[];
  rating: number;
  userRatingCount: number;
  priceLevel: string | null;
  websiteUri: string | null;
  googleMapsUri: string;
  distanceMeters: number;
}

export interface ClaudeEvaluation {
  tier: SafetyTier;
  summary: string;
  order: string[];
  ask: string[];
  avoid: string[];
  redFlags: string[];
}

export interface EvaluatedRestaurant extends Restaurant {
  evaluation: ClaudeEvaluation;
}

export interface SearchRequest {
  lat: number;
  lng: number;
  radiusMeters: number;
}

export interface SearchResponse {
  restaurants: EvaluatedRestaurant[];
}
