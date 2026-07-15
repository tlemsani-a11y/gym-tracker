"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";

/** A text input + button that calls a server action and clears itself after. */
export function AddItemForm({
  action,
  placeholder,
  buttonLabel = "Add",
  autoFocus = false,
}: {
  action: (formData: FormData) => Promise<void>;
  placeholder: string;
  buttonLabel?: string;
  autoFocus?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    const value = inputRef.current?.value.trim();
    if (!value) return;
    const fd = new FormData();
    fd.set("name", value);
    startTransition(async () => {
      await action(fd);
      if (inputRef.current) inputRef.current.value = "";
      router.refresh();
    });
  }

  return (
    <div className="row">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        autoFocus={autoFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
      />
      <button className="btn btn-primary" style={{ flex: "0 0 auto" }} onClick={submit} disabled={isPending}>
        {buttonLabel}
      </button>
    </div>
  );
}

export function RenameButton({
  currentName,
  promptLabel,
  action,
  className = "btn btn-sm",
  children = "Rename",
}: {
  currentName: string;
  promptLabel: string;
  action: (newName: string) => Promise<void>;
  className?: string;
  children?: React.ReactNode;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      className={className}
      style={{ flex: "0 0 auto" }}
      disabled={isPending}
      onClick={() => {
        const newName = window.prompt(promptLabel, currentName);
        if (!newName || !newName.trim()) return;
        startTransition(async () => {
          await action(newName.trim());
          router.refresh();
        });
      }}
    >
      {children}
    </button>
  );
}

export function DeleteButton({
  confirmMessage,
  action,
  className = "btn btn-sm btn-danger",
  children = "Delete",
  onDeleted,
  redirectTo,
}: {
  confirmMessage: string;
  action: () => Promise<void>;
  className?: string;
  children?: React.ReactNode;
  onDeleted?: () => void;
  redirectTo?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <button
      className={className}
      style={{ flex: "0 0 auto" }}
      disabled={isPending}
      onClick={() => {
        if (!window.confirm(confirmMessage)) return;
        startTransition(async () => {
          await action();
          onDeleted?.();
          if (redirectTo) {
            router.push(redirectTo);
          } else {
            router.refresh();
          }
        });
      }}
    >
      {children}
    </button>
  );
}

export function MoveButtons({
  onMoveUp,
  onMoveDown,
  disableUp,
  disableDown,
}: {
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
  disableUp: boolean;
  disableDown: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <span style={{ display: "flex", gap: "0.25rem" }}>
      <button
        className="btn btn-sm reorder-btn"
        disabled={disableUp || isPending}
        onClick={() => startTransition(async () => { await onMoveUp(); router.refresh(); })}
      >
        ▲
      </button>
      <button
        className="btn btn-sm reorder-btn"
        disabled={disableDown || isPending}
        onClick={() => startTransition(async () => { await onMoveDown(); router.refresh(); })}
      >
        ▼
      </button>
    </span>
  );
}
