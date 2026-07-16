import { getActiveProfile } from "@/lib/profile-session";
import { getTimeZone } from "@/lib/timezone-session";
import { getProgramsWithDays, getExercises } from "@/lib/queries";
import { dayIndex } from "@/lib/calc";
import { NewProgramForm } from "@/components/NewProgramForm";
import { ProgramsList, type ProgramCardData } from "@/components/ProgramsList";

export default async function ProgramsPage() {
  const profile = await getActiveProfile();
  const timeZone = await getTimeZone();
  const programs = await getProgramsWithDays(profile.id);
  const exerciseCounts = await Promise.all(programs.map((p) => getExercises(p.id)));
  const todayIdx = dayIndex(timeZone);

  const cardData: ProgramCardData[] = programs.map((p, i) => ({
    id: p.id,
    name: p.name,
    days: p.days,
    exerciseCount: exerciseCounts[i].length,
  }));

  return (
    <>
      <h1>Programs</h1>
      <ProgramsList programs={cardData} todayIdx={todayIdx} />

      <div className="card">
        <h2>New program</h2>
        <NewProgramForm />
      </div>
    </>
  );
}
