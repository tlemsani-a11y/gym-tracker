"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/* ---------- Toast ---------- */

type ToastState = { message: string; variant?: "pr" | undefined; undo?: () => void } | null;

type ToastContextValue = {
  showToast: (msg: string, variant?: "pr") => void;
  showUndoToast: (msg: string, undoFn: () => void) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within AppProviders");
  return ctx;
}

/* ---------- Rest timer ---------- */

type RestTimerState = {
  totalSeconds: number;
  secondsLeft: number;
  running: boolean;
  label: string;
  done: boolean;
} | null;

type RestTimerContextValue = {
  timer: RestTimerState;
  start: (seconds: number, label?: string) => void;
  pauseResume: () => void;
  adjust: (delta: number) => void;
  skip: () => void;
};

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

export function useRestTimer() {
  const ctx = useContext(RestTimerContext);
  if (!ctx) throw new Error("useRestTimer must be used within AppProviders");
  return ctx;
}

/* ---------- Combined provider ---------- */

export function AppProviders({ children }: { children: React.ReactNode }) {
  // ---- toast state ----
  const [toast, setToast] = useState<ToastState>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastUndoRef = useRef<(() => void) | null>(null);

  const showToast = useCallback((message: string, variant?: "pr") => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    lastUndoRef.current = null;
    setToast({ message, variant });
    setToastVisible(true);
    hideTimeoutRef.current = setTimeout(() => setToastVisible(false), 1800);
  }, []);

  const showUndoToast = useCallback((message: string, undoFn: () => void) => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    lastUndoRef.current = undoFn;
    setToast({ message, undo: undoFn });
    setToastVisible(true);
    hideTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
      lastUndoRef.current = null;
    }, 5000);
  }, []);

  const performUndo = useCallback(() => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    lastUndoRef.current?.();
    lastUndoRef.current = null;
    setToastVisible(false);
    showToast("Restored");
  }, [showToast]);

  // ---- rest timer state ----
  const [timer, setTimer] = useState<RestTimerState>(null);
  const timerRef = useRef<RestTimerState>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Keep a ref mirror of the latest timer state so the setInterval callback
  // (an ordinary async callback, not a render/effect) can read it synchronously.
  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  const getAudioContext = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      if (!audioCtxRef.current) audioCtxRef.current = new Ctx();
      if (audioCtxRef.current.state === "suspended") audioCtxRef.current.resume().catch(() => {});
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  const playTick = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 1000;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {}
  }, [getAudioContext]);

  const playRestDoneSound = useCallback(() => {
    const ctx = getAudioContext();
    if (!ctx) return;
    try {
      const notes = [660, 880, 1108.73];
      notes.forEach((freq, i) => {
        const startAt = ctx.currentTime + i * 0.14;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.28, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.32);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + 0.34);
      });
    } catch {}
  }, [getAudioContext]);

  const finishTimer = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    playRestDoneSound();
    if (navigator.vibrate) navigator.vibrate([180, 90, 180, 90, 260]);
    setTimer((t) => (t ? { ...t, running: false, secondsLeft: 0, done: true } : t));
    setTimeout(() => {
      setTimer((t) => (t && t.secondsLeft === 0 ? null : t));
    }, 4000);
  }, [playRestDoneSound]);

  const start = useCallback(
    (seconds: number, label = "Rest") => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      getAudioContext(); // unlock audio while we still have a user gesture
      const initial: RestTimerState = { totalSeconds: seconds, secondsLeft: seconds, running: true, label, done: false };
      timerRef.current = initial;
      setTimer(initial);
      intervalRef.current = setInterval(() => {
        const t = timerRef.current;
        if (!t || !t.running) return;
        const next = t.secondsLeft - 1;
        if (next <= 3 && next > 0) playTick();
        if (next <= 0) {
          finishTimer();
        } else {
          const updated = { ...t, secondsLeft: next };
          timerRef.current = updated;
          setTimer(updated);
        }
      }, 1000);
    },
    [getAudioContext, playTick, finishTimer]
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const pauseResume = useCallback(() => {
    setTimer((t) => (t ? { ...t, running: !t.running } : t));
  }, []);

  const adjust = useCallback((delta: number) => {
    setTimer((t) => {
      if (!t) return t;
      const secondsLeft = Math.max(0, t.secondsLeft + delta);
      return { ...t, secondsLeft, totalSeconds: Math.max(t.totalSeconds, secondsLeft) };
    });
  }, []);

  const skip = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(null);
  }, []);

  const mm = timer ? Math.floor(timer.secondsLeft / 60) : 0;
  const ss = timer ? timer.secondsLeft % 60 : 0;
  const circumference = 138.2;
  const fraction = timer && timer.totalSeconds > 0 ? timer.secondsLeft / timer.totalSeconds : 0;

  return (
    <ToastContext.Provider value={{ showToast, showUndoToast }}>
      <RestTimerContext.Provider value={{ timer, start, pauseResume, adjust, skip }}>
        {children}

        <div className={`toast ${toastVisible ? "show" : ""} ${toast?.variant === "pr" ? "pr" : ""}`} id="toast">
          {toast?.undo ? (
            <>
              {toast.message} <button className="toast-undo-btn" onClick={performUndo}>Undo</button>
            </>
          ) : (
            toast?.message
          )}
        </div>

        <div className={`rest-timer-bar ${timer ? "" : "hidden"} ${timer?.done ? "done" : ""}`} id="rest-timer-bar">
          <div className="rest-timer-ring-wrap">
            <svg viewBox="0 0 52 52">
              <circle className="rest-timer-ring-track" cx="26" cy="26" r="22"></circle>
              <circle
                className="rest-timer-ring-progress"
                cx="26"
                cy="26"
                r="22"
                strokeDasharray={circumference}
                strokeDashoffset={(circumference * (1 - fraction)).toFixed(1)}
              ></circle>
            </svg>
            <div className="rest-timer-ring-label">REST</div>
          </div>
          <div className="rest-timer-info">
            <span className="rest-timer-label">{timer?.done ? "Rest done — next set!" : timer?.label ?? "Rest"}</span>
            <span className="rest-timer-time">
              {mm}:{ss.toString().padStart(2, "0")}
            </span>
          </div>
          <div className="rest-timer-controls">
            <button className="btn btn-sm" onClick={() => adjust(-15)}>−15s</button>
            <button className="btn btn-sm" onClick={pauseResume}>{timer?.running ? "⏸" : "▶"}</button>
            <button className="btn btn-sm" onClick={() => adjust(15)}>+15s</button>
            <button className="btn btn-sm btn-danger" onClick={skip}>Skip</button>
          </div>
        </div>
      </RestTimerContext.Provider>
    </ToastContext.Provider>
  );
}
