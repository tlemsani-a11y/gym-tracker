import { cookies } from "next/headers";

const COOKIE_NAME = "gym_tz";
export const DEFAULT_TIMEZONE = "UTC";

/** The visitor's IANA timezone (e.g. "Africa/Algiers"), as detected and
 *  stored by <TimezoneSync/> on their first page load. Falls back to UTC
 *  for the very first render before that cookie exists -- TimezoneSync
 *  corrects it and refreshes immediately after, so this only matters for
 *  a single initial paint. */
export async function getTimeZone(): Promise<string> {
  const store = await cookies();
  const tz = store.get(COOKIE_NAME)?.value;
  if (!tz) return DEFAULT_TIMEZONE;
  try {
    // Throws for garbage/invalid values (cookie tampering, old format, etc).
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
