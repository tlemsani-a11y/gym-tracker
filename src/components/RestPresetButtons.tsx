"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setDefaultRestSecondsAction } from "@/lib/actions";

export function RestPresetButtons({ current }: { current: number }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <div className="rest-preset-row">
      {[60, 90, 120, 180].map((secs) => (
        <button
          key={secs}
          className={`btn btn-sm ${current === secs ? "active" : ""}`}
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await setDefaultRestSecondsAction(secs);
              router.refresh();
            })
          }
        >
          {secs}s
        </button>
      ))}
    </div>
  );
}
