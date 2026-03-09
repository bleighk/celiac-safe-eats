# Celiac Safe Eats — Product Brief

## What This Is

A mobile-first web app that helps people with celiac disease find safe restaurants nearby. **Zero typing required** — the app shows your location on a map, you tap one button, and celiac-safe restaurants appear as pins around you. Claude AI evaluates and ranks every result for celiac safety.

---

## Core User Flow

1. **User opens the app** → map loads centered on their live location (browser geolocation)
2. **User sees themselves on the map** with a radius circle around them (default ~1km, adjustable)
3. **User taps "Find Safe Restaurants"** → single button, bottom of screen
4. **App fetches nearby restaurants** from a places API within the radius
5. **Claude evaluates all results in one batch** for celiac safety
6. **Map populates with color-coded pins:**
   - Green — Dedicated GF / GF Aware
   - Yellow — GF Options (proceed with caution)
   - Red — Not recommended (shown optionally)
7. **User taps a pin** → card slides up with safety summary, reasoning, and tips
8. **User taps "Directions"** → opens native maps for navigation

---

## The Map-First Experience

The map IS the app. Everything happens on one screen:

- **On load:** Full-screen map, user's blue dot, translucent radius circle, single CTA button
- **After search:** Pins animate onto the map within the radius. Pin color = safety tier at a glance
- **Pin tap:** Bottom sheet slides up with restaurant details — no page navigation
- **Radius control:** Simple slider or +/- buttons to expand/shrink search area (500m → 5km)
- **Re-center button:** Snap back to current location if user pans away

No search bar on the main screen. No forms. No friction.

---

## Claude's Role (The Safety Brain)

### Single Responsibility: Evaluate & Rank

Claude receives a **batch of restaurant data** (names, cuisine types, menus, reviews) from the places API and returns a structured safety assessment for each.

For each restaurant, Claude determines:

- **Safety tier** (see below)
- **One-line summary** — e.g., "Naturally GF Thai menu, staff trained on cross-contamination"
- **What to order** — specific safe dishes
- **What to ask** — "Confirm rice noodles, ask about soy sauce brand"
- **Red flags** — "Shared fryer with battered items"

### Celiac Safety Tiers

| Tier | Pin Color | Meaning |
|------|-----------|---------|
| Dedicated GF | Green | Dedicated GF kitchen or certified GF establishment |
| GF Aware | Green | Separate GF menu, staff trained on cross-contamination |
| GF Options | Yellow | Has GF items but no specific cross-contamination protocols |
| Risky | Red | Limited options, high cross-contamination risk |

---

## What Claude Should NOT Do

- **Do not guarantee safety** — every result card includes: "Always confirm directly with the restaurant"
- **Do not hallucinate restaurant details** — only evaluate data provided from the places API
- **Do not invent menu items** — if menu data is unavailable, say "Menu not available — ask staff about GF options"
- **Do not act as a medical advisor**

---

## Pin Tap → Restaurant Card

When the user taps a pin, a bottom sheet slides up:

```
┌─────────────────────────────────┐
│ Green: Thai Street       350m   │
│ Thai · $$ · 4.3 stars (200+)   │
│                                 │
│ "Naturally GF-friendly Thai.    │
│  Staff know about celiac.       │
│  Rice noodle dishes are safe."  │
│                                 │
│ Order: Pad Thai, Green Curry    │
│ Ask: "Is soy sauce GF?"        │
│ Avoid: Spring rolls (shared     │
│    fryer)                       │
│                                 │
│ [  Directions  ] [  Website  ]  │
│                                 │
│ Always confirm with staff       │
└─────────────────────────────────┘
```

---

## MVP Scope

### In scope

- Single-screen map-first UI
- Browser geolocation → auto-center
- Adjustable search radius
- One-tap search → Claude batch evaluation
- Color-coded pins on map
- Bottom sheet restaurant cards
- Directions link (opens Google/Apple Maps)
- Mobile-responsive (mobile-first, works on desktop)

### Out of scope for v1

- User accounts / saved favorites
- Cuisine or dietary filters (everyone is celiac-strict in v1)
- User reviews or community data
- Offline mode
- Push notifications
- Restaurant owner portal

---

## Notes for the Developer

- **Claude API: use tool use** — define a structured tool schema so Claude returns parseable JSON per restaurant (tier, summary, recommendations, red_flags), not free text
- **Batch evaluation** — send all restaurants from the radius in a single Claude call, not one per restaurant. Keeps latency and cost down
- **Cache aggressively** — cache Claude evaluations per restaurant (keyed by place ID + data hash). A restaurant's safety profile doesn't change hourly
- **Map library** — Mapbox GL JS or Google Maps JS SDK. Needs: custom pin colors, user location dot, radius circle overlay, bottom sheet interaction
- **Places API** — Google Places (or similar) for restaurant data. Fetch: name, location, cuisine, price, rating, reviews, website. Reviews are Claude's richest signal
- **Loading state** — after tap, show a brief "Evaluating safety..." animation on the map while Claude processes. Skeleton pins or a pulsing radius works well
- **Radius default** — start at 1km. Urban areas will have plenty; rural users may need to expand to 5km+
- **Mobile-first** — bottom sheet UX pattern (like Google Maps). On desktop, use a side panel instead
