"use client";

import dynamic from "next/dynamic";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-100">
      <div className="animate-pulse-loading text-lg text-gray-500">
        Loading map...
      </div>
    </div>
  ),
});

export default function Home() {
  return (
    <div className="h-screen w-screen">
      <MapView />
    </div>
  );
}
