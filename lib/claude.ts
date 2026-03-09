import Anthropic from "@anthropic-ai/sdk";
import { Restaurant, ClaudeEvaluation, SafetyTier, TIER_ORDER } from "./types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a celiac disease safety evaluator. You assess restaurants for safety based on cuisine type, reviews, and any available data.

SAFETY TIERS (be conservative — when in doubt, rate lower):
- "dedicated-gf": 100% gluten-free facility or dedicated GF kitchen/menu section with strict protocols
- "gf-aware": Staff trained on GF, separate prep areas mentioned, multiple GF options with awareness of cross-contamination
- "gf-options": Some GF items available but no evidence of cross-contamination awareness
- "risky": Heavy gluten use (bakery, pasta-focused, fried foods with shared fryers), no GF mentions, or concerning reviews

RULES:
- ONLY evaluate based on provided data. Never hallucinate menu items or reviews.
- If review data is missing or sparse, say "Limited data — confirm GF options directly with staff"
- Every evaluation must be conservative for safety
- Focus on cross-contamination risk, not just GF menu items
- Consider cuisine type (e.g., sushi restaurants are naturally safer than pizza places)`;

interface RestaurantInput {
  placeId: string;
  name: string;
  cuisineTypes: string[];
  rating: number;
  reviews: string[];
}

const TOOL_DEFINITION: Anthropic.Tool = {
  name: "evaluate_celiac_safety",
  description:
    "Evaluate a batch of restaurants for celiac safety. Return one evaluation per restaurant.",
  input_schema: {
    type: "object" as const,
    properties: {
      evaluations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            placeId: {
              type: "string",
              description: "The Google Place ID of the restaurant",
            },
            tier: {
              type: "string",
              enum: ["dedicated-gf", "gf-aware", "gf-options", "risky"],
            },
            summary: {
              type: "string",
              description:
                "One-line safety summary (e.g., 'Dedicated GF menu with separate prep area')",
            },
            order: {
              type: "array",
              items: { type: "string" },
              description: "Safe dishes to order",
            },
            ask: {
              type: "array",
              items: { type: "string" },
              description: "Questions to ask staff",
            },
            avoid: {
              type: "array",
              items: { type: "string" },
              description: "Items or practices to avoid",
            },
            redFlags: {
              type: "array",
              items: { type: "string" },
              description: "Warning signs from reviews or cuisine type",
            },
          },
          required: [
            "placeId",
            "tier",
            "summary",
            "order",
            "ask",
            "avoid",
            "redFlags",
          ],
        },
      },
    },
    required: ["evaluations"],
  },
};

const FALLBACK_EVALUATION: ClaudeEvaluation = {
  tier: "risky",
  summary: "Could not evaluate — confirm GF options directly with staff",
  order: [],
  ask: [
    "Do you have gluten-free options?",
    "How do you prevent cross-contamination?",
  ],
  avoid: [],
  redFlags: ["Evaluation unavailable"],
};

// F3: Runtime validation for Claude's response
function validateEvaluation(raw: Record<string, unknown>): ClaudeEvaluation {
  const tier = TIER_ORDER.includes(raw.tier as SafetyTier)
    ? (raw.tier as SafetyTier)
    : "risky";

  const summary =
    typeof raw.summary === "string" && raw.summary.length > 0
      ? raw.summary
      : "Could not evaluate — confirm GF options directly with staff";

  const toStringArray = (val: unknown): string[] =>
    Array.isArray(val)
      ? val.filter((item): item is string => typeof item === "string")
      : [];

  return {
    tier,
    summary,
    order: toStringArray(raw.order),
    ask: toStringArray(raw.ask),
    avoid: toStringArray(raw.avoid),
    redFlags: toStringArray(raw.redFlags),
  };
}

export async function evaluateRestaurants(
  restaurants: Restaurant[],
  reviewsMap: Map<string, string[]>
): Promise<ClaudeEvaluation[]> {
  if (restaurants.length === 0) return [];

  const restaurantInputs: RestaurantInput[] = restaurants.map((r) => ({
    placeId: r.placeId,
    name: r.name,
    cuisineTypes: r.types,
    rating: r.rating,
    reviews: reviewsMap.get(r.placeId) || [],
  }));

  const userMessage = `Evaluate these ${restaurants.length} restaurants for celiac safety. Use the evaluate_celiac_safety tool to return your evaluations.

Restaurants:
${JSON.stringify(restaurantInputs, null, 2)}`;

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192, // F9: increased for large batches
    system: SYSTEM_PROMPT,
    tools: [TOOL_DEFINITION],
    tool_choice: { type: "tool", name: "evaluate_celiac_safety" },
    messages: [{ role: "user", content: userMessage }],
  });

  const toolUseBlock = response.content.find(
    (block) => block.type === "tool_use"
  );

  if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
    throw new Error("Claude did not return a tool use response");
  }

  const input = toolUseBlock.input as {
    evaluations: Record<string, unknown>[];
  };

  if (!Array.isArray(input?.evaluations)) {
    throw new Error("Claude returned malformed evaluation data");
  }

  // F3: Validate each evaluation and map by placeId
  const evalMap = new Map<string, ClaudeEvaluation>();
  for (const raw of input.evaluations) {
    const placeId = typeof raw.placeId === "string" ? raw.placeId : "";
    if (placeId) {
      evalMap.set(placeId, validateEvaluation(raw));
    }
  }

  return restaurants.map(
    (r) => evalMap.get(r.placeId) || FALLBACK_EVALUATION
  );
}
