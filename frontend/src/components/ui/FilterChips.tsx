"use client";

import { getRoleColor } from "@/lib/colors";

interface FilterChipsProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function FilterChips({ label, options, selected, onChange }: FilterChipsProps) {
  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-gray-500 text-xs uppercase tracking-wider">{label}</span>
      {options.map((option) => {
        const active = selected.includes(option);
        const color = label === "Role" ? getRoleColor(option) : undefined;
        return (
          <button
            key={option}
            onClick={() => toggle(option)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              active
                ? "text-white border border-current"
                : "text-gray-400 bg-gray-800 border border-gray-700 hover:border-gray-600"
            }`}
            style={active && color ? { color, borderColor: color } : undefined}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
