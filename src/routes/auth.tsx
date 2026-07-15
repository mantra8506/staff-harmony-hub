import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { checkBootstrapNeeded } from "@/lib/auth/bootstrap.functions";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Staff HQ" },
      { name: "description", content: "Sign in to manage your restaurant team." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [needsBootstrap, setNeedsBootstrap] = useState(false);

  useEffect(() => {
    checkBootstrapNeeded().then((r) => setNeedsBootstrap(r.needsBootstrap)).catch(() => {});
  }, []);

  async function goHomeFor(userId: string) {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isManager = (data ?? []).some((r) => r.role === "manager");
    navigate({ to: isManager ? "/dashboard" : "/my", replace: true });
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) goHomeFor(data.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.user) await goHomeFor(data.user.id);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          {needsBootstrap ? (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              First time here?{" "}
              <Link to="/setup" className="font-medium text-foreground underline">
                Create the manager account
              </Link>
            </p>
          ) : (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              New staff accounts are created by your manager. Check your email for an invite.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

