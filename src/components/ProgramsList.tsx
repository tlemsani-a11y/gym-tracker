"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { plateColorClass, DAY_LABELS } from "@/lib/calc";
import { deleteProgramAction, deleteProgramsAction } from "@/lib/actions";
import { DeleteButton } from "@/components/CrudControls";

export type ProgramCardData = {
  id: string;
  name: string;
  days: number[];
  exerciseCount: number;
};

export function ProgramsList({ programs, todayIdx }: { programs: ProgramCardData[]; todayIdx: number }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function deleteSelected() {
    if (!selected.size) return;
    if (!window.confirm(`Delete ${selected.size} program${selected.size === 1 ? "" : "s"} and all their exercises? This cannot be undone.`)) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      await deleteProgramsAction(ids);
      setSelected(new Set());
      setSelectMode(false);
      router.refresh();
    });
  }

  return (
    <>
      <div className="row" style={{ marginBottom: "0.75rem", justifyContent: "flex-end" }}>
        {selectMode ? (
          <>
            <span className="muted" style={{ alignSelf: "center", flex: "0 0 auto" }}>{selected.size} selected</span>
            <button className="btn btn-sm btn-danger" style={{ flex: "0 0 auto" }} onClick={deleteSelected} disabled={!selected.size || isPending}>
              Delete selected
            </button>
            <button
              className="btn btn-sm"
              style={{ flex: "0 0 auto" }}
              onClick={() => {
                setSelectMode(false);
                setSelected(new Set());
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          <button className="btn btn-sm" style={{ flex: "0 0 auto" }} onClick={() => setSelectMode(true)} disabled={!programs.length}>
            Select
          </button>
        )}
      </div>

      {programs.length ? (
        programs.map((p, i) => (
          <div key={p.id} className={`card ${plateColorClass(i)}`}>
            <div className="card-header-row">
              {selectMode ? (
                <label style={{ display: "flex", alignItems: "center", gap: "0.55rem", flex: "1 1 auto", cursor: "pointer" }}>
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                  <h2 style={{ margin: 0 }}>{p.name}</h2>
                </label>
              ) : (
                <Link href={`/programs/${p.id}`} style={{ textDecoration: "none", color: "inherit", flex: "1 1 auto" }}>
                  <h2 style={{ margin: 0 }}>{p.name}</h2>
                </Link>
              )}
              {!selectMode ? (
                <DeleteButton
                  confirmMessage={`Delete "${p.name}" and all its exercises? This cannot be undone.`}
                  action={deleteProgramAction.bind(null, p.id)}
                  className="btn btn-sm btn-danger"
                >
                  ✕
                </DeleteButton>
              ) : null}
            </div>
            <p className="muted" style={{ margin: 0 }}>
              {p.exerciseCount} exercise{p.exerciseCount === 1 ? "" : "s"}
            </p>
            <div className="day-badge-row">
              {p.days.length ? (
                p.days.map((d) => (
                  <span key={d} className={`day-badge ${d === todayIdx ? "today" : ""}`}>{DAY_LABELS[d]}</span>
                ))
              ) : (
                <span className="day-badge">Unscheduled</span>
              )}
            </div>
            {!selectMode ? <Link href={`/programs/${p.id}`} className="btn btn-sm">Open</Link> : null}
          </div>
        ))
      ) : (
        <div className="empty-state">No programs yet — add one below.</div>
      )}
    </>
  );
}
