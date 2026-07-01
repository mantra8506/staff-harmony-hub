import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  Clock,
  Inbox,
  LucideIcon,
  Megaphone,
  Plus,
  Repeat,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";

import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RESTAURANT } from "@/components/layout/AppShell";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: `Dashboard — ${RESTAURANT.name}` }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles } = useCurrentUser();
  const isManager = roles.includes("manager");
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Manager";

  return (
    <div className="space-y-10">
      <Welcome name={displayName} role={isManager ? "Manager" : "Staff"} />
      <QuickStats />
      <QuickActions />
      <TodaysOverview />
      <ModuleGrid />
    </div>
  );
}

/* ---------------- Welcome ---------------- */

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function Welcome({ name, role }: { name: string; role: string }) {
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-gradient-to-l from-brand/5 to-transparent md:block" />
      <div className="relative flex flex-col gap-4">
        <p className="text-xs font-medium uppercase tracking-widest text-brand">
          {greetingFor()}
        </p>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {role} · {RESTAURANT.name} · {today}
          </p>
        </div>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Manage your staff, schedules, and daily operations from one place.
        </p>
      </div>
    </section>
  );
}

/* ---------------- Quick Stats ---------------- */

type Stat = {
  label: string;
  value: string;
  hint: string;
  icon: LucideIcon;
  tone: "brand" | "emerald" | "muted";
};

const STATS: Stat[] = [
  { label: "Total Staff", value: "—", hint: "Across all positions", icon: Users, tone: "brand" },
  { label: "Today's Staff", value: "—", hint: "Scheduled to work today", icon: Clock, tone: "emerald" },
  { label: "Pending Requests", value: "—", hint: "Swaps & time off", icon: Inbox, tone: "muted" },
  { label: "Upcoming Shifts", value: "—", hint: "In the next 7 days", icon: CalendarDays, tone: "muted" },
];

function QuickStats() {
  return (
    <section>
      <SectionTitle title="At a glance" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">
                  {s.value}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                  s.tone === "brand" && "bg-brand/10 text-brand",
                  s.tone === "emerald" && "bg-accent-emerald/10 text-accent-emerald",
                  s.tone === "muted" && "bg-muted text-muted-foreground",
                )}
              >
                <s.icon className="h-5 w-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Quick Actions ---------------- */

type Action = {
  title: string;
  body: string;
  icon: LucideIcon;
  to?: string;
  cta: string;
  primary?: boolean;
};

const ACTIONS: Action[] = [
  {
    title: "Add Staff",
    body: "Create a new employee profile with position and availability.",
    icon: UserPlus,
    to: "/staff",
    cta: "Add staff",
    primary: true,
  },
  {
    title: "Invite Employee",
    body: "Send an invitation so they can access their schedule.",
    icon: Sparkles,
    to: "/staff",
    cta: "Send invite",
  },
  {
    title: "Create Schedule",
    body: "Build this week's schedule and publish it to the team.",
    icon: CalendarPlus,
    cta: "Coming soon",
  },
  {
    title: "View Staff Directory",
    body: "Browse everyone on the team, positions, and status.",
    icon: Users,
    to: "/staff",
    cta: "Open directory",
  },
];

function QuickActions() {
  return (
    <section>
      <SectionTitle
        title="Quick actions"
        subtitle="Jump into the tasks you use most."
      />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ACTIONS.map((a) => (
          <ActionCard key={a.title} action={a} />
        ))}
      </div>
    </section>
  );
}

function ActionCard({ action }: { action: Action }) {
  const Body = (
    <div
      className={cn(
        "group flex h-full flex-col rounded-xl border p-5 transition-all",
        action.primary
          ? "border-brand/30 bg-brand text-brand-foreground shadow-sm hover:shadow-md"
          : "border-border bg-card hover:border-brand/30 hover:shadow-sm",
        !action.to && "opacity-80",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "grid h-10 w-10 place-items-center rounded-lg",
            action.primary
              ? "bg-brand-foreground/15 text-brand-foreground"
              : "bg-brand/10 text-brand",
          )}
        >
          <action.icon className="h-5 w-5" />
        </span>
        <ArrowRight
          className={cn(
            "h-4 w-4 transition-transform group-hover:translate-x-0.5",
            action.primary ? "text-brand-foreground/80" : "text-muted-foreground",
          )}
        />
      </div>
      <h3 className="mt-4 text-base font-semibold">{action.title}</h3>
      <p
        className={cn(
          "mt-1 text-sm leading-relaxed",
          action.primary ? "text-brand-foreground/80" : "text-muted-foreground",
        )}
      >
        {action.body}
      </p>
      <span
        className={cn(
          "mt-4 text-xs font-medium",
          action.primary ? "text-brand-foreground" : "text-brand",
        )}
      >
        {action.cta} →
      </span>
    </div>
  );
  if (action.to) {
    return <Link to={action.to}>{Body}</Link>;
  }
  return Body;
}

