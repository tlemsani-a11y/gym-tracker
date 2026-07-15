"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

const COOKIE_NAME = "gym_tz";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.split("=")[1];
}

export function TimezoneSync() {
  const router = useRouter();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (hasSynced.current) return;
    hasSynced.current = true;

    let detected: string;
    try {
      detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return;
    }
    if (!detected) return;

    const current = readCookie(COOKIE_NAME);
    if (current === detected) return;

    document.cookie = `${COOKIE_NAME}=${detected}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    // The server just rendered with the wrong (or default) timezone --
    // refresh once now that the cookie is right so dates line up.
    router.refresh();
  }, [router]);

  return null;
}
