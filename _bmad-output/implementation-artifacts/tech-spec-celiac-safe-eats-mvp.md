---
title: 'Celiac Safe Eats MVP'
slug: 'celiac-safe-eats-mvp'
created: '2026-03-09'
status: 'completed'
stepsCompleted: [1, 2, 3, 4]
tech_stack: ['Next.js 14+ (App Router)', 'React 18', 'TypeScript', 'Tailwind CSS', 'Leaflet', 'react-leaflet', 'OpenStreetMap', 'Google Places API (New)', '@anthropic-ai/sdk', 'Vercel']
files_to_modify: ['app/layout.tsx', 'app/page.tsx', 'app/globals.css', 'app/api/search/route.ts', 'components/MapView.tsx', 'components/SearchButton.tsx', 'components/RadiusControl.tsx', 'components/RestaurantCard.tsx', 'lib/places.ts', 'lib/claude.ts', 'lib/types.ts']
code_patterns: ['Server Components by default, "use client" only for interactive components', 'Single API route for full search flow', 'Claude tool use for structured JSON responses', 'Environment variables for API keys']
test_patterns: ['Vitest for unit tests', 'Manual testing against live APIs for MVP']
---

# Tech-Spec: Celiac Safe Eats MVP

**Created:** 2026-03-09

## Overview

### Problem Statement

People with celiac disease cannot easily find safe restaurants nearby. Existing restaurant discovery tools don't evaluate cross-contamination risk, dedicated GF menus, or staff awareness — forcing celiacs to do extensive research before every meal out.

### Solution

A mobile-first, map-centric web app where users tap one button to find nearby restaurants. Google Places API fetches candidates within a visible radius, Claude AI batch-evaluates each for celiac safety using reviews, cuisine type, and available menu data, and results appear as color-coded pins (green/yellow/red). Tapping a pin reveals a bottom sheet with Claude's safety summary, ordering tips, and red flags.

### Scope

**In Scope:**

- Single-screen map-first UI (Leaflet + OpenStreetMap tiles)
- Browser geolocation → auto-center on user
- Radius presets: Near (500m), Default (1km), Far (3km)
- One-tap search → Google Places API fetch → Claude batch evaluation
- Color-coded map pins by safety tier (Dedicated GF, GF Aware, GF Options, Risky)
- Bottom sheet restaurant cards with safety summary, recommendations, red flags
- Directions link (opens Google/Apple Maps)
- Mobile-first design (bottom sheet for restaurant details on all screen sizes)
- Vercel deployment

**Out of Scope:**

- User accounts / saved favorites
- Cuisine or dietary filters
- User reviews or community data
- Offline mode
- Push notifications
- Restaurant owner portal

## Context for Development

### Codebase Patterns

- **Confirmed Clean Slate** — greenfield Next.js project, no legacy constraints
- App Router with Server Components by default, `"use client"` only for interactive components (map, controls, bottom sheet)
- API routes via Route Handlers (`app/api/...`) — single route handles full search pipeline
- Environment variables: `ANTHROPIC_API_KEY`, `GOOGLE_PLACES_API_KEY`
- No caching for MVP — add Vercel KV later if cost becomes a concern

### Project File Structure

```
app/
  layout.tsx              — Root layout, fonts, metadata
  page.tsx                — Server component, renders MapView
  globals.css             — Tailwind base + Leaflet CSS overrides
  api/
    search/route.ts       — Route Handler: coords + radius → Places fetch → Claude eval → JSON response
components/
  MapView.tsx             — Client: Leaflet map, user location dot, radius circle, pins
  SearchButton.tsx        — "Find Safe Restaurants" CTA button
  RadiusControl.tsx       — 3 preset buttons: Near (500m) / Default (1km) / Far (3km)
  RestaurantCard.tsx      — Bottom sheet with safety details (all screen sizes)
lib/
  places.ts              — Google Places API (New) client — nearby search with field masks
  claude.ts              — Claude API client — batch evaluate restaurants with tool use
  types.ts               — Shared types: SafetyTier, Restaurant, ClaudeEvaluation, etc.
```

### Files to Reference

| File | Purpose |
| ---- | ------- |
| `celiac-safe-eats-product-brief.md` | Product brief with full UX spec and Claude evaluation schema |

### Technical Decisions

