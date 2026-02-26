"use client";

type Preset = "today" | "7d" | "30d" | "custom";

interface DateRangePickerProps {
  preset: Preset;
  from: string;
  to: string;
  onPresetChange: (preset: Preset) => void;
  onFromChange: (from: string) => void;
  onToChange: (to: string) => void;
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "7 Days" },
  { value: "30d", label: "30 Days" },
  { value: "custom", label: "Custom" },
];

export function DateRangePicker({
  preset,
  from,
  to,
  onPresetChange,
  onFromChange,
  onToChange,
}: DateRangePickerProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex rounded-lg border border-gray-700 overflow-hidden">
        {PRESETS.map((p) => (
          <button
            key={p.value}
            onClick={() => onPresetChange(p.value)}
            className={`px-3 py-1.5 text-xs font-medium transition-colors ${
              preset === p.value
                ? "bg-amber-400/10 text-amber-400"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-800"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={from}
            onChange={(e) => onFromChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:border-amber-400 focus:outline-none"
          />
          <span className="text-gray-500 text-xs">to</span>
          <input
            type="date"
            value={to}
            onChange={(e) => onToChange(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300 focus:border-amber-400 focus:outline-none"
          />
        </div>
      )}
    </div>
  );
}
