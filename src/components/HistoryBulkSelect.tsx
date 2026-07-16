"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/AppProviders";
import { deleteSessionsAction, restoreSessionsAction } from "@/lib/actions";

type SelectCtxValue = {
  selectMode: boolean;
  selected: Set<string>;
  toggle: (id: string) => void;
};

const SelectCtx = createContext<SelectCtxValue | null>(null);

export function useHistorySelect() {
  return useContext(SelectCtx);
}

export function HistoryBulkSelect({ sessionIds, children }: { sessionIds: string[]; children: React.ReactNode }) {
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { showUndoToast } = useToast();

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
    if (!window.confirm(`Delete ${selected.size} workout${selected.size === 1 ? "" : "s"}? This removes all their logged sets.`)) return;
    const ids = Array.from(selected);
    startTransition(async () => {
      const removed = await deleteSessionsAction(ids);
      setSelected(new Set());
      setSelectMode(false);
      if (removed && removed.sessions.length) {
        showUndoToast(`${removed.sessions.length} workouts deleted`, () => {
          startTransition(async () => {
            await restoreSessionsAction(removed.sessions, removed.sets);
            router.refresh();
          });
        });
      }
      router.refresh();
    });
  }

  return (
    <SelectCtx.Provider value={{ selectMode, selected, toggle }}>
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
          <button className="btn btn-sm" style={{ flex: "0 0 auto" }} onClick={() => setSelectMode(true)} disabled={!sessionIds.length}>
            Select
          </button>
        )}
      </div>
      {children}
    </SelectCtx.Provider>
  );
}

export function SessionSelectCheckbox({ sessionId }: { sessionId: string }) {
  const ctx = useHistorySelect();
  if (!ctx || !ctx.selectMode) return null;
  return (
    <input
      type="checkbox"
      checked={ctx.selected.has(sessionId)}
      onChange={() => ctx.toggle(sessionId)}
      style={{ marginRight: "0.6rem", flex: "0 0 auto" }}
    />
  );
}
