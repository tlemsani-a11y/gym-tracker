"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "@/components/DayPicker";
import { createProgramAction } from "@/lib/actions";

export function NewProgramForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [days, setDays] = useState<number[]>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleDay(day: number) {
    setDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }

  function submit() {
    const name = inputRef.current?.value.trim();
    if (!name) return;
    const fd = new FormData();
    fd.set("name", name);
    days.forEach((d) => fd.append("days", String(d)));
    startTransition(async () => {
      await createProgramAction(fd);
      if (inputRef.current) inputRef.current.value = "";
      setDays([]);
      router.refresh();
    });
  }

  return (
    <div>
      <div className="row">
        <input
          ref={inputRef}
          type="text"
          placeholder="e.g. Push, Pull, Legs"
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button className="btn btn-primary" style={{ flex: "0 0 auto" }} onClick={submit} disabled={isPending}>
          Add
        </button>
      </div>
      <div style={{ marginTop: "0.65rem" }}>
        <span className="eyebrow">Scheduled days (optional)</span>
        <DayPicker selected={days} onToggle={toggleDay} disabled={isPending} />
      </div>
    </div>
  );
}
