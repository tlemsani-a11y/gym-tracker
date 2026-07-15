"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/AppProviders";
import { deleteSessionAction, restoreSessionAction } from "@/lib/actions";

export function DeleteSessionButton({
  sessionId,
  programName,
  mode = "undo",
  redirectTo = "/history",
  className = "btn btn-sm btn-danger",
  children = "Delete",
}: {
  sessionId: string;
  programName: string;
  mode?: "undo" | "redirect";
  redirectTo?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const { showToast, showUndoToast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      className={className}
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(`Delete this "${programName}" workout? This removes all its logged sets.`)) return;
        startTransition(async () => {
          const removed = await deleteSessionAction(sessionId);
          if (!removed) return;

          if (mode === "redirect") {
            showToast("Workout deleted");
            router.push(redirectTo);
            return;
          }

          showUndoToast("Workout deleted", () => {
            startTransition(async () => {
              await restoreSessionAction(removed.session, removed.sets);
              router.refresh();
            });
          });
          router.refresh();
        });
      }}
    >
      {children}
    </button>
  );
}
