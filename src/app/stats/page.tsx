import { getActiveProfile } from "@/lib/profile-session";
import { getTimeZone } from "@/lib/timezone-session";
import { getPrograms, getExercises, getAllSetsForExercise, getTopSetPerSessionForExercise, getOverallStats, getBodyweightLogs, type Exercise } from "@/lib/queries";
import { plateColorClass, estOneRM, fmtShortDate } from "@/lib/calc";
import { BodyweightSection } from "@/components/BodyweightSection";
import { LineChart } from "@/components/LineChart";

export default async function StatsPage() {
  const profile = await getActiveProfile();
  const timeZone = await getTimeZone();
  const [overall, logs, programs] = await Promise.all([
    getOverallStats(profile.id),
    getBodyweightLogs(profile.id),
    getPrograms(profile.id),
  ]);

  const exercisesByProgram = await Promise.all(programs.map((p) => getExercises(p.id)));
  const allExercises: (Exercise & { programName: string })[] = programs.flatMap((p, i) =>
    exercisesByProgram[i].map((ex) => ({ ...ex, programName: p.name }))
  );

  const exerciseStats = await Promise.all(
    allExercises.map(async (ex) => {
      const sets = await getAllSetsForExercise(profile.id, ex.id);
      if (!sets.length) return { ex, sets, maxWeightSet: null, bestEst: 0, points: [] as { label: string; value: number }[] };

      let maxWeightSet = sets[0];
      let bestEst = estOneRM(sets[0].weight, sets[0].reps);
      for (const s of sets) {
        if (s.weight > maxWeightSet.weight) maxWeightSet = s;
        const est = estOneRM(s.weight, s.reps);
        if (est > bestEst) bestEst = est;
      }
      const rawPoints = await getTopSetPerSessionForExercise(profile.id, ex.id);
      const points = rawPoints.map((p) => ({ label: fmtShortDate(p.iso, timeZone), value: p.value }));
      return { ex, sets, maxWeightSet, bestEst, points };
    })
  );

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
        exerciseStats.map(({ ex, sets, maxWeightSet, bestEst, points }, i) => {
          if (!sets.length) {
            return (
              <div key={ex.id} className={`card ${plateColorClass(i)}`}>
                <div className="exercise-stat-header">
                  <h2 style={{ margin: 0 }}>{ex.name}</h2>
                  <span className="muted">{ex.programName}</span>
                </div>
                <p className="no-chart-data">No sets logged yet.</p>
              </div>
            );
          }
          return (
            <div key={ex.id} className={`card ${plateColorClass(i)}`}>
              <div className="exercise-stat-header">
                <h2 style={{ margin: 0 }}>{ex.name}</h2>
                <span className="muted">{ex.programName}</span>
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
