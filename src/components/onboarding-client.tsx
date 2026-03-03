"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { AtSign, BadgeCheck, CircleDashed, Cloud, GitBranch, Github, Plus, RefreshCw, ServerCog, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppToast } from "@/components/providers";
import { useSaveAuthorEmailsMutation, useUpsertIntegrationMutation } from "@/lib/api/hooks";

type IntegrationView = {
  provider: "GITLAB" | "AZURE_DEVOPS" | "GITHUB";
  gitlabBaseUrl: string | null;
  azureOrg: string | null;
  authorEmails: string[];
};

export function OnboardingClient({ initialIntegrations }: { initialIntegrations: IntegrationView[] }) {
  const { pushToast } = useAppToast();
  const gitlabMutation = useUpsertIntegrationMutation("gitlab");
  const azureMutation = useUpsertIntegrationMutation("azure-devops");
  const githubMutation = useUpsertIntegrationMutation("github");
  const authorEmailsMutation = useSaveAuthorEmailsMutation();

  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [gitlabToken, setGitlabToken] = useState("");
  const [gitlabBaseUrl, setGitlabBaseUrl] = useState("https://gitlab.com");
  const [azureToken, setAzureToken] = useState("");
  const [azureOrg, setAzureOrg] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [emails, setEmails] = useState(initialIntegrations.flatMap((item) => item.authorEmails).join(","));

  const gitlab = integrations.find((i) => i.provider === "GITLAB");
  const azdo = integrations.find((i) => i.provider === "AZURE_DEVOPS");
  const github = integrations.find((i) => i.provider === "GITHUB");
  const connectedProviders = [
    gitlab ? { key: "gitlab", label: "GitLab" } : null,
    azdo ? { key: "azure", label: "Azure DevOps" } : null,
    github ? { key: "github", label: "GitHub" } : null,
  ].filter(Boolean) as Array<{ key: string; label: string }>;

  async function submitGitlab(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gitlabToken.trim()) {
      pushToast({ title: "Missing token", subtitle: "GitLab token is required." }, "error");
      return;
    }
    try {
      await gitlabMutation.mutateAsync({ token: gitlabToken.trim(), baseUrl: gitlabBaseUrl.trim() || "https://gitlab.com" });
      setIntegrations((prev) => upsertIntegration(prev, { provider: "GITLAB", gitlabBaseUrl: gitlabBaseUrl.trim() || "https://gitlab.com", azureOrg: null, authorEmails: [] }));
      setGitlabToken("");
      pushToast({ title: "GitLab integration saved", subtitle: "Credentials encrypted and stored." }, "success");
    } catch {
      pushToast({ title: "Save failed", subtitle: "Could not save GitLab integration." }, "error");
    }
  }

  async function submitAzure(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!azureToken.trim() || !azureOrg.trim()) {
      pushToast({ title: "Missing fields", subtitle: "Azure token and organization are required." }, "error");
      return;
    }
    try {
      await azureMutation.mutateAsync({ token: azureToken.trim(), organization: azureOrg.trim() });
      setIntegrations((prev) => upsertIntegration(prev, { provider: "AZURE_DEVOPS", gitlabBaseUrl: null, azureOrg: azureOrg.trim(), authorEmails: [] }));
      setAzureToken("");
      pushToast({ title: "Azure integration saved", subtitle: "Credentials encrypted and stored." }, "success");
    } catch {
      pushToast({ title: "Save failed", subtitle: "Could not save Azure DevOps integration." }, "error");
    }
  }

  async function submitGithub(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!githubToken.trim()) {
      pushToast({ title: "Missing token", subtitle: "GitHub token is required." }, "error");
      return;
    }
    try {
      await githubMutation.mutateAsync({ token: githubToken.trim() });
      setIntegrations((prev) => upsertIntegration(prev, { provider: "GITHUB", gitlabBaseUrl: null, azureOrg: null, authorEmails: [] }));
      setGithubToken("");
      pushToast({ title: "GitHub integration saved", subtitle: "Credentials encrypted and stored." }, "success");
    } catch {
      pushToast({ title: "Save failed", subtitle: "Could not save GitHub integration." }, "error");
    }
  }

  async function saveEmails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      await authorEmailsMutation.mutateAsync(emails);
      pushToast({ title: "Author emails saved", subtitle: "Commit matching aliases updated." }, "success");
    } catch {
      pushToast({ title: "Save failed", subtitle: "Could not save author emails." }, "error");
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
              <ShieldCheck className="h-7 w-7 text-primary" />
              Onboarding
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Connect read-only personal access tokens. Tokens are encrypted at rest and never logged.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Connected providers:</span>
          {connectedProviders.length > 0 ? (
            connectedProviders.map((provider) => (
              <span key={provider.key} className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-foreground">
                {provider.label}
              </span>
            ))
          ) : (
            <span className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-muted-foreground">None yet</span>
          )}
        </div>
      </section>

      <section className="animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-500">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Plus className="h-5 w-5 text-primary" />
            Add provider
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Connect another source to aggregate more contribution activity.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {!gitlab ? (
            <ProviderCard
              id="add-gitlab-provider"
              icon={<GitBranch className="h-4 w-4 text-primary" />}
              title="GitLab"
              description="Connect gitlab.com or self-hosted GitLab."
              submitLabel="Add GitLab provider"
              onSubmit={submitGitlab}
            >
              <Input value={gitlabToken} onChange={(event) => setGitlabToken(event.target.value)} required type="password" placeholder="GitLab PAT" />
              <Input value={gitlabBaseUrl} onChange={(event) => setGitlabBaseUrl(event.target.value)} placeholder="https://gitlab.com (or self-hosted URL)" />
            </ProviderCard>
          ) : null}

          {!azdo ? (
            <ProviderCard
              id="add-azure-provider"
              icon={<Cloud className="h-4 w-4 text-primary" />}
              title="Azure DevOps"
              description="Connect organization-scoped Azure DevOps activity."
              submitLabel="Add Azure provider"
              onSubmit={submitAzure}
            >
              <Input value={azureToken} onChange={(event) => setAzureToken(event.target.value)} required type="password" placeholder="Azure DevOps PAT" />
              <Input value={azureOrg} onChange={(event) => setAzureOrg(event.target.value)} required placeholder="Organization name" />
            </ProviderCard>
          ) : null}

          {!github ? (
            <ProviderCard
              id="add-github-provider"
              icon={<Github className="h-4 w-4 text-primary" />}
              title="GitHub"
              description="Connect GitHub with a read-only PAT. Recommended scopes: repository read + workflow read."
              submitLabel="Add GitHub provider"
              onSubmit={submitGithub}
            >
              <Input value={githubToken} onChange={(event) => setGithubToken(event.target.value)} required type="password" placeholder="GitHub PAT" />
            </ProviderCard>
          ) : null}

          <div className="rounded-lg border border-dashed border-border/60 p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 font-semibold">
                <CircleDashed className="h-4 w-4 text-muted-foreground" />
                Bitbucket
              </h3>
              <span className="rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">Coming soon</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Planned support for Bitbucket workspaces with privacy-safe daily activity aggregation.
            </p>
          </div>
        </div>
      </section>

      <div className="border-border/60 animate-in fade-in duration-500 border-t" />

      <section className="animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-500">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <ServerCog className="h-5 w-5 text-primary" />
            Manage connected providers
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Update existing provider credentials or base settings.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {gitlab ? (
            <ProviderCard
              icon={<GitBranch className="h-4 w-4 text-primary" />}
              title="GitLab"
              description={`Connected (${gitlab.gitlabBaseUrl ?? "https://gitlab.com"})`}
              submitLabel="Update GitLab integration"
              onSubmit={submitGitlab}
            >
              <Input value={gitlabToken} onChange={(event) => setGitlabToken(event.target.value)} required type="password" placeholder="GitLab PAT" />
              <Input
                value={gitlabBaseUrl || gitlab.gitlabBaseUrl || "https://gitlab.com"}
                onChange={(event) => setGitlabBaseUrl(event.target.value)}
                placeholder="https://gitlab.com (or self-hosted URL)"
              />
            </ProviderCard>
          ) : null}

          {azdo ? (
            <ProviderCard
              icon={<Cloud className="h-4 w-4 text-primary" />}
              title="Azure DevOps"
              description={`Connected (org: ${azdo.azureOrg ?? ""})`}
              submitLabel="Update Azure integration"
              onSubmit={submitAzure}
            >
              <Input value={azureToken} onChange={(event) => setAzureToken(event.target.value)} required type="password" placeholder="Azure DevOps PAT" />
              <Input value={azureOrg || azdo.azureOrg || ""} onChange={(event) => setAzureOrg(event.target.value)} required placeholder="Organization name" />
            </ProviderCard>
          ) : null}

          {github ? (
            <ProviderCard
              icon={<Github className="h-4 w-4 text-primary" />}
              title="GitHub"
              description="Connected"
              submitLabel="Update GitHub integration"
              onSubmit={submitGithub}
            >
              <Input value={githubToken} onChange={(event) => setGithubToken(event.target.value)} required type="password" placeholder="GitHub PAT" />
            </ProviderCard>
          ) : null}
        </div>
      </section>

      <div className="border-border/60 animate-in fade-in duration-500 border-t" />

      <section className="animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-500">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <AtSign className="h-5 w-5 text-primary" />
            Optional author emails
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">Comma-separated emails used for commit matching across providers.</p>
        </div>
        <form onSubmit={saveEmails} className="grid gap-3 sm:max-w-2xl">
          <Input
            value={emails}
            onChange={(event) => setEmails(event.target.value)}
            placeholder="alias@company.com, alt@company.com"
          />
          <Button className="inline-flex w-fit items-center gap-2" type="submit">
            <BadgeCheck className="h-4 w-4" />
            Save author emails
          </Button>
        </form>
      </section>
    </div>
  );
}

function ProviderCard({
  id,
  icon,
  title,
  description,
  submitLabel,
  onSubmit,
  children,
}: {
  id?: string;
  icon: ReactNode;
  title: string;
  description: string;
  submitLabel: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  children: ReactNode;
}) {
  return (
    <div id={id} className="scroll-mt-24 rounded-lg border border-border/60 p-4">
      <h3 className="flex items-center gap-2 font-semibold">
        {icon}
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <form onSubmit={onSubmit} className="mt-3 grid gap-3">
        {children}
        <Button type="submit" className="inline-flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          {submitLabel}
        </Button>
      </form>
    </div>
  );
}

function upsertIntegration(list: IntegrationView[], incoming: IntegrationView) {
  const next = list.filter((item) => item.provider !== incoming.provider);
  return [...next, incoming];
}
