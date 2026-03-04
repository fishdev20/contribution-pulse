"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPostForm, apiPostJson } from "@/lib/api/client";

type MeResponse =
  | { authenticated: false }
  | { authenticated: true; email: string | null; avatarUrl: string | null };

export const queryKeys = {
  me: ["me"] as const,
};

export function useMeQuery() {
  return useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiGet<MeResponse>("/api/me"),
  });
}

export function useSyncMutation() {
  return useMutation({
    mutationFn: () => apiPostJson<{ ok: boolean }>("/api/sync", {}),
  });
}

export function useQueueBackfillMutation() {
  return useMutation({
    mutationFn: (payload: { year: string; provider: string }) => apiPostForm<{ ok: boolean; year?: number; error?: string }>("/api/sync/backfill", payload),
  });
}

export function useBackfillActionMutation(action: "retry" | "delete" | "cleanup") {
  return useMutation({
    mutationFn: (jobId?: string) =>
      apiPostForm<{ ok: boolean; removed?: number }>(`/api/sync/backfill/${action}`, jobId ? { jobId } : {}),
  });
}

export function useUpsertIntegrationMutation(provider: "gitlab" | "azure-devops" | "github") {
  return useMutation({
    mutationFn: (payload: Record<string, string>) => apiPostForm<{ ok: boolean }>(`/api/integrations/${provider}`, payload),
  });
}

export function useSaveAuthorEmailsMutation() {
  return useMutation({
    mutationFn: (payload: { emails: string; provider?: "GITLAB" | "AZURE_DEVOPS" | "GITHUB" }) =>
      apiPostForm<{ ok: boolean }>("/api/onboarding/author-emails", payload.provider ? payload : { emails: payload.emails }),
  });
}

export function useCreateShareMutation() {
  return useMutation({
    mutationFn: (expiresInDays: string) => apiPostForm<{ ok: boolean; token?: string }>("/api/share", { expiresInDays }),
  });
}

export function useRevokeShareMutation() {
  return useMutation({
    mutationFn: (token: string) => apiPostJson<{ ok: boolean }>("/api/share", { revoke: true, token }),
  });
}

export function useCreateHighlightMutation() {
  return useMutation({
    mutationFn: (payload: { date: string; note: string }) => apiPostForm<{ ok: boolean; id?: string }>("/api/highlights", payload),
  });
}

export function useDisconnectIntegrationMutation() {
  return useMutation({
    mutationFn: (provider: "GITLAB" | "AZURE_DEVOPS" | "GITHUB") =>
      apiPostForm<{ ok: boolean }>("/api/integrations/disconnect", { provider }),
  });
}

export function useDeleteAccountMutation() {
  return useMutation({
    mutationFn: () => apiPostJson<{ ok: boolean }>("/api/account/delete", {}),
  });
}

export function useInvalidateMe() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.me });
}
