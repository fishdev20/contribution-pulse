"use client";

import { useState } from "react";
import Link from "next/link";
import { FileText, Link2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppToast } from "@/components/providers";
import { useCreateHighlightMutation, useCreateShareMutation, useRevokeShareMutation } from "@/lib/api/hooks";

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
              <Link
                className="block break-all rounded-md border border-border/60 bg-background px-3 py-2 font-mono text-xs underline-offset-4 hover:underline"
                href={`/public-report/${activeShare.token}`}
              >
                {`/public-report/${activeShare.token}`}
              </Link>
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
            <Input type="date" value={highlightDate} onChange={(event) => setHighlightDate(event.target.value)} className="h-11 sm:w-[220px]" />
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
