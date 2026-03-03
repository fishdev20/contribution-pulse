"use client";

import { useAppToast } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { useDeleteAccountMutation, useDisconnectIntegrationMutation } from "@/lib/api/hooks";
import { createClientSupabase } from "@/lib/supabase/client";
import { GitBranch, Github, LogOut, Trash2, Unplug } from "lucide-react";

export function AccountControls() {
  const { pushToast } = useAppToast();
  const disconnectMutation = useDisconnectIntegrationMutation();
  const deleteAccountMutation = useDeleteAccountMutation();

  async function signOut() {
    const supabase = createClientSupabase();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  async function disconnect(provider: "GITLAB" | "AZURE_DEVOPS" | "GITHUB") {
    try {
      await disconnectMutation.mutateAsync(provider);
      pushToast({ title: "Provider disconnected", subtitle: `${formatProvider(provider)} removed.` }, "success");
    } catch {
      pushToast({ title: "Action failed", subtitle: "Could not disconnect provider." }, "error");
    }
  }

  async function deleteAccount() {
    if (!confirm("Delete account and all data permanently?")) return;
    try {
      await deleteAccountMutation.mutateAsync();
      pushToast({ title: "Account deleted", subtitle: "All app data has been removed." }, "success");
      await signOut();
    } catch {
      pushToast({ title: "Delete failed", subtitle: "Could not delete account data." }, "error");
    }
  }

  return (
    <section className="grid gap-4 rounded-lg border border-border/60 bg-background/70 p-4">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" type="button" className="inline-flex items-center gap-2" onClick={() => disconnect("GITLAB")}>
          <GitBranch className="h-4 w-4" />
          Disconnect GitLab
        </Button>
        <Button variant="outline" type="button" className="inline-flex items-center gap-2" onClick={() => disconnect("AZURE_DEVOPS")}>
          <Unplug className="h-4 w-4" />
          Disconnect Azure DevOps
        </Button>
        <Button variant="outline" type="button" className="inline-flex items-center gap-2" onClick={() => disconnect("GITHUB")}>
          <Github className="h-4 w-4" />
          Disconnect GitHub
        </Button>
        <Button variant="outline" onClick={signOut} type="button" className="inline-flex items-center gap-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
      <Button variant="destructive" type="button" className="inline-flex w-fit items-center gap-2" onClick={deleteAccount}>
        <Trash2 className="h-4 w-4" />
        Delete account and data
      </Button>
    </section>
  );
}

function formatProvider(provider: "GITLAB" | "AZURE_DEVOPS" | "GITHUB") {
  if (provider === "GITLAB") return "GitLab";
  if (provider === "AZURE_DEVOPS") return "Azure DevOps";
  return "GitHub";
}
