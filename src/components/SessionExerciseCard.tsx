"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast, useRestTimer } from "@/components/AppProviders";
import { addSetAction, deleteSetAction, restoreSetAction, updateSetAction } from "@/lib/actions";
import type { SetRow } from "@/lib/queries";

export function SessionExerciseCard({
  sessionId,
  exerciseId,
  exerciseName,
  colorClass,
  sets,
}: {
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  colorClass: string;
  sets: SetRow[];
}) {
  const { showToast, showUndoToast } = useToast();
  const { start } = useRestTimer();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingSetId, setEditingSetId] = useState<string | null>(null);

  const weightRef = useRef<HTMLInputElement>(null);
  const repsRef = useRef<HTMLInputElement>(null);
  const editWeightRef = useRef<HTMLInputElement>(null);
  const editRepsRef = useRef<HTMLInputElement>(null);

  function submitSet() {
    const weight = parseFloat(weightRef.current?.value ?? "");
    const reps = parseInt(repsRef.current?.value ?? "", 10);
    if (isNaN(weight) || isNaN(reps) || weight < 0 || reps < 0) {
      showToast("Enter weight and reps");
      return;
    }
    startTransition(async () => {
      const result = await addSetAction(sessionId, exerciseId, weight, reps);
      if (weightRef.current) weightRef.current.value = "";
      if (repsRef.current) repsRef.current.value = "";
      showToast(result.isNewPR ? `🎉 New PR! ${weight} kg` : "Saved", result.isNewPR ? "pr" : undefined);
      start(result.restSeconds, result.exerciseName);
      router.refresh();
    });
  }

  function removeSet(set: SetRow) {
    startTransition(async () => {
      await deleteSetAction(set.id);
      showUndoToast("Set deleted", () => {
        startTransition(async () => {
          await restoreSetAction(set);
          router.refresh();
        });
      });
      router.refresh();
    });
  }

  function saveEdit(setId: string) {
    const weight = parseFloat(editWeightRef.current?.value ?? "");
    const reps = parseInt(editRepsRef.current?.value ?? "", 10);
    if (isNaN(weight) || isNaN(reps) || weight < 0 || reps < 0) {
      showToast("Enter weight and reps");
      return;
    }
    startTransition(async () => {
      await updateSetAction(setId, weight, reps);
      setEditingSetId(null);
      showToast("Set updated");
      router.refresh();
    });
  }

  return (
    <div className={`card ${colorClass}`}>
      <h2>{exerciseName}</h2>
      {sets.map((s, i) =>
        s.id === editingSetId ? (
          <div key={s.id} className="set-row set-row-editing">
            <input ref={editWeightRef} type="number" inputMode="decimal" step="0.5" min="0" defaultValue={s.weight} style={{ maxWidth: 90 }} />
            <span className="muted">kg ×</span>
            <input ref={editRepsRef} type="number" inputMode="numeric" min="0" defaultValue={s.reps} style={{ maxWidth: 70 }} />
            <button className="btn btn-sm btn-success" onClick={() => saveEdit(s.id)} disabled={isPending}>✓</button>
            <button className="btn btn-sm" onClick={() => setEditingSetId(null)}>✕</button>
          </div>
        ) : (
          <div key={s.id} className="set-row">
            <span>Set {i + 1} → {s.weight} kg × {s.reps}</span>
            <span style={{ display: "flex", gap: "0.4rem" }}>
              <button className="btn btn-sm" onClick={() => setEditingSetId(s.id)}>✎</button>
              <button className="btn btn-sm btn-danger" onClick={() => removeSet(s)} disabled={isPending}>✕</button>
            </span>
          </div>
        )
      )}
      <div className="row" style={{ marginTop: "0.75rem" }}>
        <input ref={weightRef} type="number" inputMode="decimal" step="0.5" min="0" placeholder="Weight (kg)" />
        <input ref={repsRef} type="number" inputMode="numeric" min="0" placeholder="Reps" />
        <button className="btn btn-success" style={{ flex: "0 0 auto" }} onClick={submitSet} disabled={isPending}>Save</button>
      </div>
    </div>
  );
}
