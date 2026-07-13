import { NextRequest, NextResponse } from "next/server";
import { dbGet } from "@/lib/db";
import { getPrograms, getExercises, getSessions, getSetsForSession, getBodyweightLogs } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) {
    return NextResponse.json({ error: "Missing profileId" }, { status: 400 });
  }

  const profile = await dbGet<{ id: string; name: string; default_rest_seconds: number }>(
    "SELECT * FROM profiles WHERE id = ?",
    [profileId]
  );
  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const rawPrograms = await getPrograms(profileId);
  const programs = await Promise.all(
    rawPrograms.map(async (p) => ({
      id: p.id,
      name: p.name,
      exercises: (await getExercises(p.id)).map((ex) => ({ id: ex.id, name: ex.name })),
    }))
  );

  const rawSessions = await getSessions(profileId);
  const sessions = await Promise.all(
    rawSessions.map(async (s) => ({
      id: s.id,
      programId: s.program_id,
      programName: s.program_name,
      createdAt: s.created_at,
      sets: (await getSetsForSession(s.id)).map((set) => ({
        id: set.id,
        exerciseId: set.exercise_id,
        weight: set.weight,
        reps: set.reps,
        createdAt: set.created_at,
      })),
    }))
  );

  const bodyweightLogs = (await getBodyweightLogs(profileId)).map((b) => ({
    id: b.id,
    date: b.date,
    weightKg: b.weight_kg,
  }));

  const payload = {
    app: "gym-tracker-nextjs",
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    profileName: profile.name,
    data: {
      programs,
      sessions,
      settings: { defaultRestSeconds: profile.default_rest_seconds },
      bodyweightLogs,
    },
  };

  const safeName = profile.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "profile";
  const datePart = new Date().toISOString().slice(0, 10);

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="gym-tracker-${safeName}-${datePart}.json"`,
    },
  });
}
