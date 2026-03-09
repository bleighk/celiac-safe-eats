import { Restaurant } from "./types";

const PLACES_API_URL =
  "https://places.googleapis.com/v1/places:searchNearby";

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.location",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.reviews",
].join(",");

interface PlacesReview {
  text?: { text: string };
  rating?: number;
}

interface PlacesResult {
  id: string;
  displayName: { text: string };
  location: { latitude: number; longitude: number };
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  priceLevel?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  reviews?: PlacesReview[];
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function searchNearbyRestaurants(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<{ restaurants: Restaurant[]; reviewsMap: Map<string, string[]> }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY is not configured");
  }

  const response = await fetch(PLACES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({
      includedTypes: ["restaurant"],
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: radiusMeters,
        },
      },
      maxResultCount: 20,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google Places API error (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const places: PlacesResult[] = data.places || [];

  const reviewsMap = new Map<string, string[]>();

  const restaurants: Restaurant[] = places.map((place) => {
    if (place.reviews?.length) {
      reviewsMap.set(
        place.id,
        place.reviews
          .filter((r) => r.text?.text)
          .map((r) => r.text!.text)
      );
    }

    return {
      placeId: place.id,
      name: place.displayName.text,
      location: {
        lat: place.location.latitude,
        lng: place.location.longitude,
      },
      types: place.types || [],
      rating: place.rating || 0,
      userRatingCount: place.userRatingCount || 0,
      priceLevel: place.priceLevel || null,
      websiteUri: place.websiteUri || null,
      googleMapsUri: place.googleMapsUri || "",
      distanceMeters: Math.round(
        haversineDistance(
          lat,
          lng,
          place.location.latitude,
          place.location.longitude
        )
      ),
    };
  });

  return { restaurants, reviewsMap };
}
