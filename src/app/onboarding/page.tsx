import { OnboardingClient } from "@/components/onboarding-client";
import { requireAppUser } from "@/server/auth/user";
import { prisma } from "@/server/db/prisma";

export default async function OnboardingPage() {
  const { appUser } = await requireAppUser();
  const integrations = await prisma.integration.findMany({ where: { userId: appUser.id } });

  return (
    <OnboardingClient
      initialIntegrations={integrations.map((integration) => ({
        provider: integration.provider as "GITLAB" | "AZURE_DEVOPS" | "GITHUB",
        gitlabBaseUrl: integration.gitlabBaseUrl,
        azureOrg: integration.azureOrg,
        authorEmails: integration.authorEmails,
      }))}
    />
  );
}