- **Leaflet + OSM** over Mapbox/Google Maps — eliminates map-related costs entirely
- **Google Places API (New)** with per-field pricing — fetch only: `displayName`, `location`, `types`, `rating`, `userRatingCount`, `priceLevel`, `websiteUri`, `googleMapsUri`, `reviews` (reviews are Claude's richest signal for safety)
- **Claude API with tool use** — structured JSON output per restaurant (tier, summary, order, ask, avoid, red_flags) — not free text
- **Next.js Route Handlers** as BFF — protects API keys server-side, no separate backend
- **No caching for MVP** — at low usage, duplicate Claude calls are cheaper than building cache infrastructure. Add Vercel KV if usage grows.
- **Tailwind CSS** for rapid, zero-runtime styling
- **react-leaflet** for declarative React integration with Leaflet

## Implementation Plan

### Tasks

- [x] Task 1: Project scaffolding
  - Files: `package.json`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `.env.local`, `.env.example`, `.gitignore`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`
  - Action:
    - Run `npx create-next-app@latest` with TypeScript + Tailwind + App Router
    - Install `leaflet`, `react-leaflet`, `@types/leaflet`, `@anthropic-ai/sdk`
    - Create `.env.local` with `ANTHROPIC_API_KEY` and `GOOGLE_PLACES_API_KEY` placeholders. Add `.env.local` to `.gitignore`
    - Create `.env.example` documenting required environment variables (no values)
    - `app/layout.tsx`: Set metadata (title: "Celiac Safe Eats", description). Import `globals.css`. Use system font stack
    - `app/globals.css`: Tailwind directives (`@tailwind base/components/utilities`). Import Leaflet CSS globally. Full-height body (`html, body { height: 100%; margin: 0 }`), bottom sheet animation keyframes, pin color classes
    - `app/page.tsx`: Dynamically import `MapView` with `ssr: false` (Leaflet requires browser APIs). Full viewport height `h-screen w-screen`. Show loading skeleton while MapView loads
  - Notes: Leaflet CSS must be imported globally — doesn't work with CSS modules. No `vercel.json` needed — default Next.js detection works on Vercel. User must set env vars in Vercel project settings.

- [x] Task 2: Define shared TypeScript types
  - File: `lib/types.ts`
  - Action: Create all shared types:
    - `SafetyTier`: enum — `'dedicated-gf' | 'gf-aware' | 'gf-options' | 'risky'`
    - `PinColor`: mapping — `dedicated-gf → green, gf-aware → green, gf-options → yellow, risky → red`
    - `Restaurant`: `{ placeId, name, location: {lat, lng}, types, rating, userRatingCount, priceLevel, websiteUri, googleMapsUri, distanceMeters }`
    - `ClaudeEvaluation`: `{ tier: SafetyTier, summary: string, order: string[], ask: string[], avoid: string[], redFlags: string[] }`
    - `EvaluatedRestaurant`: `Restaurant & { evaluation: ClaudeEvaluation }`
    - `SearchRequest`: `{ lat: number, lng: number, radiusMeters: number }`
    - `SearchResponse`: `{ restaurants: EvaluatedRestaurant[] }`
  - Notes: These types are the contract between all layers — API route, Claude tool schema, and UI components.

- [x] Task 3: Build Google Places API client
  - File: `lib/places.ts`
  - Action: Create `searchNearbyRestaurants(lat, lng, radiusMeters): Promise<Restaurant[]>` that calls Google Places API (New) Nearby Search endpoint.
    - URL: `https://places.googleapis.com/v1/places:searchNearby`
    - Method: POST with JSON body
    - Headers: `X-Goog-Api-Key`, `X-Goog-FieldMask` (request only needed fields)
    - Field mask: `places.id,places.displayName,places.location,places.types,places.rating,places.userRatingCount,places.priceLevel,places.websiteUri,places.googleMapsUri,places.reviews`
    - Body: `{ includedTypes: ["restaurant"], locationRestriction: { circle: { center: {latitude, longitude}, radius: radiusMeters } }, maxResultCount: 20 }`
    - Transform response into `Restaurant[]` type
  - Notes: Max 20 results per call to keep Claude evaluation cost/latency manageable. Reviews field returns up to 5 most relevant reviews per place.

- [x] Task 4: Build Claude evaluation client
  - File: `lib/claude.ts`
  - Action: Create `evaluateRestaurants(restaurants: Restaurant[]): Promise<ClaudeEvaluation[]>` that sends all restaurants to Claude in a single API call using tool use.
    - Use `@anthropic-ai/sdk` to create client
    - Define a tool `evaluate_celiac_safety` with input schema matching the restaurant batch and output schema matching `ClaudeEvaluation[]`
    - System prompt: Instruct Claude to evaluate each restaurant for celiac safety based on cuisine type, reviews, and any available menu data. Define the four safety tiers with clear criteria. Instruct to never hallucinate — if data is insufficient, say "Menu not available — ask staff about GF options". Every evaluation must be conservative (when in doubt, rate lower).
    - Model: `claude-sonnet-4-6` (cost-effective for structured evaluation)
    - Max tokens: 4096
  - Notes: Single API call for the batch, not one per restaurant. The tool schema enforces structured output so we get parseable JSON, not free text.

- [x] Task 5: Build search API route
  - File: `app/api/search/route.ts`
  - Action: Create POST Route Handler that orchestrates the full pipeline:
    1. Parse request body as `SearchRequest` (validate lat, lng, radiusMeters)
    2. Call `searchNearbyRestaurants(lat, lng, radiusMeters)`
    3. Call `evaluateRestaurants(restaurants)`
    4. Zip restaurants with evaluations into `EvaluatedRestaurant[]`
    5. Sort by tier (dedicated-gf first, risky last), then by distance
    6. Return `SearchResponse` as JSON
    - Error handling: return appropriate HTTP status codes (400 for bad input, 502 for upstream API failures, 500 for internal errors) with error message
  - Notes: All API keys are server-side only — never exposed to client.

- [x] Task 6: Build MapView component
  - File: `components/MapView.tsx`
  - Action: Create `"use client"` component — the main app shell. Manages all state and includes inline loading overlay:
    - **State**: `userLocation: [lat, lng] | null`, `radius: number` (default 1000), `restaurants: EvaluatedRestaurant[]`, `selectedRestaurant: EvaluatedRestaurant | null`, `isLoading: boolean`, `error: string | null`
    - **On mount**: Request browser geolocation (`navigator.geolocation.getCurrentPosition`). Handle permission denied with fallback message.
    - **Map rendering**: Use `react-leaflet` `MapContainer`, `TileLayer` (OSM), `Marker` (user location blue dot), `Circle` (radius overlay — translucent blue fill)
    - **Restaurant pins**: Custom `DivIcon` markers colored by tier (green/yellow/red). On click, set `selectedRestaurant`.
    - **Search handler**: POST to `/api/search` with `{ lat, lng, radiusMeters }`. Set `isLoading` during request. On success, set `restaurants`. On error, set `error`.
    - **Loading state**: When `isLoading` is true, render a semi-transparent overlay with "Evaluating safety..." text and a pulsing CSS animation directly in MapView (no separate component).
    - **Child components**: Render `SearchButton`, `RadiusControl`, `RestaurantCard` as overlays on the map
    - **Re-center button**: Floating button to snap map back to user location
  - Notes: Leaflet requires dynamic import in Next.js (`next/dynamic` with `ssr: false`) because it accesses `window`. Use a dynamic import wrapper.

- [x] Task 7: Build SearchButton component
  - File: `components/SearchButton.tsx`
  - Action: Create `"use client"` component — large CTA button fixed to bottom center of screen.
    - Props: `onSearch: () => void`, `isLoading: boolean`, `disabled: boolean`
    - Text: "Find Safe Restaurants" (changes to "Searching..." with spinner when loading)
    - Style: Rounded pill, green background, white text, prominent shadow. Disabled state when no geolocation.
    - Position: Fixed bottom center, above bottom sheet if open. `z-index` above map.
  - Notes: Keep it large and tappable — minimum 48px touch target per mobile UX best practices.

- [x] Task 8: Build RadiusControl component
  - File: `components/RadiusControl.tsx`
  - Action: Create `"use client"` component — 3 preset radius buttons.
    - Props: `radius: number`, `onChange: (radius: number) => void`
    - UI: 3 toggle buttons in a compact row: "Near (500m)" / "1 km" / "Far (3km)". Active button highlighted.
    - Position: Fixed, top-right of screen, overlaying map. Small footprint.
  - Notes: When radius changes, update the Circle overlay on the map in real-time (no new search until user taps search again). Three presets are simpler than a stepper and cover urban + rural use cases.

- [x] Task 9: Build RestaurantCard component (bottom sheet)
  - File: `components/RestaurantCard.tsx`
  - Action: Create `"use client"` component — slides up from bottom when a pin is tapped.
    - Props: `restaurant: EvaluatedRestaurant | null`, `onClose: () => void`
    - Layout (matches product brief wireframe):
      - Header: Tier color badge + restaurant name + distance
      - Subheader: Cuisine type · price level · rating (stars + count)
      - Summary: Claude's one-line safety summary
      - "Order" section: Safe dishes list
      - "Ask" section: Questions for staff
      - "Avoid" section: Items/practices to avoid
      - Red flags: Highlighted warnings (if any)
      - Action buttons: "Directions" (opens `googleMapsUri` or Apple Maps on iOS) + "Website" (opens `websiteUri`)
      - Disclaimer footer: "Always confirm directly with the restaurant"
    - Animation: Slide up from bottom with CSS transition. Tap outside or swipe down to close.
    - Bottom sheet on all screen sizes (works fine on desktop too, like Google Maps)
  - Notes: Directions button should detect iOS and open Apple Maps, otherwise Google Maps. Use `googleMapsUri` from Places API.

### Acceptance Criteria

- [x] AC 1: Given the app is opened on a mobile browser, when geolocation is granted, then the map centers on the user's location with a blue dot and a translucent radius circle (default 1km)
- [x] AC 2: Given the app is opened, when geolocation is denied, then a friendly message is displayed explaining that location is required
- [x] AC 3: Given the user is on the map, when they tap "Find Safe Restaurants", then a loading overlay appears with "Evaluating safety..." text
- [x] AC 4: Given the search completes, when results are returned, then color-coded pins appear on the map (green for Dedicated GF / GF Aware, yellow for GF Options, red for Risky)
- [x] AC 5: Given pins are displayed, when the user taps a pin, then a bottom sheet slides up showing: restaurant name, distance, cuisine/price/rating, Claude's safety summary, order/ask/avoid recommendations, and a disclaimer
- [x] AC 6: Given the bottom sheet is open, when the user taps "Directions", then the device's native maps app opens with directions to the restaurant
- [x] AC 7: Given the bottom sheet is open, when the user taps outside it or swipes down, then it closes
- [x] AC 8: Given the user selects the "Far (3km)" radius preset, when they tap search again, then results are fetched within 3km and the circle overlay updates to match
- [x] AC 9: Given the user pans the map away from their location, when they tap the re-center button, then the map snaps back to their current location
- [x] AC 10: Given the API route receives a search request, when Google Places returns restaurants, then Claude evaluates all restaurants in a single batch call and returns structured JSON per restaurant
- [x] AC 11: Given the Google Places API or Claude API fails, when the error is caught, then a user-friendly error message is displayed (not a raw error)

## Additional Context

### Dependencies

**NPM Packages:**
- `next` (14+), `react`, `react-dom` — framework
- `typescript`, `@types/react`, `@types/node` — type system
- `tailwindcss`, `postcss`, `autoprefixer` — styling
- `leaflet`, `react-leaflet`, `@types/leaflet` — map
- `@anthropic-ai/sdk` — Claude API client

**External APIs:**
- Google Places API (New) — requires API key with Places API enabled
- Claude API — requires Anthropic API key

**Environment Variables:**
- `ANTHROPIC_API_KEY` — Claude API authentication
- `GOOGLE_PLACES_API_KEY` — Google Places API authentication

### Testing Strategy

**Unit Tests (Vitest):**
- `lib/places.ts` — test response transformation (mock fetch)
- `lib/claude.ts` — test tool schema structure, response parsing (mock SDK)

**Manual Testing:**
- Geolocation flow on mobile (Chrome, Safari) — grant, deny, unavailable
- Map interaction — pan, zoom, pin tap, bottom sheet open/close
- Search flow end-to-end with real API keys
- Radius presets — verify circle updates and search uses selected radius
- Directions link — verify opens native maps on iOS and Android
- Bottom sheet on desktop — verify it renders and functions correctly
- Error states — disable network, use invalid API keys

### Notes

- **Cost optimization is the primary constraint** — batch processing (single Claude call per search), use `claude-sonnet-4-6` (not Opus), limit Places results to 20 per search. No caching for MVP — add Vercel KV later if cost becomes a concern.
- **Disclaimer required**: Every result card must include "Always confirm directly with the restaurant"
- **Claude must not hallucinate**: Only evaluate data provided from Places API. If reviews or menu data are missing, say so explicitly.
- **Google Places API cost**: Nearby Search (New) costs ~$32 per 1000 requests (Basic fields). Reviews field adds cost.
- **Future considerations** (out of scope): Vercel KV for evaluation caching, adjustable radius slider, desktop side panel, user accounts, cuisine filters, PWA/offline support.

## Review Notes
- Adversarial review completed
- Findings: 18 total, 16 fixed, 2 skipped (undecided/low: pagination token, Leaflet CSS FOUC)
- Resolution approach: auto-fix
- Key fixes: rate limiting, runtime validation of Claude output, error message sanitization, tier sorting safety, URL validation, AbortController for race conditions, iOS detection improvement, price level formatting, pin icon caching, viewport meta tag
