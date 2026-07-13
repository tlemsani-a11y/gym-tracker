"use client";

import { useState } from "react";
import { calculatePlateBreakdown, plateColorForWeight, type PlateCount } from "@/lib/calc";

function BarbellSvg({ counts }: { counts: PlateCount[] }) {
  if (!counts.length) return null;
  const heightForWeight = (w: number) => 22 + Math.min(w, 25) * 1.5;
  const plateWidth = 8;
  const gap = 2;
  const barY = 50;
  const centerX = 150;

  let offset = 16;
  const rects: { x: number; y: number; w: number; h: number; color: string }[] = [];
  counts.forEach((c) => {
    const h = heightForWeight(c.weight);
    for (let i = 0; i < c.count; i++) {
      rects.push({ x: centerX + offset, y: barY - h / 2, w: plateWidth, h, color: plateColorForWeight(c.weight) });
      rects.push({ x: centerX - offset - plateWidth, y: barY - h / 2, w: plateWidth, h, color: plateColorForWeight(c.weight) });
      offset += plateWidth + gap;
    }
  });

  const barEnd = centerX + offset + 14;
  const barStart = centerX - offset - 14;

  return (
    <svg viewBox="0 0 300 100">
      <line
        x1={barStart.toFixed(1)}
        y1={barY}
        x2={barEnd.toFixed(1)}
        y2={barY}
        style={{ stroke: "rgba(255,255,255,0.18)", strokeWidth: 6, strokeLinecap: "round" }}
      />
      {rects.map((r, i) => (
        <rect
          key={i}
          x={r.x.toFixed(1)}
          y={r.y.toFixed(1)}
          width={r.w}
          height={r.h.toFixed(1)}
          rx="3"
          style={{ fill: r.color }}
        />
      ))}
    </svg>
  );
}

export function PlateCalculator() {
  const [barWeight, setBarWeight] = useState(20);
  const [target, setTarget] = useState("");

  const targetNum = parseFloat(target);
  const result = !isNaN(targetNum) && targetNum > 0 ? calculatePlateBreakdown(targetNum, barWeight) : null;

  return (
    <>
      <h1>Plate Calculator</h1>
      <div className="card">
        <span className="eyebrow">Bar weight</span>
        <div className="rest-preset-row">
          {[20, 15, 10].map((w) => (
            <button key={w} className={`btn btn-sm ${barWeight === w ? "active" : ""}`} onClick={() => setBarWeight(w)}>
              {w}kg
            </button>
          ))}
        </div>
        <span className="eyebrow" style={{ marginTop: "1rem" }}>Target total weight (kg)</span>
        <input
          type="number"
          inputMode="decimal"
          step="0.5"
          min="0"
          placeholder="e.g. 100"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          autoFocus
        />
      </div>

      {target && !isNaN(targetNum) && targetNum > 0 && !result ? (
        <div className="card">
          <p className="muted" style={{ margin: 0 }}>Target must be more than the bar weight ({barWeight}kg).</p>
        </div>
      ) : null}

      {result ? (
        <div className="card">
          <span className="eyebrow">Per side</span>
          <div className="plate-chip-row">
            {result.counts.length ? (
              result.counts.map((c) => (
                <div key={c.weight} className="plate-chip">
                  <span
                    className="plate-chip-swatch"
                    style={{ background: plateColorForWeight(c.weight), color: plateColorForWeight(c.weight) }}
                  ></span>
                  <span>
                    {c.weight}kg <span className="muted">× {c.count}</span>
                  </span>
                </div>
              ))
            ) : (
              <p className="muted" style={{ margin: 0 }}>No plates needed — just the bar.</p>
            )}
          </div>
          <div className="chart-wrap">
            <BarbellSvg counts={result.counts} />
          </div>
          {result.exact ? (
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              Total: <strong className="mono">{result.achievedTotal}kg</strong>
            </p>
          ) : (
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              Closest possible: <strong className="mono">{result.achievedTotal}kg</strong>{" "}
              <span className="muted">(target was {result.targetTotal}kg — smallest plate is 1.25kg)</span>
            </p>
          )}
        </div>
      ) : null}
    </>
  );
}
