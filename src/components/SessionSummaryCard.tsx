import Link from "next/link";
import { getExercise, getSetsForSession, type SessionRow } from "@/lib/queries";
import { fmtDate } from "@/lib/calc";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";
import { SessionSelectCheckbox } from "@/components/HistoryBulkSelect";

export async function SessionSummaryCard({ session, timeZone }: { session: SessionRow; timeZone: string }) {
  const sets = await getSetsForSession(session.id);

  // Group directly from the sets that were actually logged, rather than by
  // walking program -> exercises -> matching sets. That indirect path
  // silently hides real, correctly-stored sets whenever a session's
  // program link is missing or stale (e.g. an imported backup whose
  // program was later renamed or deleted) -- grouping from the sets
  // themselves is robust to that, and matches how Stats already handles
  // exercises that no longer exist ("Deleted exercise").
  const exerciseIds = Array.from(new Set(sets.map((s) => s.exercise_id)));
  const exerciseNames = await Promise.all(
    exerciseIds.map(async (id) => (await getExercise(id))?.name ?? "Deleted exercise")
  );
  const groups = exerciseIds.map((id, i) => ({
    id,
    name: exerciseNames[i],
    exSets: sets.filter((s) => s.exercise_id === id),
  }));

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "center" }}>
        <SessionSelectCheckbox sessionId={session.id} />
        <div>
          <h2 style={{ marginBottom: "0.15rem" }}>{session.program_name}</h2>
          <p className="muted" style={{ margin: 0 }}>{fmtDate(session.created_at, timeZone)}</p>
        </div>
        <span style={{ display: "flex", gap: "0.4rem", flex: "0 0 auto" }}>
          <Link href={`/session/${session.id}`} className="btn btn-sm">Open</Link>
          <DeleteSessionButton sessionId={session.id} programName={session.program_name} mode="undo" className="btn btn-sm btn-danger">
            ✕
          </DeleteSessionButton>
        </span>
      </div>
      {groups.length ? (
        groups.map(({ id, name, exSets }) => (
          <div key={id} style={{ marginTop: "0.5rem" }}>
            <strong>{name}</strong>
            {exSets.map((s, i) => (
              <div key={s.id} className="muted">Set {i + 1} → {s.weight} kg × {s.reps}</div>
            ))}
          </div>
        ))
      ) : (
        <p className="muted" style={{ marginTop: "0.5rem" }}>No sets logged.</p>
      )}
    </div>
  );
}
