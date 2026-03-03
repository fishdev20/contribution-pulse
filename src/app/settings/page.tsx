import { AccountControls } from "@/components/account-controls";
import { requireAppUser } from "@/server/auth/user";
import { Mail, Settings2 } from "lucide-react";

export default async function SettingsPage() {
  const { appUser } = await requireAppUser();

  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <header className="animate-in fade-in slide-in-from-top-2 border-border/60 border-b pb-5 duration-500">
        <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight">
          <Settings2 className="h-7 w-7 text-primary" />
          Settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Manage your account preferences and profile details.</p>
      </header>

      <div className="space-y-8 text-[15px] leading-7 text-muted-foreground">
        <section className="animate-in fade-in slide-in-from-bottom-2 space-y-4 duration-500">
          <h2 className="text-lg font-semibold text-foreground">Account</h2>
          <div className="rounded-lg border border-border/60 bg-muted/20 p-4">
            <p className="inline-flex items-center gap-2 text-foreground">
              <Mail className="h-4 w-4 text-primary" />
              Signed in as {appUser.email}.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">Account-level preferences can be added here over time.</p>
          </div>
        </section>

        <div className="border-border/60 border-t" />

        <section className="animate-in fade-in slide-in-from-bottom-2 space-y-3 duration-500">
          <h2 className="mb-3 text-lg font-semibold text-foreground">Admin & data controls</h2>
          <AccountControls />
        </section>
      </div>
    </section>
  );
}
