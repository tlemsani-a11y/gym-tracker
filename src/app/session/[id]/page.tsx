import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProfile } from "@/lib/profile-session";
import { getSession, getProgram, getExercises, getSetsForSession } from "@/lib/queries";
import { plateColorClass, fmtDate } from "@/lib/calc";
import { SessionExerciseCard } from "@/components/SessionExerciseCard";
import { RestPresetButtons } from "@/components/RestPresetButtons";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getActiveProfile();
  const session = await getSession(id);
  if (!session || session.profile_id !== profile.id) notFound();

  const program = session.program_id ? await getProgram(session.program_id) : undefined;
  const exercises = program ? await getExercises(program.id) : [];
  const sets = await getSetsForSession(id);

  return (
    <>
      <h1 style={{ marginBottom: 0 }}>{session.program_name}</h1>
      <p className="muted">{fmtDate(session.created_at)}</p>

      <div className="card">
        <span className="muted">Rest timer after each set</span>
        <RestPresetButtons current={profile.default_rest_seconds} />
      </div>

      {exercises.length ? (
        exercises.map((ex, i) => (
          <SessionExerciseCard
            key={ex.id}
            sessionId={id}
            exerciseId={ex.id}
            exerciseName={ex.name}
            colorClass={plateColorClass(i)}
            sets={sets.filter((s) => s.exercise_id === ex.id)}
          />
        ))
      ) : (
        <div className="empty-state">This program has no exercises yet.</div>
      )}

      <Link href="/" className="btn">Finish &amp; Back to Dashboard</Link>
    </>
  );
}
