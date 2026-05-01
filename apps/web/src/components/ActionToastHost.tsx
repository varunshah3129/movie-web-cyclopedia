"use client";

import { CheckCircle2, Info, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

type ToastKind = "success" | "error" | "info";

interface ToastPayload {
  message: string;
  kind?: ToastKind;
}

interface ToastState {
  id: number;
  message: string;
  kind: ToastKind;
}

declare global {
  interface WindowEventMap {
    "movie-toast": CustomEvent<ToastPayload>;
  }
}

export function showActionToast(message: string, kind: ToastKind = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>("movie-toast", { detail: { message, kind } }));
}

export function ActionToastHost() {
  const [toasts, setToasts] = useState<ToastState[]>([]);

  useEffect(() => {
    const onToast = (event: WindowEventMap["movie-toast"]) => {
      const payload = event.detail;
      if (!payload?.message) return;
      const id = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [...prev, { id, message: payload.message, kind: payload.kind ?? "success" }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((item) => item.id !== id));
      }, 2400);
    };
    window.addEventListener("movie-toast", onToast);
    return () => window.removeEventListener("movie-toast", onToast);
  }, []);

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[220] flex w-[min(92vw,26rem)] flex-col gap-2 sm:right-4 sm:top-4">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`rounded-xl border px-3 py-2 text-white shadow-2xl ${
            toast.kind === "error"
              ? "border-[var(--brand)]/45 bg-[#1c0f14]"
              : toast.kind === "info"
                ? "border-white/30 bg-[#111a2a]"
                : "border-white/25 bg-[#121826]"
          }`}
        >
          <div className="flex items-start gap-2">
            <span className={`mt-0.5 ${toast.kind === "error" ? "text-[var(--brand)]" : toast.kind === "info" ? "text-sky-300" : "text-amber-300"}`}>
              {toast.kind === "error" ? <XCircle size={16} /> : toast.kind === "info" ? <Info size={16} /> : <CheckCircle2 size={16} />}
            </span>
            <p className="text-sm font-medium">{toast.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
