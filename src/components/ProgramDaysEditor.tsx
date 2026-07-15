"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DayPicker } from "@/components/DayPicker";
import { updateProgramDaysAction } from "@/lib/actions";

export function ProgramDaysEditor({ programId, initialDays }: { programId: string; initialDays: number[] }) {
  const [days, setDays] = useState<number[]>(initialDays);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleDay(day: number) {
    const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
    setDays(next);
    startTransition(async () => {
      await updateProgramDaysAction(programId, next);
      router.refresh();
    });
  }

  return <DayPicker selected={days} onToggle={toggleDay} disabled={isPending} />;
}
