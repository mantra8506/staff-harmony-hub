import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { BarChart3, Clock, LogIn, LogOut, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { RESTAURANT } from "@/components/layout/AppShell";
import { staffQueryOptions } from "@/features/staff/queries";
import { attendanceRangeQueryOptions } from "@/features/operations/queries";
import { cn } from "@/lib/utils";


function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function daysAgoISO(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

const RANGE_DAYS = 30;

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [{ title: `Reports — ${RESTAURANT.name}` }],
  }),
  loader: async ({ context }) => {
    const from = daysAgoISO(RANGE_DAYS - 1);
    const to = todayISO();
    await Promise.all([
      context.queryClient.ensureQueryData(staffQueryOptions),
      context.queryClient.ensureQueryData(attendanceRangeQueryOptions(from, to)),
    ]);
  },
  component: ReportsPage,
});

function ReportsPage() {
  const from = daysAgoISO(RANGE_DAYS - 1);
  const to = todayISO();
  const staffQ = useSuspenseQuery(staffQueryOptions);
  const attendanceQ = useSuspenseQuery(attendanceRangeQueryOptions(from, to));

  const staff = staffQ.data;
  const rows = attendanceQ.data;
  const activeEmployees = staff.filter((s) => s.status === "active").length;

  const totalClockIns = rows.length;
  const totalClockOuts = rows.filter((r) => r.clock_out_at).length;
  const totalHours = rows.reduce((a, r) => a + r.hours, 0);
  const uniqueAttendees = new Set(rows.map((r) => r.employee_id)).size;
  const attendancePct =
    activeEmployees === 0
      ? 0
      : Math.min(100, Math.round((uniqueAttendees / activeEmployees) * 100));

  type Row = {
    employeeId: string;
    name: string;
    position: string | null;
    hours: number;
    days: Set<string>;
    lastClockIn: string | null;
  };

  const perEmployee = useMemo(() => {
    const map = new Map<string, Row>();
    for (const r of rows) {
      let cur = map.get(r.employee_id);
      if (!cur) {
        cur = {
          employeeId: r.employee_id,
          name: r.employee_name,
          position: r.position_name,
          hours: 0,
          days: new Set(),
          lastClockIn: null,
        };
        map.set(r.employee_id, cur);
      }
      cur.hours += r.hours;
      cur.days.add(r.work_date);
      if (!cur.lastClockIn || r.clock_in_at > cur.lastClockIn) {
        cur.lastClockIn = r.clock_in_at;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.hours - a.hours);
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Attendance summary for the last {RANGE_DAYS} days.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard
          label="Total hours worked"
          value={totalHours.toFixed(1)}
          icon={Clock}
        />
        <StatCard
          label="Total clock-ins"
          value={String(totalClockIns)}
          icon={LogIn}
        />
        <StatCard
          label="Total clock-outs"
          value={String(totalClockOuts)}
          icon={LogOut}
        />
        <StatCard
          label="Active employees"
          value={String(activeEmployees)}
          icon={Users}
        />
        <StatCard
          label="Attendance"
          value={`${attendancePct}%`}
          icon={BarChart3}
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="border-b border-border p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              By employee
            </h2>
          </div>
          {perEmployee.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No attendance records in this range yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Employee</th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Hours worked
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Days worked
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">
                      Last clock in
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {perEmployee.map((r) => (
                    <tr
                      key={r.employeeId}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.position ?? "No position"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.hours.toFixed(1)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {r.days.size}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-muted-foreground">
                        {r.lastClockIn
                          ? new Date(r.lastClockIn).toLocaleString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "brand" | "emerald" | "muted";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
        </div>
        <span
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg",
            tone === "brand" && "bg-brand/10 text-brand",
            tone === "emerald" && "bg-accent-emerald/10 text-accent-emerald",
            tone === "muted" && "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}
