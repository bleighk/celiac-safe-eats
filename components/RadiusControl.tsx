"use client";

interface RadiusControlProps {
  radius: number;
  onChange: (radius: number) => void;
}

const PRESETS = [
  { label: "Near", sublabel: "500m", value: 500 },
  { label: "1 km", sublabel: "", value: 1000 },
  { label: "Far", sublabel: "3km", value: 3000 },
];

export default function RadiusControl({
  radius,
  onChange,
}: RadiusControlProps) {
  return (
    <div className="fixed right-4 top-4 z-[1000] flex gap-1 rounded-xl bg-white/90 p-1 shadow-lg backdrop-blur-sm">
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          onClick={() => onChange(preset.value)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            radius === preset.value
              ? "bg-green-600 text-white"
              : "text-gray-700 hover:bg-gray-100"
          }`}
        >
          {preset.label}
          {preset.sublabel && (
            <span className="ml-1 text-xs opacity-70">{preset.sublabel}</span>
          )}
        </button>
      ))}
    </div>
  );
}
