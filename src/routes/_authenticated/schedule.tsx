import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Loader2,
  Lock,
  LockOpen,
  Plus,
  UserCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RESTAURANT } from "@/components/layout/AppShell";
import { positionsQueryOptions, staffQueryOptions } from "@/features/staff/queries";
import {
  shiftsQueryOptions,
  weekStatusQueryOptions,
} from "@/features/schedule/queries";
import { publishWeek, unpublishWeek } from "@/lib/schedule/schedule.functions";
import {
  addDays,
  formatTime,
  formatWeekRange,
  getWeekDays,
  positionColors,
  shiftHours,
  startOfWeek,
  toISODate,
  type Shift,
  type ScheduleWeek,
} from "@/features/schedule/types";
import { ShiftFormDialog } from "@/features/schedule/components/ShiftFormDialog";
import type { StaffMember } from "@/features/staff/types";

export const Route = createFileRoute("/_authenticated/schedule")({
  head: () => ({
    meta: [{ title: `Schedule — ${RESTAURANT.name}` }],
  }),
  loader: async ({ context }) => {
    const weekStart = toISODate(startOfWeek(new Date()));
    const weekEnd = toISODate(addDays(startOfWeek(new Date()), 6));
    await Promise.all([
      context.queryClient.ensureQueryData(staffQueryOptions),
      context.queryClient.ensureQueryData(positionsQueryOptions),
      context.queryClient.ensureQueryData(shiftsQueryOptions(weekStart, weekEnd)),
      context.queryClient.ensureQueryData(weekStatusQueryOptions(weekStart)),
    ]);
  },
  component: SchedulePage,
});

type DialogState =
  | { open: false }
  | {
      open: true;
      workDate: string;
      shift?: Shift | null;
      presetEmployeeId?: string | null;
    };

function SchedulePage() {
  const { roles } = useCurrentUser();
  const isManager = roles.includes("manager");

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const weekEnd = useMemo(() => addDays(weekStart, 6), [weekStart]);
  const weekStartISO = toISODate(weekStart);
  const weekEndISO = toISODate(weekEnd);
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);

  const staffQ = useSuspenseQuery(staffQueryOptions);
  const positionsQ = useSuspenseQuery(positionsQueryOptions);
  const shiftsQ = useSuspenseQuery(shiftsQueryOptions(weekStartISO, weekEndISO));
  const weekStatusQ = useSuspenseQuery(weekStatusQueryOptions(weekStartISO));

  const employees = staffQ.data.filter((s) => s.status === "active");
  const shifts = shiftsQ.data;
  const weekStatus = weekStatusQ.data;
  const isPublished = weekStatus.status === "published";

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [mobileView, setMobileView] = useState<"day" | "employee">("day");
  const [mobileDayIdx, setMobileDayIdx] = useState(() => {
    const today = new Date();
    const ws = startOfWeek(today);
    const diff = Math.round(
      (today.setHours(0, 0, 0, 0) - ws.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, Math.min(6, diff));
  });

  // Index shifts by employee+date
  const shiftMap = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts) {
      const k = `${s.employee_id}|${s.work_date}`;
      const arr = m.get(k);
      if (arr) arr.push(s);
      else m.set(k, [s]);
    }
    return m;
  }, [shifts]);

  const dailyCounts = useMemo(() => {
    const counts = new Map<string, Set<string>>();
    for (const s of shifts) {
      const set = counts.get(s.work_date) ?? new Set();
      set.add(s.employee_id);
      counts.set(s.work_date, set);
    }
    return counts;
  }, [shifts]);

  const employeeTotals = useMemo(() => {
    const totals = new Map<string, { hours: number; count: number }>();
    for (const s of shifts) {
      const cur = totals.get(s.employee_id) ?? { hours: 0, count: 0 };
      cur.hours += shiftHours(s.start_time, s.end_time, s.break_minutes);
      cur.count += 1;
      totals.set(s.employee_id, cur);
    }
    return totals;
  }, [shifts]);

  const openCreate = (workDate: string, employeeId?: string) => {
    if (!isManager || isPublished) return;
    setDialog({ open: true, workDate, presetEmployeeId: employeeId ?? null });
  };
  const openEdit = (shift: Shift) => {
    if (!isManager) return;
    setDialog({ open: true, workDate: shift.work_date, shift });
  };

  const totalWeekHours = Array.from(employeeTotals.values()).reduce(
    (acc, v) => acc + v.hours,
    0,
  );

  return (
    <div className="space-y-6">
      <Header
        weekStart={weekStart}
        weekStartISO={weekStartISO}
        weekStatus={weekStatus}
        isManager={isManager}
        onPrev={() => setWeekStart((d) => addDays(d, -7))}
        onNext={() => setWeekStart((d) => addDays(d, 7))}
        onToday={() => setWeekStart(startOfWeek(new Date()))}
        onAdd={
          isManager && !isPublished
            ? () => openCreate(toISODate(new Date()))
            : undefined
        }
        totalHours={totalWeekHours}
        totalShifts={shifts.length}
      />

      {isPublished && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-medium">This week is published.</p>
            <p className="opacity-80">
              The schedule is locked. Unpublish to make edits, or propose a
              shift swap for individual changes.
            </p>
          </div>
        </div>
      )}


      {shifts.length === 0 && employees.length > 0 && isManager ? (
        <EmptyWeek onAdd={() => openCreate(toISODate(days[0]))} />
      ) : (
        <>
          {/* Desktop grid */}
          <div className="hidden lg:block">
            <DesktopGrid
              days={days}
              employees={employees}
              shiftMap={shiftMap}
              dailyCounts={dailyCounts}
              employeeTotals={employeeTotals}
              onCellClick={openCreate}
              onShiftClick={openEdit}
              isManager={isManager}
            />
          </div>

          {/* Mobile / tablet */}
          <div className="lg:hidden">
            <MobileTabs value={mobileView} onChange={setMobileView} />
            {mobileView === "day" ? (
              <MobileDayView
                days={days}
                dayIdx={mobileDayIdx}
                setDayIdx={setMobileDayIdx}
                shifts={shifts}
                dailyCounts={dailyCounts}
                onShiftClick={openEdit}
                onAdd={openCreate}
                isManager={isManager}
              />
            ) : (
              <MobileEmployeeView
                days={days}
                employees={employees}
                shiftMap={shiftMap}
                employeeTotals={employeeTotals}
                onShiftClick={openEdit}
                onAdd={openCreate}
                isManager={isManager}
              />
            )}
          </div>
        </>
      )}

      {dialog.open && (
        <ShiftFormDialog
          open={dialog.open}
          onOpenChange={(o) => !o && setDialog({ open: false })}
          workDate={dialog.workDate}
          shift={dialog.shift ?? null}
          presetEmployeeId={dialog.presetEmployeeId ?? null}
          employees={employees}
          positions={positionsQ.data}
          weekKey={[weekStartISO, weekEndISO]}
        />
      )}
    </div>
  );
}