/* ---------------- Today's Overview ---------------- */

function TodaysOverview() {
  return (
    <section>
      <SectionTitle
        title="Today's overview"
        subtitle="A snapshot of what's happening on the floor."
      />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OverviewCard
          title="Today's Team"
          icon={Users}
          empty="No one is scheduled yet."
          action={{ label: "Build schedule", to: null }}
        />
        <OverviewCard
          title="Current Shift"
          icon={Clock}
          empty="No active shift right now."
        />
        <OverviewCard
          title="Upcoming Shift"
          icon={CalendarDays}
          empty="Nothing on the schedule."
        />
        <OverviewCard
          title="Pending Invitations"
          icon={Inbox}
          empty="No pending invitations."
          action={{ label: "Invite employee", to: "/staff" }}
        />
        <OverviewCard
          title="Recent Activity"
          icon={Sparkles}
          empty="Activity will appear here as your team uses the app."
          className="lg:col-span-2"
        />
      </div>
    </section>
  );
}

function OverviewCard({
  title,
  icon: Icon,
  empty,
  action,
  className,
}: {
  title: string;
  icon: LucideIcon;
  empty: string;
  action?: { label: string; to: string | null };
  className?: string;
}) {
  return (
    <Card className={cn("border-border shadow-sm", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex min-h-[120px] flex-col items-start justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-4 text-center sm:items-center">
          <p className="text-sm text-muted-foreground">{empty}</p>
          {action &&
            (action.to ? (
              <Button asChild size="sm" variant="outline">
                <Link to={action.to}>
                  <Plus className="h-4 w-4" />
                  {action.label}
                </Link>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled>
                {action.label}
              </Button>
            ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------------- Module grid ---------------- */

type Module = {
  title: string;
  description: string;
  icon: LucideIcon;
  to?: string;
  status: "live" | "soon";
};

const MODULES: Module[] = [
  {
    title: "Staff Directory",
    description: "Positions, availability, and contact info.",
    icon: Users,
    to: "/staff",
    status: "live",
  },
  {
    title: "Scheduling",
    description: "Weekly shift planning and publishing.",
    icon: CalendarDays,
    status: "soon",
  },
  {
    title: "Attendance",
    description: "Clock-ins, no-shows, and hours worked.",
    icon: ClipboardList,
    status: "soon",
  },
  {
    title: "Shift Swaps",
    description: "Approve trades between staff in one tap.",
    icon: Repeat,
    status: "soon",
  },
  {
    title: "Announcements",
    description: "Broadcast updates to the whole team.",
    icon: Megaphone,
    status: "soon",
  },
  {
    title: "Reports",
    description: "Labor cost, hours, and staffing trends.",
    icon: BarChart3,
    status: "soon",
  },
];

function ModuleGrid() {
  return (
    <section>
      <SectionTitle
        title="Modules"
        subtitle="Everything you can run for Station 31 — today and soon."
      />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((m) => {
          const isLive = m.status === "live";
          const Body = (
            <div
              className={cn(
                "group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all",
                isLive
                  ? "hover:-translate-y-0.5 hover:border-brand/30 hover:shadow-md"
                  : "opacity-90",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "grid h-10 w-10 place-items-center rounded-lg",
                    isLive
                      ? "bg-brand/10 text-brand"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  <m.icon className="h-5 w-5" />
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    isLive
                      ? "bg-accent-emerald/10 text-accent-emerald"
                      : "border border-border bg-muted text-muted-foreground",
                  )}
                >
                  {isLive ? (
                    <>
                      <span className="h-1.5 w-1.5 rounded-full bg-accent-emerald" />
                      Live
                    </>
                  ) : (
                    "Coming soon"
                  )}
                </span>
              </div>
              <h3 className="mt-4 text-base font-semibold">{m.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
              <span
                className={cn(
                  "mt-4 text-xs font-medium",
                  isLive ? "text-brand" : "text-muted-foreground",
                )}
              >
                {isLive ? "Open →" : "Coming in a future phase."}
              </span>
            </div>
          );
          if (isLive && m.to) {
            return (
              <Link key={m.title} to={m.to}>
                {Body}
              </Link>
            );
          }
          return <div key={m.title}>{Body}</div>;
        })}
      </div>
    </section>
  );
}

/* ---------------- Shared ---------------- */

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
