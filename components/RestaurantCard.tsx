"use client";

import { useEffect, useRef, useCallback } from "react";
import { EvaluatedRestaurant, PIN_COLORS, TIER_LABELS } from "@/lib/types";

interface RestaurantCardProps {
  restaurant: EvaluatedRestaurant | null;
  onClose: () => void;
}

const TIER_BG_COLORS = {
  green: "bg-green-100 text-green-800",
  yellow: "bg-yellow-100 text-yellow-800",
  red: "bg-red-100 text-red-800",
};

// F16: Human-readable price level labels
const PRICE_LABELS: Record<string, string> = {
  PRICE_LEVEL_FREE: "Free",
  PRICE_LEVEL_INEXPENSIVE: "$",
  PRICE_LEVEL_MODERATE: "$$",
  PRICE_LEVEL_EXPENSIVE: "$$$",
  PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
};

// F13: Guard against NaN/undefined
function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return "";
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// F7: Better iOS/macOS detection for Apple Maps
function getDirectionsUrl(lat: number, lng: number): string {
  const isApple =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1));

  if (isApple) {
    return `maps://maps.apple.com/?daddr=${lat},${lng}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

// F5: Validate URL scheme before rendering
function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

export default function RestaurantCard({
  restaurant,
  onClose,
}: RestaurantCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // F12: Use setTimeout to delay click-outside registration, avoiding flicker on pin switch
  const stableOnClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    if (!restaurant) return;

    let active = true;
    const timerId = setTimeout(() => {
      if (!active) return;

      function handleClickOutside(e: MouseEvent) {
        if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
          stableOnClose();
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      // Store cleanup in closure
      cleanupRef.current = () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, 100);

    const cleanupRef = { current: () => {} };
    return () => {
      active = false;
      clearTimeout(timerId);
      cleanupRef.current();
    };
  }, [restaurant, stableOnClose]);

  if (!restaurant) return null;

  const { evaluation } = restaurant;
  const pinColor = PIN_COLORS[evaluation.tier];
  const tierLabel = TIER_LABELS[evaluation.tier];
  const safeWebsite =
    restaurant.websiteUri && isSafeUrl(restaurant.websiteUri)
      ? restaurant.websiteUri
      : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1001] px-4 pb-4">
      <div
        ref={cardRef}
        className="animate-slide-up mx-auto max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: "60vh" }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-300" />
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="mb-3 flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${TIER_BG_COLORS[pinColor]}`}
                >
                  {tierLabel}
                </span>
                <span className="text-sm text-gray-500">
                  {formatDistance(restaurant.distanceMeters)}
                </span>
              </div>
              <h2 className="text-lg font-bold text-gray-900">
                {restaurant.name}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="ml-2 rounded-full p-1 text-gray-400 hover:bg-gray-100"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Subheader */}
          <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
            {restaurant.priceLevel && (
              <span>
                {PRICE_LABELS[restaurant.priceLevel] || restaurant.priceLevel}
              </span>
            )}
            {restaurant.rating > 0 && (
              <span>
                {restaurant.rating} ({restaurant.userRatingCount})
              </span>
            )}
          </div>

          {/* Summary */}
          <p className="mb-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
            {evaluation.summary}
          </p>

          {/* Order section */}
          {evaluation.order.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-1 text-sm font-semibold text-green-700">
                Order
              </h3>
              <ul className="space-y-1">
                {evaluation.order.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ask section */}
          {evaluation.ask.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-1 text-sm font-semibold text-blue-700">
                Ask
              </h3>
              <ul className="space-y-1">
                {evaluation.ask.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Avoid section */}
          {evaluation.avoid.length > 0 && (
            <div className="mb-3">
              <h3 className="mb-1 text-sm font-semibold text-orange-700">
                Avoid
              </h3>
              <ul className="space-y-1">
                {evaluation.avoid.map((item, i) => (
                  <li key={i} className="text-sm text-gray-700">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Red flags */}
          {evaluation.redFlags.length > 0 && (
            <div className="mb-4 rounded-lg bg-red-50 p-3">
              <h3 className="mb-1 text-sm font-semibold text-red-700">
                Red Flags
              </h3>
              <ul className="space-y-1">
                {evaluation.redFlags.map((flag, i) => (
                  <li key={i} className="text-sm text-red-700">
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="mb-3 flex gap-3">
            <a
              href={getDirectionsUrl(
                restaurant.location.lat,
                restaurant.location.lng
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M21.71 11.29l-9-9a1 1 0 00-1.42 0l-9 9a1 1 0 000 1.42l9 9a1 1 0 001.42 0l9-9a1 1 0 000-1.42zM14 14.5V12h-4v3H8v-4a1 1 0 011-1h5V7.5l3.5 3.5-3.5 3.5z" />
              </svg>
              Directions
            </a>
            {safeWebsite && (
              <a
                href={safeWebsite}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-300 py-3 text-sm font-semibold text-gray-700"
              >
                Website
              </a>
            )}
          </div>

          {/* Disclaimer */}
          <p className="text-center text-xs text-gray-400">
            Always confirm directly with the restaurant
          </p>
        </div>
      </div>
    </div>
  );
}
