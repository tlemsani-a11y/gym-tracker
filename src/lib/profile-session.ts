import { cookies } from "next/headers";
import { dbAll, dbGet, ensureAtLeastOneProfile } from "./db";

const COOKIE_NAME = "gym_active_profile";

export type Profile = {
  id: string;
  name: string;
  created_at: string;
  default_rest_seconds: number;
};

export async function getActiveProfile(): Promise<Profile> {
  const fallbackId = await ensureAtLeastOneProfile();
  const store = await cookies();
  const cookieId = store.get(COOKIE_NAME)?.value;

  const id = cookieId ?? fallbackId;
  let profile = await dbGet<Profile>("SELECT * FROM profiles WHERE id = ?", [id]);

  if (!profile) {
    profile = await dbGet<Profile>("SELECT * FROM profiles WHERE id = ?", [fallbackId]);
  }
  return profile as Profile;
}

export async function setActiveProfileCookie(profileId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 5,
  });
}

export async function listProfiles(): Promise<Profile[]> {
  await ensureAtLeastOneProfile();
  return dbAll<Profile>("SELECT * FROM profiles ORDER BY created_at ASC");
}
