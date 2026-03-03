"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { CalendarIcon, Check, Copy, FileText, Link2, Sparkles, Trash2 } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/components/providers";
import { useCreateHighlightMutation, useCreateShareMutation, useRevokeShareMutation } from "@/lib/api/hooks";
import { cn } from "@/lib/cn";

type Highlight = { id: string; date: string; note: string };
type Share = { token: string; revokedAt: string | null; expiresAt: string | null };

export function DashboardPanelsClient({
  initialHighlights,
  initialShares,
}: {
  initialHighlights: Highlight[];
  initialShares: Share[];
}) {
  const { pushToast } = useAppToast();
  const createShareMutation = useCreateShareMutation();
  const revokeShareMutation = useRevokeShareMutation();
  const createHighlightMutation = useCreateHighlightMutation();
  const [shares, setShares] = useState(initialShares);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [expiresInDays, setExpiresInDays] = useState("");
  const [highlightDate, setHighlightDate] = useState("");
  const [highlightNote, setHighlightNote] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const now = new Date();
  const activeShare = shares.find((share) => !share.revokedAt && (!share.expiresAt || new Date(share.expiresAt) > now));

  async function createShare() {
    try {
      const payload = await createShareMutation.mutateAsync(expiresInDays);
      if (payload.token) {
        setShares((prev) => [{ token: payload.token!, revokedAt: null, expiresAt: null }, ...prev]);
      }
      pushToast({ title: "Share link created", subtitle: "Public report link is now active." }, "success");
      setExpiresInDays("");
    } catch {
      pushToast({ title: "Share creation failed", subtitle: "Could not create public share link." }, "error");
    }
  }

  async function revokeShare(token: string) {
    try {
      await revokeShareMutation.mutateAsync(token);
      setShares((prev) => prev.map((item) => (item.token === token ? { ...item, revokedAt: new Date().toISOString() } : item)));
      pushToast({ title: "Share link revoked", subtitle: "Public link has been disabled." }, "success");
    } catch {
      pushToast({ title: "Revoke failed", subtitle: "Could not revoke share link." }, "error");
    }
  }

  async function addHighlight() {
    if (!highlightDate || !highlightNote.trim()) {
      pushToast({ title: "Missing fields", subtitle: "Date and note are required." }, "error");
      return;
    }
    try {
      const payload = await createHighlightMutation.mutateAsync({ date: highlightDate, note: highlightNote.trim() });
      if (payload.id) setHighlights((prev) => [{ id: payload.id!, date: highlightDate, note: highlightNote.trim() }, ...prev]);
      pushToast({ title: "Highlight added", subtitle: "Manual highlight was saved." }, "success");
      setHighlightDate("");
      setHighlightNote("");
    } catch {
      pushToast({ title: "Save failed", subtitle: "Could not save highlight." }, "error");
    }
  }

  const selectedHighlightDate = highlightDate ? new Date(`${highlightDate}T00:00:00.000Z`) : undefined;

  async function copyShareLink(token: string) {
    const value =
      typeof window !== "undefined"
        ? `${window.location.origin}/public-report/${token}`
        : `/public-report/${token}`;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedToken(token);
      pushToast({ title: "Link copied", subtitle: "Public report URL copied to clipboard." }, "success");
      window.setTimeout(() => setCopiedToken((current) => (current === token ? null : current)), 1500);
    } catch {
      pushToast({ title: "Copy failed", subtitle: "Could not copy link to clipboard." }, "error");
    }
  }

  return (
    <section className="animate-in fade-in slide-in-from-bottom-2 grid min-w-0 gap-6 duration-500 md:grid-cols-2">
      <div className="min-w-0 rounded-xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Link2 className="h-4 w-4" />
          </span>
          Public report
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">Create a read-only share link. No private metadata is included.</p>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <Input
            value={expiresInDays}
            onChange={(event) => setExpiresInDays(event.target.value)}
            type="number"
            min={1}
            placeholder="Expires in days (optional)"
            className="h-11"
          />
          <Button className="h-11 sm:w-fit" type="button" onClick={createShare}>
            Create share link
          </Button>
        </div>

        {activeShare ? (
          <div className="mt-4 min-w-0 space-y-3 rounded-lg border border-border/70 bg-muted/20 p-4 text-sm">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Active link</p>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  className="block min-w-0 flex-1 break-all rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-xs underline-offset-4 hover:underline"
                  href={`/public-report/${activeShare.token}`}
                >
                  {`/public-report/${activeShare.token}`}
                </Link>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="gap-2"
                  onClick={() => copyShareLink(activeShare.token)}
                >
                  {copiedToken === activeShare.token ? <Check className="size-4" /> : <Copy className="size-4" />}
                  {copiedToken === activeShare.token ? "Copied" : "Copy link"}
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/api/report/pdf/${activeShare.token}`}>
                <Button type="button" size="sm" variant="outline" className="gap-2">
                  <FileText className="size-4" />
                  Export PDF
                </Button>
              </Link>
              <Button variant="destructive" size="sm" type="button" className="gap-2" onClick={() => revokeShare(activeShare.token)}>
                <Trash2 className="size-4" />
                Revoke link
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            No active public report link yet.
          </div>
        )}
      </div>

      <div className="min-w-0 rounded-xl border border-border/60 bg-card/70 p-6 shadow-sm">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Sparkles className="h-4 w-4" />
          </span>
          Manual highlights
        </h2>
        <div className="mt-4 space-y-4">
          <div className="grid gap-3">
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
              <PopoverTrigger
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-11 w-full justify-start text-left font-normal sm:w-[220px]",
                  !selectedHighlightDate && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="size-4" />
                {selectedHighlightDate ? format(selectedHighlightDate, "PPP") : "Pick a date"}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedHighlightDate}
                  onSelect={(date) => {
                    if (!date) return;
                    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                    setHighlightDate(utcDate.toISOString().slice(0, 10));
                    setDatePickerOpen(false);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Textarea
              value={highlightNote}
              onChange={(event) => setHighlightNote(event.target.value)}
              className="min-h-[90px]"
              placeholder="Shipped onboarding, improved CI throughput..."
            />
            <Button className="w-full sm:w-fit" type="button" onClick={addHighlight}>
              Add highlight
            </Button>
          </div>
          <ul className="space-y-2 text-sm">
            {highlights.map((highlight) => (
              <li key={highlight.id} className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                <p className="font-semibold text-foreground">{highlight.date.slice(0, 10)}</p>
                <p className="mt-0.5 text-muted-foreground">{highlight.note}</p>
              </li>
            ))}
            {highlights.length === 0 ? (
              <li className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2 text-muted-foreground">
                No highlights yet.
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </section>
  );
}
