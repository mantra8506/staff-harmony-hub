import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarDays,
  ClipboardList,
  Clock,
  LogIn,
  LogOut,
  Megaphone,
  User as UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RESTAURANT } from "@/components/layout/AppShell";
import {
  myAttendanceQueryOptions,
  myShiftsQueryOptions,
} from "@/features/staff-portal/queries";
import { announcementsQueryOptions } from "@/features/operations/queries";
import {
  addDays,
  formatTime,
  startOfWeek,
  toISODate,
  type Shift,
} from "@/features/schedule/types";
import { clockIn, clockOut } from "@/lib/attendance/attendance.functions";

function todayISO() {
  return toISODate(new Date());
}

export const Route = createFileRoute("/_authenticated/my")({
  head: () => ({ meta: [{ title: `My day — ${RESTAURANT.name}` }] }),
  loader: async ({ context }) => {
    const ws = startOfWeek(new Date());
    await Promise.all([
      context.queryClient.ensureQueryData(
        myShiftsQueryOptions(toISODate(ws), toISODate(addDays(ws, 13))),
      ),
      context.queryClient.ensureQueryData(
        myAttendanceQueryOptions(todayISO(), todayISO()),
      ),
      context.queryClient.ensureQueryData(announcementsQueryOptions),
    ]);
  },
  component: StaffDashboard,
});

function greet() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function StaffDashboard() {
  const { user } = useCurrentUser();
  const name =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";

  const ws = startOfWeek(new Date());
  const wsISO = toISODate(ws);
  const twoWeeksISO = toISODate(addDays(ws, 13));
  const today = todayISO();

  const shiftsQ = useSuspenseQuery(myShiftsQueryOptions(wsISO, twoWeeksISO));
  const attQ = useSuspenseQuery(myAttendanceQueryOptions(today, today));
  const annQ = useSuspenseQuery(announcementsQueryOptions);

  const shifts = shiftsQ.data;
  const todaysShift =
    shifts.find((s) => s.work_date === today) ?? null;
  const nextShift =
    shifts
      .filter((s) => s.work_date > today)
      .sort((a, b) =>
        a.work_date === b.work_date
          ? a.start_time.localeCompare(b.start_time)
          : a.work_date.localeCompare(b.work_date),
      )[0] ?? null;

  const openEntry = attQ.data.find((r) => !r.clock_out_at) ?? null;
  const latestAnnouncement = annQ.data[0] ?? null;

  const qc = useQueryClient();
  const clockInFn = useServerFn(clockIn);
  const clockOutFn = useServerFn(clockOut);

  const clockInM = useMutation({
    mutationFn: () => clockInFn({ data: {} }),
    onSuccess: () => {
      toast.success("Clocked in");
      qc.invalidateQueries({ queryKey: ["my-attendance"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to clock in"),
  });
  const clockOutM = useMutation({
    mutationFn: (id: string) => clockOutFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Clocked out");
      qc.invalidateQueries({ queryKey: ["my-attendance"] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to clock out"),
  });

  return (
    <div className="space-y-6 pb-4">
      <header>
        <p className="text-sm text-muted-foreground">{greet()},</p>
        <h1 className="text-2xl font-bold tracking-tight">{name}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{RESTAURANT.name}</p>
      </header>

      {/* Clock in / out */}
      <Card>
        <CardContent className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Time clock
              </p>
              <p className="text-base font-semibold">
                {openEntry
                  ? `Clocked in at ${formatClock(openEntry.clock_in_at)}`
                  : "You haven’t clocked in yet."}
              </p>
            </div>
            <Clock className="h-6 w-6 text-muted-foreground" />
          </div>
          {openEntry ? (
            <Button
              size="lg"
              variant="destructive"
              className="h-12 text-base"
              onClick={() => clockOutM.mutate(openEntry.id)}
              disabled={clockOutM.isPending}
            >
              <LogOut className="mr-2 h-5 w-5" /> Clock out
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-12 text-base"
              onClick={() => clockInM.mutate()}
              disabled={clockInM.isPending}
            >
              <LogIn className="mr-2 h-5 w-5" /> Clock in
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Today */}
      <ShiftCard title="Today’s shift" shift={todaysShift} emptyToday />
      {/* Next */}
      <ShiftCard title="Next upcoming shift" shift={nextShift} />

      {/* Announcement */}
      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Latest announcement
            </p>
            <Megaphone className="h-5 w-5 text-muted-foreground" />
          </div>
          {latestAnnouncement ? (
            <>
              <p className="text-base font-semibold">
                {latestAnnouncement.title}
              </p>
              {latestAnnouncement.description ? (
                <p className="line-clamp-3 text-sm text-muted-foreground">
                  {latestAnnouncement.description}
                </p>
              ) : null}
              <Link
                to="/my/announcements"
                className="inline-block pt-1 text-sm font-medium text-brand"
              >
                View all →
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              No announcements available.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick access */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
          Quick access
        </p>
        <div className="grid grid-cols-2 gap-3">
          <QuickTile to="/my/schedule" icon={CalendarDays} label="My Schedule" />
          <QuickTile to="/my/attendance" icon={ClipboardList} label="Attendance" />
          <QuickTile to="/my/announcements" icon={Megaphone} label="Announcements" />
          <QuickTile to="/my/profile" icon={UserIcon} label="My Profile" />
        </div>
      </div>
    </div>
  );
}

function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function ShiftCard({
  title,
  shift,
  emptyToday,
}: {
  title: string;
  shift: Shift | null;
  emptyToday?: boolean;
}) {
  return (
    <Card>
      <CardContent className="space-y-2 p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {title}
          </p>
          <CalendarDays className="h-5 w-5 text-muted-foreground" />
        </div>
        {shift ? (
          <>
            <p className="text-base font-semibold">
              {new Date(shift.work_date + "T00:00:00").toLocaleDateString(
                undefined,
                { weekday: "long", month: "short", day: "numeric" },
              )}
            </p>
            <p className="text-sm">
              {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
            </p>
            {shift.position_name ? (
              <Badge variant="secondary" className="mt-1">
                {shift.position_name}
              </Badge>
            ) : null}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {emptyToday
              ? "You don’t have a shift scheduled today."
              : "You don’t have any scheduled shifts."}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function QuickTile({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex h-24 flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted"
    >
      <Icon className="h-6 w-6 text-brand" />
      {label}
    </Link>
  );
}
