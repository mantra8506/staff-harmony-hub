import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  CalendarPlus,
  Clock,
  ClipboardList,
  Inbox,
  LucideIcon,
  Mail,
  Megaphone,
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
import { staffQueryOptions } from "@/features/staff/queries";
import { shiftsQueryOptions } from "@/features/schedule/queries";
import {
  addDays,
  formatTime,
  formatWeekRange,
  shiftHours,
  startOfWeek,
  toISODate,
  type Shift,
} from "@/features/schedule/types";
import type { StaffMember } from "@/features/staff/types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: `Dashboard — ${RESTAURANT.name}` }] }),
  loader: async ({ context }) => {
    const weekStart = toISODate(startOfWeek(new Date()));
    const weekEnd = toISODate(addDays(startOfWeek(new Date()), 6));
    await Promise.all([
      context.queryClient.ensureQueryData(staffQueryOptions),
      context.queryClient.ensureQueryData(shiftsQueryOptions(weekStart, weekEnd)),
    ]);
  },
  component: DashboardPage,
});

function DashboardPage() {
  const { user, roles } = useCurrentUser();
  const isManager = roles.includes("manager");
  const displayName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "Manager";

  const staffQ = useSuspenseQuery(staffQueryOptions);
  const staff = staffQ.data;

  const weekStart = startOfWeek(new Date());
  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(addDays(weekStart, 6));
  const shiftsQ = useSuspenseQuery(shiftsQueryOptions(weekStartISO, weekEndISO));
  const shifts = shiftsQ.data;

  const total = staff.length;
  const active = staff.filter((m) => m.status === "active").length;
  const pending = staff.filter(
    (m) => m.invite_status === "pending" || m.invite_status === "expired",
  );
  const newest = [...staff]
    .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
    .slice(0, 3);

  const todayISO = toISODate(new Date());
  const todaysShifts = shifts
    .filter((s) => s.work_date === todayISO)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const scheduledTodayCount = new Set(todaysShifts.map((s) => s.employee_id)).size;
  const totalWeekHours = shifts.reduce(
    (a, s) => a + shiftHours(s.start_time, s.end_time, s.break_minutes),
    0,
  );

  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextShift = todaysShifts.find((s) => {
    const [h, m] = s.start_time.split(":").map(Number);
    return h * 60 + m > nowMinutes;
  }) ?? shifts
    .filter((s) => s.work_date > todayISO)
    .sort((a, b) =>
      a.work_date === b.work_date
        ? a.start_time.localeCompare(b.start_time)
        : a.work_date.localeCompare(b.work_date),
    )[0] ?? null;

  return (
    <div className="space-y-10">
      <Welcome name={displayName} role={isManager ? "Manager" : "Staff"} />
      <QuickStats
        total={total}
        active={active}
        pendingCount={pending.length}
        scheduledToday={scheduledTodayCount}
      />
      <ScheduleSummary
        weekStart={weekStart}
        shiftCount={shifts.length}
        totalHours={totalWeekHours}
        todaysShifts={todaysShifts}
        nextShift={nextShift}
      />
      <QuickActions />
      <TodaysOverview newest={newest} pending={pending} />
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
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{name}</h1>
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

function QuickStats({
  total,
  active,
  pendingCount,
  newest,
}: {
  total: number;
  active: number;
  pendingCount: number;
  newest: StaffMember | null;
}) {
  const stats: {
    label: string;
    value: string;
    hint: string;
    icon: LucideIcon;
    tone: "brand" | "emerald" | "muted" | "amber";
  }[] = [
    {
      label: "Total employees",
      value: String(total),
      hint: total === 0 ? "Add your first employee" : "Across all positions",
      icon: Users,
      tone: "brand",
    },
    {
      label: "Active employees",
      value: String(active),
      hint: total === 0 ? "—" : `${total - active} inactive`,
      icon: Sparkles,
      tone: "emerald",
    },
    {
      label: "Pending invitations",
      value: String(pendingCount),
      hint: pendingCount === 0 ? "You're all caught up" : "Awaiting acceptance",
      icon: Mail,
      tone: pendingCount > 0 ? "amber" : "muted",
    },
    {
      label: "Newest employee",
      value: newest?.full_name ?? "—",
      hint: newest
        ? `Joined ${new Date(newest.created_at).toLocaleDateString()}`
        : "No employees yet",
      icon: UserPlus,
      tone: "muted",
    },
  ];

  return (
    <section>
      <SectionTitle title="At a glance" />
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="border-border shadow-sm">
            <CardContent className="flex items-start justify-between gap-3 p-5">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-2 truncate text-2xl font-semibold tracking-tight sm:text-3xl">
                  {s.value}
                </p>
                <p className="mt-1 truncate text-xs text-muted-foreground">{s.hint}</p>
              </div>
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-lg",
                  s.tone === "brand" && "bg-brand/10 text-brand",
                  s.tone === "emerald" && "bg-accent-emerald/10 text-accent-emerald",
                  s.tone === "amber" &&
                    "bg-amber-500/10 text-amber-600 dark:text-amber-400",
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
    title: "Add employee",
    body: "Create a new employee profile with position and availability.",
    icon: UserPlus,
    to: "/staff",
    cta: "Add employee",
    primary: true,
  },
  {
    title: "View directory",
    body: "Browse everyone on the team, positions, and status.",
    icon: Users,
    to: "/staff",
    cta: "Open directory",
  },
  {
    title: "Create schedule",
    body: "Build this week's schedule and publish it to the team.",
    icon: CalendarPlus,
    cta: "Coming soon",
  },
  {
    title: "Announcements",
    body: "Broadcast updates to the whole team.",
    icon: Megaphone,
    cta: "Coming soon",
  },
];

function QuickActions() {
  return (
    <section>
      <SectionTitle title="Quick actions" subtitle="Jump into the tasks you use most." />
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
  if (action.to) return <Link to={action.to}>{Body}</Link>;
  return Body;
}

/* ---------------- Today's Overview ---------------- */

function TodaysOverview({
  newest,
  pending,
}: {
  newest: StaffMember[];
  pending: StaffMember[];
}) {
  return (
    <section>
      <SectionTitle
        title="Today's overview"
        subtitle="A snapshot of what's happening on the floor."
      />
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Inbox className="h-4 w-4 text-muted-foreground" />
              Pending invitations
            </CardTitle>
            {pending.length > 0 && (
              <Button asChild size="sm" variant="ghost">
                <Link to="/staff">Manage</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {pending.length === 0 ? (
              <EmptyMini text="No pending invitations." />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {pending.slice(0, 5).map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <Link
                      to="/staff/$userId"
                      params={{ userId: m.id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate text-sm font-medium">{m.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.email ?? "No email"}
                      </div>
                    </Link>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium",
                        m.invite_status === "expired"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-amber-500/10 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {m.invite_status === "expired" ? "Expired" : "Pending"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              Recent activity
            </CardTitle>
            {newest.length > 0 && (
              <Button asChild size="sm" variant="ghost">
                <Link to="/staff">View all</Link>
              </Button>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            {newest.length === 0 ? (
              <EmptyMini text="Activity will appear here as your team uses the app." />
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {newest.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                    <Link
                      to="/staff/$userId"
                      params={{ userId: m.id }}
                      className="min-w-0 flex-1"
                    >
                      <div className="truncate text-sm font-medium">{m.full_name}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {m.primary_position_name ?? "No position"} · added{" "}
                        {new Date(m.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {m.employee_code ?? "—"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-4">
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
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
                    isLive ? "bg-brand/10 text-brand" : "bg-muted text-muted-foreground",
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

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </div>
  );
}
