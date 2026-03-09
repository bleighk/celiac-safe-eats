import { NextRequest, NextResponse } from "next/server";
import { searchNearbyRestaurants } from "@/lib/places";
import { evaluateRestaurants } from "@/lib/claude";
import {
  SearchRequest,
  SearchResponse,
  EvaluatedRestaurant,
  TIER_ORDER,
} from "@/lib/types";

// F2: Simple in-memory rate limiter
const requestLog = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = requestLog.get(ip) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT_MAX;
}

export async function POST(request: NextRequest) {
  // F2: Rate limiting
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  try {
    const body: SearchRequest = await request.json();

    if (
      typeof body.lat !== "number" ||
      typeof body.lng !== "number" ||
      typeof body.radiusMeters !== "number" ||
      body.lat < -90 ||
      body.lat > 90 ||
      body.lng < -180 ||
      body.lng > 180 ||
      body.radiusMeters <= 0 ||
      body.radiusMeters > 50000
    ) {
      return NextResponse.json(
        { error: "Invalid search parameters" },
        { status: 400 }
      );
    }

    const { restaurants, reviewsMap } = await searchNearbyRestaurants(
      body.lat,
      body.lng,
      body.radiusMeters
    );

    if (restaurants.length === 0) {
      const response: SearchResponse = { restaurants: [] };
      return NextResponse.json(response);
    }

    const evaluations = await evaluateRestaurants(restaurants, reviewsMap);

    const evaluated: EvaluatedRestaurant[] = restaurants.map((r, i) => ({
      ...r,
      evaluation: evaluations[i],
    }));

    // F4: Invalid/unknown tiers sort last (as "risky") instead of first
    evaluated.sort((a, b) => {
      const aIdx = TIER_ORDER.indexOf(a.evaluation.tier);
      const bIdx = TIER_ORDER.indexOf(b.evaluation.tier);
      const tierDiff =
        (aIdx === -1 ? TIER_ORDER.length : aIdx) -
        (bIdx === -1 ? TIER_ORDER.length : bIdx);
      if (tierDiff !== 0) return tierDiff;
      return a.distanceMeters - b.distanceMeters;
    });

    const response: SearchResponse = { restaurants: evaluated };
    return NextResponse.json(response);
  } catch (error) {
    // F1: Never leak raw upstream error messages
    console.error("Search API error:", error);

    const message =
      error instanceof Error ? error.message : "";

    const isUpstreamError =
      message.includes("Google Places") || message.includes("Claude");

    return NextResponse.json(
      {
        error: isUpstreamError
          ? "A third-party service is temporarily unavailable. Please try again."
          : "Search failed. Please try again.",
      },
      { status: isUpstreamError ? 502 : 500 }
    );
  }
}
