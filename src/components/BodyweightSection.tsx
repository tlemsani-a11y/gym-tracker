"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/AppProviders";
import { logBodyweightAction, deleteBodyweightAction, restoreBodyweightAction } from "@/lib/actions";
import { LineChart } from "@/components/LineChart";
import { fmtShortDate } from "@/lib/calc";
import type { BodyweightRow } from "@/lib/queries";

export function BodyweightSection({ logs }: { logs: BodyweightRow[] }) {
  const { showToast, showUndoToast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const sortedDesc = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const latest = sortedDesc[0];
  const points = [...logs]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((e) => ({ label: fmtShortDate(e.date), value: e.weight_kg }));

  let delta: number | null = null;
  if (latest && points.length >= 2) {
    delta = Math.round((latest.weight_kg - points[0].value) * 10) / 10;
  }

  function submitLog() {
    const weight = parseFloat(inputRef.current?.value ?? "");
    if (isNaN(weight) || weight <= 0) {
      showToast("Enter a valid weight");
      return;
    }
    startTransition(async () => {
      const result = await logBodyweightAction(weight);
      if (inputRef.current) inputRef.current.value = "";
      showToast(result.updated ? "Today's weight updated" : "Weight logged");
      router.refresh();
    });
  }

  function removeEntry(entry: BodyweightRow) {
    startTransition(async () => {
      await deleteBodyweightAction(entry.id);
      showUndoToast("Entry deleted", () => {
        startTransition(async () => {
          await restoreBodyweightAction(entry);
          router.refresh();
        });
      });
      router.refresh();
    });
  }

  return (
    <div className="card plate-blue">
      <div className="exercise-stat-header">
        <span className="eyebrow" style={{ margin: 0 }}>Bodyweight</span>
        {latest ? <span className="mono" style={{ fontWeight: 800, fontSize: "1.15rem" }}>{latest.weight_kg} kg</span> : null}
      </div>
      <div className="row" style={{ marginTop: "0.6rem" }}>
        <input
          ref={inputRef}
          type="number"
          placeholder="Weight (kg)"
          step="0.1"
          min="0"
          inputMode="decimal"
          onKeyDown={(e) => e.key === "Enter" && submitLog()}
        />
        <button className="btn btn-primary" style={{ flex: "0 0 auto" }} onClick={submitLog} disabled={isPending}>Log</button>
      </div>
      {delta !== null ? (
        <p className="muted" style={{ margin: "0.5rem 0 0" }}>
          {delta > 0 ? "+" : ""}
          {delta} kg since first log
        </p>
      ) : null}
      {points.length >= 2 ? (
        <div className="chart-wrap">
          <LineChart dataPoints={points} />
        </div>
      ) : null}
      {sortedDesc.length ? (
        <div style={{ marginTop: "0.75rem" }}>
          {sortedDesc.slice(0, 5).map((e) => (
            <div key={e.id} className="set-row">
              <span>
                {fmtShortDate(e.date)} → <strong>{e.weight_kg} kg</strong>
              </span>
              <button className="btn btn-sm btn-danger" onClick={() => removeEntry(e)} disabled={isPending}>✕</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="no-chart-data">No weigh-ins logged yet.</p>
      )}
    </div>
  );
}
