"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Circle,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import { EvaluatedRestaurant, PIN_COLORS } from "@/lib/types";
import SearchButton from "./SearchButton";
import RadiusControl from "./RadiusControl";
import RestaurantCard from "./RestaurantCard";

const DEFAULT_RADIUS = 1000;
const DEFAULT_CENTER: [number, number] = [0, 0];

// User location blue dot icon
const userIcon = new L.DivIcon({
  className: "",
  html: `<div style="width:16px;height:16px;background:#3b82f6;border:3px solid white;border-radius:50%;box-shadow:0 0 6px rgba(59,130,246,0.5);"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// F14: Cache pin icons — only 3 possible colors
const PIN_ICON_CACHE: Record<string, L.DivIcon> = {};
function getPinIcon(color: "green" | "yellow" | "red"): L.DivIcon {
  if (!PIN_ICON_CACHE[color]) {
    const colors = { green: "#22c55e", yellow: "#eab308", red: "#ef4444" };
    PIN_ICON_CACHE[color] = new L.DivIcon({
      className: "",
      html: `<div style="width:28px;height:28px;background:${colors[color]};border:3px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/></svg>
      </div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });
  }
  return PIN_ICON_CACHE[color];
}

function RecenterButton({
  userLocation,
}: {
  userLocation: [number, number] | null;
}) {
  const map = useMap();

  if (!userLocation) return null;

  return (
    <button
      onClick={() => map.setView(userLocation, map.getZoom())}
      className="absolute bottom-36 right-4 z-[1000] rounded-full bg-white p-3 shadow-lg"
      aria-label="Re-center map"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
      </svg>
    </button>
  );
}

export default function MapView() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [restaurants, setRestaurants] = useState<EvaluatedRestaurant[]>([]);
  const [selectedRestaurant, setSelectedRestaurant] =
    useState<EvaluatedRestaurant | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const mapRef = useRef<L.Map | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null); // F6

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      setError("Geolocation is not supported by your browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc: [number, number] = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        setUserLocation(loc);
        if (mapRef.current) {
          mapRef.current.setView(loc, 15);
        }
      },
      () => {
        setLocationDenied(true);
        setError(
          "Location access is needed to find restaurants near you. Please enable location in your browser settings."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // F15: Clear error when radius changes
  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
    setError(null);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!userLocation) return;

    // F6: Abort any in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);
    setSelectedRestaurant(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userLocation[0],
          lng: userLocation[1],
          radiusMeters: radius,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Search failed");
      }

      const data = await response.json();
      setRestaurants(data.restaurants);

      if (data.restaurants.length === 0) {
        setError("No restaurants found in this area. Try a larger radius.");
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : "Search failed. Please try again."
      );
    } finally {
      if (controller === abortControllerRef.current) {
        setIsLoading(false);
      }
    }
  }, [userLocation, radius]);

  if (locationDenied && !userLocation) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-100 p-8">
        <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-lg">
          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Location Required
          </h2>
          <p className="text-gray-600">
            {error ||
              "Please enable location access in your browser settings to find safe restaurants near you."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={userLocation || DEFAULT_CENTER}
        zoom={userLocation ? 15 : 2}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon} />
            <Circle
              center={userLocation}
              radius={radius}
              pathOptions={{
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                weight: 2,
              }}
            />
          </>
        )}

        {restaurants.map((restaurant) => (
          <Marker
            key={restaurant.placeId}
            position={[restaurant.location.lat, restaurant.location.lng]}
            icon={getPinIcon(PIN_COLORS[restaurant.evaluation.tier])}
            eventHandlers={{
              click: () => setSelectedRestaurant(restaurant),
            }}
          />
        ))}

        <RecenterButton userLocation={userLocation} />
      </MapContainer>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/30">
          <div className="rounded-2xl bg-white px-8 py-6 shadow-xl">
            <div className="animate-pulse-loading text-center">
              <p className="font-medium text-gray-700">
                Evaluating safety...
              </p>
              <p className="mt-1 text-sm text-gray-500">
                This may take a moment
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && !isLoading && (
        <div className="absolute left-4 right-4 top-4 z-[1000] rounded-xl bg-red-50 p-4 shadow-lg">
          <p className="text-center text-sm font-medium text-red-800">
            {error}
          </p>
          <button
            onClick={() => setError(null)}
            className="absolute right-2 top-2 text-red-400"
          >
            ✕
          </button>
        </div>
      )}

      <RadiusControl radius={radius} onChange={handleRadiusChange} />

      <SearchButton
        onSearch={handleSearch}
        isLoading={isLoading}
        disabled={!userLocation}
      />

      <RestaurantCard
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
      />
    </div>
  );
}
