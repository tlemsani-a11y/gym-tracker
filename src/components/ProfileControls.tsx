"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/AppProviders";
import { switchProfileAction, importProfileAction } from "@/lib/actions";

export function SwitchProfileButton({ profileId }: { profileId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      className="btn btn-primary"
      style={{ flex: "0 0 auto" }}
      disabled={isPending}
      onClick={() => startTransition(() => switchProfileAction(profileId))}
    >
      Switch to
    </button>
  );
}

export function ImportBackupForm() {
  const { showToast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function handlePick() {
    fileRef.current?.click();
  }

  function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const suggested = `${file.name.replace(/\.json$/i, "")} (imported)`;
    const name = window.prompt("Name for this imported profile", suggested);
    if (!name || !name.trim()) {
      e.target.value = "";
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    fd.set("name", name.trim());
    startTransition(async () => {
      try {
        const result = await importProfileAction(fd);
        e.target.value = "";
        if (result?.error) {
          window.alert(result.error);
          return;
        }
        if (result?.partial) {
          window.alert(`Imported as "${name.trim()}", but not everything made it in:\n\n${result.summary}`);
        } else {
          showToast(`Imported as "${name.trim()}" — ${result?.summary ?? ""}`);
        }
        router.refresh();
      } catch (err) {
        e.target.value = "";
        window.alert(`Import failed: ${err instanceof Error ? err.message : String(err)}. Try again.`);
      }
    });
  }

  return (
    <>
      <button className="btn" onClick={handlePick} disabled={isPending}>Import from file</button>
      <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={handleFileChosen} />
    </>
  );
}