/* ---------------- Header ---------------- */

function Header({
  weekStart,
  onPrev,
  onNext,
  onToday,
  onAdd,
  totalHours,
  totalShifts,
}: {
  weekStart: Date;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onAdd?: () => void;
  totalHours: number;
  totalShifts: number;
}) {
  const isCurrent =
    toISODate(weekStart) === toISODate(startOfWeek(new Date()));
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">
            Weekly schedule
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatWeekRange(weekStart)} · {totalShifts} shifts ·{" "}
          {totalHours.toFixed(1)} hrs
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex items-center rounded-lg border border-border bg-background">
          <Button variant="ghost" size="icon" onClick={onPrev} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-9 px-3", isCurrent && "text-brand")}
            onClick={onToday}
          >
            Today
          </Button>
          <Button variant="ghost" size="icon" onClick={onNext} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        {onAdd && (
          <Button onClick={onAdd}>
            <Plus className="h-4 w-4" />
            Add shift
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Empty state ---------------- */

function EmptyWeek({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-full bg-brand/10 text-brand">
          <CalendarDays className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">
            No schedule has been created for this week.
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Start by adding your first shift.
          </p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="h-4 w-4" />
          Create Schedule
        </Button>
      </CardContent>
    </Card>
  );
}

/* ---------------- Desktop grid ---------------- */

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function DesktopGrid({
  days,
  employees,
  shiftMap,
  dailyCounts,
  employeeTotals,
  onCellClick,
  onShiftClick,
  isManager,
}: {
  days: Date[];
  employees: StaffMember[];
  shiftMap: Map<string, Shift[]>;
  dailyCounts: Map<string, Set<string>>;
  employeeTotals: Map<string, { hours: number; count: number }>;
  onCellClick: (date: string, employeeId?: string) => void;
  onShiftClick: (s: Shift) => void;
  isManager: boolean;
}) {
  const todayISO = toISODate(new Date());

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="sticky left-0 z-10 w-56 border-r border-border bg-muted/40 p-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Employee
              </th>
              {days.map((d, i) => {
                const iso = toISODate(d);
                const isToday = iso === todayISO;
                return (
                  <th
                    key={iso}
                    className={cn(
                      "border-r border-border p-3 text-left align-top last:border-r-0",
                      isToday && "bg-brand/5",
                    )}
                  >
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {DAY_LABELS[i]}
                    </div>
                    <div
                      className={cn(
                        "mt-0.5 text-base font-semibold",
                        isToday && "text-brand",
                      )}
                    >
                      {d.getDate()}
                    </div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                      {(dailyCounts.get(iso)?.size ?? 0)} staff
                    </div>
                  </th>
                );
              })}
              <th className="w-32 border-l border-border p-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Week total
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  className="p-8 text-center text-sm text-muted-foreground"
                >
                  Add active employees to start building a schedule.
                </td>
              </tr>
            )}
            {employees.map((emp) => {
              const totals = employeeTotals.get(emp.id);
              return (
                <tr key={emp.id} className="border-b border-border last:border-b-0">
                  <td className="sticky left-0 z-10 w-56 border-r border-border bg-card p-3 align-top">
                    <div className="flex items-center gap-2">
                      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold uppercase">
                        {emp.full_name
                          .split(/\s+/)
                          .slice(0, 2)
                          .map((s) => s[0])
                          .join("")}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">
                          {emp.full_name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                          {emp.primary_position_name ?? "No position"}
                        </div>
                      </div>
                    </div>
                  </td>
                  {days.map((d) => {
                    const iso = toISODate(d);
                    const key = `${emp.id}|${iso}`;
                    const cellShifts = shiftMap.get(key) ?? [];
                    return (
                      <td
                        key={iso}
                        className={cn(
                          "border-r border-border p-2 align-top last:border-r-0",
                          iso === todayISO && "bg-brand/5",
                        )}
                      >
                        <div className="flex min-h-[64px] flex-col gap-1">
                          {cellShifts.map((s) => (
                            <ShiftCard key={s.id} shift={s} onClick={() => onShiftClick(s)} />
                          ))}
                          {isManager && (
                            <button
                              type="button"
                              onClick={() => onCellClick(iso, emp.id)}
                              className={cn(
                                "flex items-center justify-center rounded-md border border-dashed border-transparent py-1 text-xs text-muted-foreground/60 transition-colors hover:border-border hover:text-foreground",
                                cellShifts.length === 0 && "min-h-[48px]",
                              )}
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td className="w-32 border-l border-border p-3 align-top text-right">
                    <div className="text-sm font-semibold">
                      {(totals?.hours ?? 0).toFixed(1)}h
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {totals?.count ?? 0} shifts
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ShiftCard({ shift, onClick }: { shift: Shift; onClick: () => void }) {
  const c = positionColors(shift.position_name);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full rounded-md border px-2 py-1.5 text-left text-xs transition-shadow hover:shadow-sm",
        c.bg,
        c.border,
        c.text,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", c.chip)} />
        <span className="truncate font-medium">
          {shift.position_name ?? "Shift"}
        </span>
      </div>
      <div className="mt-0.5 tabular-nums opacity-80">
        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
      </div>
    </button>
  );
}

/* ---------------- Mobile: day view ---------------- */

function MobileTabs({
  value,
  onChange,
}: {
  value: "day" | "employee";
  onChange: (v: "day" | "employee") => void;
}) {
  return (
    <div className="mb-3 inline-flex w-full rounded-lg border border-border bg-card p-1 shadow-sm">
      {(["day", "employee"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => onChange(t)}
          className={cn(
            "flex-1 rounded-md px-3 py-1.5 text-sm font-medium capitalize transition-colors",
            value === t
              ? "bg-brand text-brand-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          By {t}
        </button>
      ))}
    </div>
  );
}

function MobileDayView({
  days,
  dayIdx,
  setDayIdx,
  shifts,
  dailyCounts,
  onShiftClick,
  onAdd,
  isManager,
}: {
  days: Date[];
  dayIdx: number;
  setDayIdx: (i: number) => void;
  shifts: Shift[];
  dailyCounts: Map<string, Set<string>>;
  onShiftClick: (s: Shift) => void;
  onAdd: (date: string) => void;
  isManager: boolean;
}) {
  const currentDay = days[dayIdx];
  const iso = toISODate(currentDay);
  const dayShifts = shifts
    .filter((s) => s.work_date === iso)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1">
        {days.map((d, i) => {
          const dISO = toISODate(d);
          const count = dailyCounts.get(dISO)?.size ?? 0;
          const active = i === dayIdx;
          return (
            <button
              key={dISO}
              type="button"
              onClick={() => setDayIdx(i)}
              className={cn(
                "flex flex-col items-center rounded-lg border p-2 text-center transition-colors",
                active
                  ? "border-brand bg-brand text-brand-foreground"
                  : "border-border bg-card hover:border-brand/30",
              )}
            >
              <span className="text-[10px] font-semibold uppercase">
                {DAY_LABELS[i]}
              </span>
              <span className="text-base font-semibold">{d.getDate()}</span>
              <span
                className={cn(
                  "text-[10px]",
                  active ? "opacity-80" : "text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">
                {currentDay.toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h3>
              <p className="text-xs text-muted-foreground">
                {dayShifts.length} shifts · {dailyCounts.get(iso)?.size ?? 0} staff
              </p>
            </div>
            {isManager && (
              <Button size="sm" onClick={() => onAdd(iso)}>
                <Plus className="h-4 w-4" />
                Add
              </Button>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {dayShifts.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No shifts scheduled.
              </p>
            ) : (
              dayShifts.map((s) => (
                <ShiftRow key={s.id} shift={s} onClick={() => onShiftClick(s)} />
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ShiftRow({ shift, onClick }: { shift: Shift; onClick: () => void }) {
  const c = positionColors(shift.position_name);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-shadow hover:shadow-sm",
        c.bg,
        c.border,
      )}
    >
      <span className={cn("h-8 w-1 rounded-full", c.chip)} />
      <div className="min-w-0 flex-1">
        <div className={cn("truncate text-sm font-semibold", c.text)}>
          {shift.employee_name}
        </div>
        <div className={cn("truncate text-xs opacity-80", c.text)}>
          {shift.position_name ?? "No position"}
        </div>
      </div>
      <div className={cn("text-right text-xs tabular-nums", c.text)}>
        <div className="font-medium">{formatTime(shift.start_time)}</div>
        <div className="opacity-80">{formatTime(shift.end_time)}</div>
      </div>
    </button>
  );
}

/* ---------------- Mobile: employee view ---------------- */

function MobileEmployeeView({
  days,
  employees,
  shiftMap,
  employeeTotals,
  onShiftClick,
  onAdd,
  isManager,
}: {
  days: Date[];
  employees: StaffMember[];
  shiftMap: Map<string, Shift[]>;
  employeeTotals: Map<string, { hours: number; count: number }>;
  onShiftClick: (s: Shift) => void;
  onAdd: (date: string, employeeId?: string) => void;
  isManager: boolean;
}) {
  if (employees.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Add active employees to start building a schedule.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {employees.map((emp) => {
        const totals = employeeTotals.get(emp.id);
        return (
          <Card key={emp.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <UserCircle2 className="h-5 w-5 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {emp.full_name}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {emp.primary_position_name ?? "No position"}
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  {(totals?.hours ?? 0).toFixed(1)}h · {totals?.count ?? 0}
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1">
                {days.map((d, i) => {
                  const iso = toISODate(d);
                  const cell = shiftMap.get(`${emp.id}|${iso}`) ?? [];
                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() =>
                        cell.length > 0
                          ? onShiftClick(cell[0])
                          : isManager && onAdd(iso, emp.id)
                      }
                      className={cn(
                        "flex min-h-[52px] flex-col items-center justify-center rounded-md border p-1 text-[10px]",
                        cell.length > 0
                          ? cn(
                              positionColors(cell[0].position_name).bg,
                              positionColors(cell[0].position_name).border,
                              positionColors(cell[0].position_name).text,
                            )
                          : "border-dashed border-border bg-muted/30 text-muted-foreground",
                      )}
                    >
                      <span className="font-semibold uppercase">
                        {DAY_LABELS[i]}
                      </span>
                      {cell.length > 0 ? (
                        <span className="tabular-nums">
                          {formatTime(cell[0].start_time).replace(":00", "")}
                        </span>
                      ) : isManager ? (
                        <Plus className="h-3 w-3" />
                      ) : (
                        <span>—</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
