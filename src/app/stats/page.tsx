import { getActiveProfile } from "@/lib/profile-session";
import { getTimeZone } from "@/lib/timezone-session";
import {
  getPrograms,
  getAllExercisesForProfile,
  getAllSetsForProfile,
  getSessions,
  getOverallStats,
  getBodyweightLogs,
  type SetRow,
} from "@/lib/queries";
import { plateColorClass, estOneRM, fmtShortDate } from "@/lib/calc";
import { BodyweightSection } from "@/components/BodyweightSection";
import { LineChart } from "@/components/LineChart";

export default async function StatsPage() {
  const profile = await getActiveProfile();
  const timeZone = await getTimeZone();

  // Six bulk queries total, regardless of how many exercises or workouts
  // exist -- computing PRs and per-session chart points in memory below
  // instead of running a query per exercise (and per session within each
  // exercise) avoids what would otherwise be hundreds of network round
  // trips against the remote database.
  const [overall, logs, programs, allExercises, allSets, sessions] = await Promise.all([
    getOverallStats(profile.id),
    getBodyweightLogs(profile.id),
    getPrograms(profile.id),
    getAllExercisesForProfile(profile.id),
    getAllSetsForProfile(profile.id),
    getSessions(profile.id),
  ]);

  const programNameById = new Map(programs.map((p) => [p.id, p.name]));
  const sessionsAsc = [...sessions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

  const setsByExercise = new Map<string, SetRow[]>();
  allSets.forEach((s) => {
    const list = setsByExercise.get(s.exercise_id) ?? [];
    list.push(s);
    setsByExercise.set(s.exercise_id, list);
  });

  const exerciseStats = allExercises.map((ex) => {
    const sets = setsByExercise.get(ex.id) ?? [];
    const programName = programNameById.get(ex.program_id) ?? "";
    if (!sets.length) {
      return { ex, programName, sets, maxWeightSet: null, bestEst: 0, points: [] as { label: string; value: number }[] };
    }

    let maxWeightSet = sets[0];
    let bestEst = estOneRM(sets[0].weight, sets[0].reps);
    for (const s of sets) {
      if (s.weight > maxWeightSet.weight) maxWeightSet = s;
      const est = estOneRM(s.weight, s.reps);
      if (est > bestEst) bestEst = est;
    }

    const points: { label: string; value: number }[] = [];
    for (const session of sessionsAsc) {
      const sessionSets = sets.filter((s) => s.session_id === session.id);
      if (!sessionSets.length) continue;
      const top = sessionSets.reduce((a, b) => (b.weight > a.weight ? b : a));
      points.push({ label: fmtShortDate(session.created_at, timeZone), value: top.weight });
    }

    return { ex, programName, sets, maxWeightSet, bestEst, points };
  });

  return (
    <>
      <h1>Stats</h1>

      <div className="stat-summary">
        <div className="stat-box"><span className="num">{overall.totalSessions}</span><span className="label">Sessions</span></div>
        <div className="stat-box"><span className="num">{overall.totalSets}</span><span className="label">Sets logged</span></div>
        <div className="stat-box"><span className="num">{overall.workoutsThisWeek}</span><span className="label">This week</span></div>
        <div className="stat-box"><span className="num">{overall.totalPrograms}</span><span className="label">Programs</span></div>
      </div>

      <BodyweightSection logs={logs} timeZone={timeZone} />

      {exerciseStats.length ? (
        exerciseStats.map(({ ex, programName, sets, maxWeightSet, bestEst, points }, i) => {
          if (!sets.length) {
            return (
              <div key={ex.id} className={`card ${plateColorClass(i)}`}>
                <div className="exercise-stat-header">
                  <h2 style={{ margin: 0 }}>{ex.name}</h2>
                  <span className="muted">{programName}</span>
                </div>
                <p className="no-chart-data">No sets logged yet.</p>
              </div>
            );
          }
          return (
            <div key={ex.id} className={`card ${plateColorClass(i)}`}>
              <div className="exercise-stat-header">
                <h2 style={{ margin: 0 }}>{ex.name}</h2>
                <span className="muted">{programName}</span>
              </div>
              <p className="pr-line">
                PR: <strong>{maxWeightSet!.weight} kg × {maxWeightSet!.reps}</strong> <span className="pr-badge">Best</span>
              </p>
              <p className="muted" style={{ margin: "0.15rem 0 0" }}>Est. 1RM: {bestEst.toFixed(1)} kg</p>
              <div className="chart-wrap">
                <LineChart dataPoints={points} />
              </div>
            </div>
          );
        })
      ) : (
        <div className="empty-state">No exercises yet. Add some in Programs first.</div>
      )}
    </>
  );
}
