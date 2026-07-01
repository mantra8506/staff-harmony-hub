import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  Calendar,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Users,
  Utensils,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Restaurant branding — swap with dynamic values later.
export const RESTAURANT = {
  name: "Station 31 Restaurant & Bar",
  tagline: "Powered by Staff Harmony Hub",
  logoUrl: null as string | null,
};

type NavItem = {
  to?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/staff", label: "Staff", icon: Users },
  { to: "/schedule", label: "Schedule", icon: Calendar, soon: true },
  { label: "Attendance", icon: ClipboardList, soon: true },
  { label: "Announcements", icon: Megaphone, soon: true },
];

function initials(name?: string | null, fallback = "M") {
  if (!name) return fallback;
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || fallback;
}

function RestaurantMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-lg bg-brand text-brand-foreground shadow-sm"
      style={{ width: size, height: size }}
      aria-hidden
    >
      {RESTAURANT.logoUrl ? (
        <img
          src={RESTAURANT.logoUrl}
          alt=""
          className="h-full w-full rounded-lg object-cover"
        />
      ) : (
        <Utensils className="h-4 w-4" />
      )}
    </span>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, roles } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isManager = roles.includes("manager");
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Manager";

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-surface/60 text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          {/* Brand */}
          <Link to="/dashboard" className="flex min-w-0 items-center gap-3">
            <RestaurantMark />
            <span className="hidden min-w-0 flex-col leading-tight sm:flex">
              <span className="truncate text-sm font-semibold">
                {RESTAURANT.name}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">
                {RESTAURANT.tagline}
              </span>
            </span>
          </Link>

          {/* Middle nav */}
          <nav className="mx-auto hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const active = item.to && pathname.startsWith(item.to);
              const cls = cn(
                "inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
                item.soon && "cursor-not-allowed opacity-70 hover:bg-transparent hover:text-muted-foreground",
              );
              const content = (
                <>
                  <item.icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.soon && (
                    <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                      Soon
                    </span>
                  )}
                </>
              );
              if (!item.to || item.soon) {
                return (
                  <span key={item.label} className={cls} aria-disabled>
                    {content}
                  </span>
                );
              }
              return (
                <Link key={item.to} to={item.to} className={cls}>
                  {content}
                </Link>
              );
            })}
          </nav>

          {/* Right cluster */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Notifications"
              className="relative hidden sm:inline-flex"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-accent-emerald" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-background py-1 pl-1 pr-2 text-left transition-colors hover:bg-muted sm:pr-3">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand/10 text-[11px] font-semibold text-brand">
                    {initials(displayName)}
                  </span>
                  <span className="hidden min-w-0 flex-col leading-tight sm:flex">
                    <span className="truncate text-xs font-medium">
                      {displayName}
                    </span>
                    <span className="truncate text-[10px] text-muted-foreground">
                      {isManager ? "Manager" : "Staff"}
                    </span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex flex-col">
                  <span className="text-sm font-semibold">{displayName}</span>
                  <span className="text-xs text-muted-foreground">
                    {RESTAURANT.name}
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <Settings className="h-4 w-4" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Bell className="h-4 w-4" /> Notifications
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="h-4 w-4" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle navigation"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-border bg-background lg:hidden">
            <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
              <div className="flex flex-col gap-1">
                {NAV.map((item) => {
                  const active = item.to && pathname.startsWith(item.to);
                  const cls = cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm",
                    active
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground",
                    item.soon && "opacity-70",
                  );
                  const inner = (
                    <>
                      <span className="inline-flex items-center gap-2">
                        <item.icon className="h-4 w-4" /> {item.label}
                      </span>
                      {item.soon && (
                        <span className="rounded-full border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                          Soon
                        </span>
                      )}
                    </>
                  );
                  if (!item.to || item.soon) {
                    return (
                      <span key={item.label} className={cls}>
                        {inner}
                      </span>
                    );
                  }
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cls}
                      onClick={() => setMobileOpen(false)}
                    >
                      {inner}
                    </Link>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:pt-10">
        {children}
      </main>

      {/* Mobile bottom nav for primary destinations */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl">
          {NAV.filter((n) => n.to && !n.soon).map((item) => {
            const active = pathname.startsWith(item.to!);
            return (
              <Link
                key={item.to}
                to={item.to!}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                  active ? "text-brand" : "text-muted-foreground",
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
