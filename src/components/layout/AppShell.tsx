import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Calendar, LogOut, Users } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

const NAV = [
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/", label: "Today", icon: Calendar },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, roles } = useCurrentUser();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="text-base font-semibold">
            Staff HQ
          </Link>
          <nav className="hidden gap-1 md:flex">
            {NAV.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "rounded-md px-3 py-1.5 text-sm transition-colors " +
                    (active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-accent")
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-2">
            {user ? (
              <span className="hidden text-xs text-muted-foreground sm:inline">
                {roles.includes("manager") ? "Manager" : "Staff"}
              </span>
            ) : null}
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4" />
              <span className="ml-1 hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-24 pt-6">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-border bg-background md:hidden">
        <div className="mx-auto flex max-w-5xl">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={
                  "flex flex-1 flex-col items-center gap-1 py-2 text-xs " +
                  (active ? "text-foreground" : "text-muted-foreground")
                }
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
