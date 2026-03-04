"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClientSupabase } from "@/lib/supabase/client";
import { Info, Loader2 } from "lucide-react";
import { FormEvent, useState } from "react";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const supabase = createClientSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setMessage(error.message);
      setIsSubmitting(false);
      return;
    }
    setMessage("Magic link sent. Check your inbox.");
    setIsSubmitting(false);
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <p className="mt-2 text-sm text-slate-600">Sign in instantly with a secure passwordless email link.</p>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3" onSubmit={handleSubmit}>
            <Input
              type="email"
              required
              disabled={isSubmitting}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@company.com"
            />
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send magic link"
              )}
            </Button>
          </form>
          {message ? (
            <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="size-4" />
              {message}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
