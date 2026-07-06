import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RESTAURANT } from "@/components/layout/AppShell";
import { positionsQueryOptions, staffQueryOptions } from "@/features/staff/queries";
import { shiftsQueryOptions } from "@/features/schedule/queries";
import {
  addDays,
  formatTime,
  formatWeekRange,
  getWeekDays,
  positionColors,
  startOfWeek,
  toISODate,
  type Shift,
} from "@/features/schedule/types";
import { ShiftFormDialog } from "@/features/schedule/components/ShiftFormDialog";

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
    ]);
  },
  component: SchedulePage,
});

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

type DialogState =
  | { open: false }
  | { open: true; workDate: string; shift?: Shift | null };

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

  const employees = staffQ.data.filter((s) => s.status === "active");
  const shifts = shiftsQ.data;

  const [dialog, setDialog] = useState<DialogState>({ open: false });
  const [mobileDayIdx, setMobileDayIdx] = useState(() => {
    const today = new Date();
    const ws = startOfWeek(today);
    const diff = Math.round(
      (today.setHours(0, 0, 0, 0) - ws.getTime()) / (1000 * 60 * 60 * 24),
    );
    return Math.max(0, Math.min(6, diff));
  });

  const shiftsByDay = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts) {
      const arr = m.get(s.work_date) ?? [];
      arr.push(s);
      m.set(s.work_date, arr);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return m;
  }, [shifts]);

  const weekDayOptions = days.map((d, i) => ({
    iso: toISODate(d),
    label: `${DAY_LABELS[i]} · ${d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })}`,
  }));

  const openCreate = (workDate: string) => {
    if (!isManager) return;
    setDialog({ open: true, workDate });
  };
  const openEdit = (shift: Shift) => {
    if (!isManager) return;
    setDialog({ open: true, workDate: shift.work_date, shift });
  };

  const isCurrent = weekStartISO === toISODate(startOfWeek(new Date()));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">
              Weekly schedule
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatWeekRange(weekStart)} · {shifts.length} shifts
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center rounded-lg border border-border bg-background">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekStart((d) => addDays(d, -7))}
              aria-label="Previous week"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-9 px-3", isCurrent && "text-brand")}
              onClick={() => setWeekStart(startOfWeek(new Date()))}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setWeekStart((d) => addDays(d, 7))}
              aria-label="Next week"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isManager && (
            <Button onClick={() => openCreate(toISODate(days[0]))}>
              <Plus className="h-4 w-4" />
              Add shift
            </Button>
          )}
        </div>
      </div>

      {/* Desktop 7-day grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-7 gap-3">
          {days.map((d, i) => {
            const iso = toISODate(d);
            const dayShifts = shiftsByDay.get(iso) ?? [];
            const isToday = iso === toISODate(new Date());
            return (
              <Card
                key={iso}
                className={cn(
                  "flex flex-col",
                  isToday && "border-brand/40 ring-1 ring-brand/20",
                )}
              >
                <div className="flex items-baseline justify-between border-b border-border p-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {DAY_LABELS[i]}
                    </div>
                    <div
                      className={cn(
                        "text-lg font-semibold",
                        isToday && "text-brand",
                      )}
                    >
                      {d.getDate()}
                    </div>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    {dayShifts.length}
                  </span>
                </div>
                <CardContent className="flex flex-1 flex-col gap-2 p-3">
                  {dayShifts.length === 0 && (
                    <p className="py-3 text-center text-xs text-muted-foreground">
                      No shifts
                    </p>
                  )}
                  {dayShifts.map((s) => (
                    <ShiftCard
                      key={s.id}
                      shift={s}
                      onClick={() => openEdit(s)}
                    />
                  ))}
                  {isManager && (
                    <button
                      type="button"
                      onClick={() => openCreate(iso)}
                      className="mt-auto flex items-center justify-center gap-1 rounded-md border border-dashed border-border py-1.5 text-xs text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Mobile: one day at a time */}
      <div className="md:hidden">
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            const iso = toISODate(d);
            const count = shiftsByDay.get(iso)?.length ?? 0;
            const active = i === mobileDayIdx;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => setMobileDayIdx(i)}
                className={cn(
                  "flex flex-col items-center rounded-lg border p-2",
                  active
                    ? "border-brand bg-brand text-brand-foreground"
                    : "border-border bg-card",
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

        <Card className="mt-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                {days[mobileDayIdx].toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>
              {isManager && (
                <Button
                  size="sm"
                  onClick={() => openCreate(toISODate(days[mobileDayIdx]))}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {(shiftsByDay.get(toISODate(days[mobileDayIdx])) ?? []).length ===
              0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No shifts scheduled.
                </p>
              ) : (
                (shiftsByDay.get(toISODate(days[mobileDayIdx])) ?? []).map((s) => (
                  <ShiftRow key={s.id} shift={s} onClick={() => openEdit(s)} />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {dialog.open && (
        <ShiftFormDialog
          open={dialog.open}
          onOpenChange={(o) => !o && setDialog({ open: false })}
          workDate={dialog.workDate}
          weekDays={weekDayOptions}
          shift={dialog.shift ?? null}
          employees={employees}
          positions={positionsQ.data}
          weekKey={[weekStartISO, weekEndISO]}
        />
      )}
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
        "w-full rounded-md border p-2 text-left text-xs transition-shadow hover:shadow-sm",
        c.bg,
        c.border,
        c.text,
      )}
    >
      <div className="truncate text-sm font-semibold">
        {shift.employee_name}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 opacity-90">
        <span className={cn("h-1.5 w-1.5 rounded-full", c.chip)} />
        <span className="truncate">{shift.position_name ?? "No position"}</span>
      </div>
      <div className="mt-1 tabular-nums opacity-80">
        {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
      </div>
    </button>
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
      <span className={cn("h-10 w-1 rounded-full", c.chip)} />
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
