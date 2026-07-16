import Link from "next/link";
import { notFound } from "next/navigation";
import { getActiveProfile } from "@/lib/profile-session";
import { getTimeZone } from "@/lib/timezone-session";
import { getSession, getProgram, getExercises, getExercise, getSetsForSession, type Exercise } from "@/lib/queries";
import { plateColorClass, fmtDate } from "@/lib/calc";
import { SessionExerciseCard } from "@/components/SessionExerciseCard";
import { RestPresetButtons } from "@/components/RestPresetButtons";
import { DeleteSessionButton } from "@/components/DeleteSessionButton";

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getActiveProfile();
  const timeZone = await getTimeZone();
  const session = await getSession(id);
  if (!session || session.profile_id !== profile.id) notFound();

  const program = session.program_id ? await getProgram(session.program_id) : undefined;
  const programExercises = program ? await getExercises(program.id) : [];
  const sets = await getSetsForSession(id);

  // Normally every set's exercise comes from the session's linked program.
  // But a session can end up without a valid program link (e.g. an
  // imported backup whose program was later renamed or deleted) while its
  // sets are still perfectly intact -- fall back to whatever exercises
  // those sets actually reference so the workout still shows up here.
  const coveredIds = new Set(programExercises.map((e) => e.id));
  const extraIds = Array.from(new Set(sets.map((s) => s.exercise_id))).filter((eid) => !coveredIds.has(eid));
  const extraExercises = await Promise.all(
    extraIds.map(async (eid): Promise<Exercise> => {
      const ex = await getExercise(eid);
      return ex ?? { id: eid, program_id: "", name: "Deleted exercise", sort_order: 999 };
    })
  );
  const exercises = [...programExercises, ...extraExercises];

  return (
    <>
      <h1 style={{ marginBottom: 0 }}>{session.program_name}</h1>
      <p className="muted">{fmtDate(session.created_at, timeZone)}</p>

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

      <div className="row">
        <Link href="/" className="btn" style={{ flex: "1 1 auto" }}>Finish &amp; Back to Dashboard</Link>
        <DeleteSessionButton
          sessionId={id}
          programName={session.program_name}
          mode="redirect"
          redirectTo="/history"
          className="btn btn-danger"
        >
          Delete workout
        </DeleteSessionButton>
      </div>
    </>
  );
}
