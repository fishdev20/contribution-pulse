"use client";

import { createQueryClient } from "@/lib/query-client";
import { QueryClientProvider } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { ThemeProvider } from "next-themes";
import type { CSSProperties, ReactNode } from "react";
import { createContext, useContext, useMemo, useState } from "react";
import { Toaster, toast } from "sonner";

type ToastTone = "success" | "error" | "info";
type ToastInput = string | { title: string; subtitle?: string };
type ToastContextValue = {
  pushToast: (message: ToastInput, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient());

  const toastValue = useMemo<ToastContextValue>(
    () => ({
      pushToast: (message, tone = "info") => {
        const payload = typeof message === "string" ? { title: message } : message;
        const options = {
          description: payload.subtitle,
          duration: 3200,
          style: {
            background: "color-mix(in oklch, var(--background) 55%, transparent)",
            color: "var(--foreground)",
            border: "1px solid color-mix(in oklch, var(--border) 75%, transparent)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
          } as CSSProperties,
        };
        const toneClassName =
          tone === "success"
            ? "border-emerald-500/55 bg-emerald-500/12 text-foreground"
            : tone === "error"
              ? "border-red-500/55 bg-red-500/12 text-foreground"
              : "border-primary/55 bg-primary/12 text-foreground";

        if (tone === "success") {
          toast.success(payload.title, {
            ...options,
            className: toneClassName,
            icon: <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />,
          });
          return;
        }

        if (tone === "error") {
          toast.error(payload.title, {
            ...options,
            className: toneClassName,
            icon: <AlertCircle className="size-4 text-red-600 dark:text-red-400" />,
          });
          return;
        }

        toast(payload.title, {
          ...options,
          className: toneClassName,
          icon: <Info className="size-4 text-primary" />,
        });
      },
    }),
    [],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ToastContext.Provider value={toastValue}>
          {children}
          <Toaster
            theme="system"
            position="top-right"
            richColors={false}
            closeButton
            expand={false}
            visibleToasts={5}
            offset={20}
            toastOptions={{
              className:
                "group rounded-xl text-foreground shadow-lg [&_[data-close-button]]:rounded-full [&_[data-close-button]]:border [&_[data-close-button]]:border-border/80 [&_[data-close-button]]:bg-background/80 [&_[data-close-button]]:text-foreground [&_[data-close-button]]:shadow-sm hover:[&_[data-close-button]]:bg-accent hover:[&_[data-close-button]]:text-foreground",
              classNames: {
                toast:
                  "group rounded-xl text-foreground shadow-lg [&_[data-close-button]]:rounded-full [&_[data-close-button]]:border [&_[data-close-button]]:border-border/80 [&_[data-close-button]]:bg-background/80 [&_[data-close-button]]:text-foreground",
                title: "text-sm font-semibold tracking-tight text-foreground",
                description: "text-xs text-foreground/85 leading-relaxed mt-1",
                closeButton:
                  "border-border/80 bg-background/80 text-foreground hover:bg-accent hover:text-foreground",
              },
            }}
          />
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
