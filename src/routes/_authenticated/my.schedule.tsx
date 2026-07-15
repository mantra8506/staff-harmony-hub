import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RESTAURANT } from "@/components/layout/AppShell";
import { myShiftsQueryOptions } from "@/features/staff-portal/queries";
import {
  addDays,
  formatTime,
  getWeekDays,
  shiftHours,
  startOfWeek,
  toISODate,
  type Shift,
} from "@/features/schedule/types";

export const Route = createFileRoute("/_authenticated/my/schedule")({
  head: () => ({ meta: [{ title: `My schedule — ${RESTAURANT.name}` }] }),
  loader: async ({ context }) => {
    const ws = startOfWeek(new Date());
    await context.queryClient.ensureQueryData(
      myShiftsQueryOptions(toISODate(ws), toISODate(addDays(ws, 6))),
    );
  },
  component: MyScheduleRoute,
});

function MyScheduleRoute() {
  const ws = startOfWeek(new Date());
  const wsISO = toISODate(ws);
  const weISO = toISODate(addDays(ws, 6));
  const shiftsQ = useSuspenseQuery(myShiftsQueryOptions(wsISO, weISO));
  const shifts = shiftsQ.data;
  const days = getWeekDays(ws);
  const today = toISODate(new Date());

  const byDay = new Map<string, Shift[]>();
  shifts.forEach((s) => {
    const list = byDay.get(s.work_date) ?? [];
    list.push(s);
    byDay.set(s.work_date, list);
  });

  const totalHours = shifts.reduce(
    (a, s) => a + shiftHours(s.start_time, s.end_time, s.break_minutes),
    0,
  );

  return (
    <div className="space-y-4 pb-4">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">My schedule</h1>
        <p className="text-sm text-muted-foreground">
          Week of{" "}
          {ws.toLocaleDateString(undefined, { month: "short", day: "numeric" })}{" "}
          – {shifts.length} shift{shifts.length === 1 ? "" : "s"} ·{" "}
          {totalHours.toFixed(1)}h total
        </p>
      </header>

      {shifts.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            You don’t have any scheduled shifts.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {days.map((d) => {
            const iso = toISODate(d);
            const list = byDay.get(iso) ?? [];
            const isToday = iso === today;
            return (
              <Card
                key={iso}
                className={isToday ? "border-brand/60 shadow-sm" : ""}
              >
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-semibold">
                        {d.toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    {isToday ? (
                      <Badge className="bg-brand text-brand-foreground">
                        Today
                      </Badge>
                    ) : null}
                  </div>
                  {list.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Off</p>
                  ) : (
                    <ul className="space-y-2">
                      {list.map((s) => (
                        <li
                          key={s.id}
                          className="rounded-lg border border-border bg-surface/50 p-3"
                        >
                          <p className="text-sm font-medium">
                            {formatTime(s.start_time)} – {formatTime(s.end_time)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            {s.position_name ? (
                              <Badge variant="secondary">
                                {s.position_name}
                              </Badge>
                            ) : null}
                            <span className="text-xs text-muted-foreground">
                              {shiftHours(
                                s.start_time,
                                s.end_time,
                                s.break_minutes,
                              ).toFixed(1)}
                              h
                              {s.break_minutes
                                ? ` · ${s.break_minutes}m break`
                                : ""}
                            </span>
                          </div>
                          {s.notes ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              {s.notes}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
