import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeftRight, ArrowRight, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RESTAURANT } from "@/components/layout/AppShell";
import { staffQueryOptions } from "@/features/staff/queries";
import { shiftsQueryOptions } from "@/features/schedule/queries";
import {
  addDays,
  formatTime,
  getWeekDays,
  positionColors,
  startOfWeek,
  toISODate,
  type Shift,
} from "@/features/schedule/types";
import { reassignShift } from "@/lib/swaps/reassign.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/swaps")({
  head: () => ({
    meta: [{ title: `Shift Swaps — ${RESTAURANT.name}` }],
  }),
  loader: async ({ context }) => {
    const ws = toISODate(startOfWeek(new Date()));
    const we = toISODate(addDays(startOfWeek(new Date()), 6));
    await Promise.all([
      context.queryClient.ensureQueryData(staffQueryOptions),
      context.queryClient.ensureQueryData(shiftsQueryOptions(ws, we)),
    ]);
  },
  component: SwapsPage,
});

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function SwapsPage() {
  const { roles } = useCurrentUser();
  const isManager = roles.includes("manager");

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const days = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const wsISO = toISODate(weekStart);
  const weISO = toISODate(addDays(weekStart, 6));

  const staffQ = useSuspenseQuery(staffQueryOptions);
  const shiftsQ = useSuspenseQuery(shiftsQueryOptions(wsISO, weISO));

  const employees = staffQ.data.filter((s) => s.status === "active");
  const shifts = shiftsQ.data;

  const shiftsByDay = useMemo(() => {
    const m = new Map<string, Shift[]>();
    for (const s of shifts) {
      const arr = m.get(s.work_date) ?? [];
      arr.push(s);
      m.set(s.work_date, arr);
    }
    for (const arr of m.values())
      arr.sort((a, b) => a.start_time.localeCompare(b.start_time));
    return m;
  }, [shifts]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-center gap-2">
          <ArrowLeftRight className="h-5 w-5 text-brand" />
          <h1 className="text-2xl font-semibold tracking-tight">Shift swaps</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Reassign scheduled shifts to a different employee for this week.
        </p>
      </div>

      {!isManager && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Only managers can reassign shifts.
          </CardContent>
        </Card>
      )}

      {shifts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-brand/10 text-brand">
              <ArrowLeftRight className="h-6 w-6" />
            </span>
            <h2 className="text-lg font-semibold">
              No shifts scheduled this week
            </h2>
            <p className="text-sm text-muted-foreground">
              Add shifts on the Schedule page before reassigning.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {days.map((d, i) => {
            const iso = toISODate(d);
            const dayShifts = shiftsByDay.get(iso) ?? [];
            if (dayShifts.length === 0) return null;
            return (
              <section key={iso}>
                <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {DAY_LABELS[i]} ·{" "}
                  {d.toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {dayShifts.map((s) => (
                    <ReassignCard
                      key={s.id}
                      shift={s}
                      employees={employees}
                      canEdit={isManager}
                      weekKey={[wsISO, weISO]}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReassignCard({
  shift,
  employees,
  canEdit,
  weekKey,
}: {
  shift: Shift;
  employees: { id: string; full_name: string; primary_position_name: string | null }[];
  canEdit: boolean;
  weekKey: [string, string];
}) {
  const [newEmp, setNewEmp] = useState<string>("");
  const queryClient = useQueryClient();
  const reassignFn = useServerFn(reassignShift);

  const c = positionColors(shift.position_name);

  const m = useMutation({
    mutationFn: () =>
      reassignFn({
        data: { shiftId: shift.id, newEmployeeId: newEmp },
      }),
    onSuccess: () => {
      toast.success("Shift reassigned");
      queryClient.invalidateQueries({
        queryKey: ["shifts", weekKey[0], weekKey[1]],
      });
      setNewEmp("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to reassign"),
  });

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {shift.employee_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {shift.position_name ?? "No position"} ·{" "}
              <span className="tabular-nums">
                {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
              </span>
            </div>
          </div>
          {shift.position_name && (
            <Badge
              variant="outline"
              className={cn("shrink-0", c.bg, c.border, c.text)}
            >
              <span className={cn("mr-1 h-1.5 w-1.5 rounded-full", c.chip)} />
              {shift.position_name}
            </Badge>
          )}
        </div>

        {canEdit && (
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <div className="flex-1">
              <Select value={newEmp} onValueChange={setNewEmp}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => e.id !== shift.employee_id)
                    .map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.full_name}
                        {e.primary_position_name
                          ? ` · ${e.primary_position_name}`
                          : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => m.mutate()}
              disabled={!newEmp || m.isPending}
            >
              {m.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="h-4 w-4" />
              )}
              Reassign
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
