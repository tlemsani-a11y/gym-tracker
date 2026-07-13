import Link from "next/link";
import { getProgram, getExercises, getSetsForSession, type SessionRow } from "@/lib/queries";
import { fmtDate } from "@/lib/calc";

export async function SessionSummaryCard({ session }: { session: SessionRow }) {
  const program = session.program_id ? await getProgram(session.program_id) : undefined;
  const exercises = program ? await getExercises(program.id) : [];
  const sets = await getSetsForSession(session.id);

  const groups = exercises
    .map((ex) => ({ ex, exSets: sets.filter((s) => s.exercise_id === ex.id) }))
    .filter((g) => g.exSets.length > 0);

  return (
    <div className="card">
      <div className="row" style={{ alignItems: "center" }}>
        <div>
          <h2 style={{ marginBottom: "0.15rem" }}>{session.program_name}</h2>
          <p className="muted" style={{ margin: 0 }}>{fmtDate(session.created_at)}</p>
        </div>
        <Link href={`/session/${session.id}`} className="btn btn-sm" style={{ flex: "0 0 auto" }}>Open</Link>
      </div>
      {groups.length ? (
        groups.map(({ ex, exSets }) => (
          <div key={ex.id} style={{ marginTop: "0.5rem" }}>
            <strong>{ex.name}</strong>
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
