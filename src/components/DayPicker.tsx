"use client";

import { DAY_LABELS } from "@/lib/calc";

export function DayPicker({
  selected,
  onToggle,
  disabled = false,
}: {
  selected: number[];
  onToggle: (day: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="day-picker">
      {DAY_LABELS.map((label, i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          className={`day-pill ${selected.includes(i) ? "active" : ""}`}
          onClick={() => onToggle(i)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
