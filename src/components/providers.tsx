"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { createQueryClient } from "@/lib/query-client";
import { ThemeProvider } from "next-themes";
type ToastTone = "success" | "error" | "info";
type ToastInput = string | { title: string; subtitle?: string };
type ToastItem = { id: string; title: string; subtitle?: string; tone: ToastTone };
type ToastContextValue = {
  pushToast: (message: ToastInput, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toastValue = useMemo<ToastContextValue>(
    () => ({
      pushToast: (message, tone = "info") => {
        const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const payload = typeof message === "string" ? { title: message } : message;
        setToasts((prev) => [...prev, { id, title: payload.title, subtitle: payload.subtitle, tone }]);
        window.setTimeout(() => {
          setToasts((prev) => prev.filter((toast) => toast.id !== id));
        }, 3200);
      },
    }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ToastContext.Provider value={toastValue}>
          {children}
          <div className="fixed right-4 top-20 z-[100] flex w-[min(92vw,360px)] flex-col gap-2">
            {toasts.map((toast) => (
              <div
                key={toast.id}
                className={
                  toast.tone === "success"
                    ? "rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900 shadow-md"
                    : toast.tone === "error"
                      ? "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 shadow-md"
                      : "rounded-md border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-900 shadow-md"
                }
              >
                <div className="flex items-start gap-2">
                  {toast.tone === "success" ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : toast.tone === "error" ? (
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  ) : (
                    <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold leading-5">{toast.title}</p>
                    {toast.subtitle ? <p className="mt-0.5 text-xs opacity-90">{toast.subtitle}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ToastContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export function useAppToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useAppToast must be used within Providers");
  return context;
}
