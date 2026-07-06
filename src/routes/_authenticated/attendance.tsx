import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Clock,
  ClipboardList,
  Loader2,
  LogIn,
  LogOut,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RESTAURANT } from "@/components/layout/AppShell";
import { staffQueryOptions } from "@/features/staff/queries";
import { attendanceRangeQueryOptions } from "@/features/operations/queries";
import {
  clockIn,
  clockOut,
  deleteAttendance,
  type AttendanceRow,
} from "@/lib/attendance/attendance.functions";
import { cn } from "@/lib/utils";

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export const Route = createFileRoute("/_authenticated/attendance")({
  head: () => ({
    meta: [{ title: `Attendance — ${RESTAURANT.name}` }],
  }),
  loader: async ({ context }) => {
    const t = todayISO();
    await Promise.all([
      context.queryClient.ensureQueryData(staffQueryOptions),
      context.queryClient.ensureQueryData(attendanceRangeQueryOptions(t, t)),
    ]);
  },
  component: AttendancePage,
});

function AttendancePage() {
  const { user, roles } = useCurrentUser();
  const isManager = roles.includes("manager");
  const today = todayISO();

  const staffQ = useSuspenseQuery(staffQueryOptions);
  const attendanceQ = useSuspenseQuery(attendanceRangeQueryOptions(today, today));
  const rows = attendanceQ.data;

  const myOpen = useMemo(
    () =>
      rows.find((r) => r.employee_id === user?.id && !r.clock_out_at) ?? null,
    [rows, user?.id],
  );

  const activeRows = rows.filter((r) => !r.clock_out_at);
  const finishedRows = rows.filter((r) => r.clock_out_at);
  const totalHours = rows.reduce((a, r) => a + r.hours, 0);

  const queryClient = useQueryClient();
  const clockInFn = useServerFn(clockIn);
  const clockOutFn = useServerFn(clockOut);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["attendance"] });

  const clockInM = useMutation({
    mutationFn: (employeeId?: string) =>
      clockInFn({ data: employeeId ? { employeeId } : {} }),
    onSuccess: () => {
      toast.success("Clocked in");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to clock in"),
  });

  const clockOutM = useMutation({
    mutationFn: (id: string) => clockOutFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Clocked out");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to clock out"),
  });

  return (
    <div className="space-y-6">
      {/* Header + self clock */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {new Date().toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {myOpen ? (
            <>
              <div className="text-right text-xs text-muted-foreground">
                <div>Clocked in at</div>
                <div className="font-medium tabular-nums text-foreground">
                  {fmtTime(myOpen.clock_in_at)}
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => clockOutM.mutate(myOpen.id)}
                disabled={clockOutM.isPending}
              >
                {clockOutM.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Clock out
              </Button>
            </>
          ) : (
            <Button
              onClick={() => clockInM.mutate(undefined)}
              disabled={clockInM.isPending}
            >
              {clockInM.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              Clock in
            </Button>
          )}
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryTile
          label="Currently clocked in"
          value={String(activeRows.length)}
          tone="brand"
        />
        <SummaryTile
          label="Finished today"
          value={String(finishedRows.length)}
          tone="emerald"
        />
        <SummaryTile
          label="Total hours today"
          value={totalHours.toFixed(1)}
          tone="muted"
        />
      </div>

      {/* Current on floor */}
      <Section title="Currently on the floor" count={activeRows.length}>
        {activeRows.length === 0 ? (
          <EmptyRow text="Nobody is clocked in right now." />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {activeRows.map((r) => (
              <AttendanceListRow
                key={r.id}
                row={r}
                showClockOut
                isManager={isManager}
                canSelfOut={r.employee_id === user?.id}
                onClockOut={() => clockOutM.mutate(r.id)}
                pending={clockOutM.isPending}
                onDelete={
                  isManager
                    ? () => queryClient.invalidateQueries({ queryKey: ["attendance"] })
                    : undefined
                }
              />
            ))}
          </ul>
        )}
      </Section>

      {/* Finished */}
      <Section title="Finished today" count={finishedRows.length}>
        {finishedRows.length === 0 ? (
          <EmptyRow text="No completed shifts yet today." />
        ) : (
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {finishedRows.map((r) => (
              <AttendanceListRow
                key={r.id}
                row={r}
                isManager={isManager}
              />
            ))}
          </ul>
        )}
      </Section>

      {/* Manager clock-in helper */}
      {isManager && (
        <Section title="Clock in a team member" count={undefined}>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {staffQ.data
              .filter((s) => s.status === "active")
              .filter(
                (s) => !rows.some((r) => r.employee_id === s.id && !r.clock_out_at),
              )
              .map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => clockInM.mutate(s.id)}
                  className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm transition-colors hover:border-brand/40"
                >
                  <div className="min-w-0 text-left">
                    <div className="truncate font-medium">{s.full_name}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {s.primary_position_name ?? "No position"}
                    </div>
                  </div>
                  <LogIn className="h-4 w-4 text-brand" />
                </button>
              ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
        {typeof count === "number" && (
          <Badge variant="secondary">{count}</Badge>
        )}
      </div>
      {children}
    </section>
  );
}

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "brand" | "emerald" | "muted";
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
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
          <Clock className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function EmptyRow({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function AttendanceListRow({
  row,
  isManager,
  showClockOut,
  canSelfOut,
  onClockOut,
  pending,
}: {
  row: AttendanceRow;
  isManager: boolean;
  showClockOut?: boolean;
  canSelfOut?: boolean;
  onClockOut?: () => void;
  pending?: boolean;
  onDelete?: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteAttendance);
  const deleteM = useMutation({
    mutationFn: () => deleteFn({ data: { id: row.id } }),
    onSuccess: () => {
      toast.success("Entry removed");
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to remove"),
  });

  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold uppercase">
        {row.employee_name
          .split(/\s+/)
          .slice(0, 2)
          .map((s) => s[0])
          .join("")}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{row.employee_name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {row.position_name ?? "No position"}
        </div>
      </div>
      <div className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
        <div>In {fmtTime(row.clock_in_at)}</div>
        <div>
          {row.clock_out_at
            ? `Out ${fmtTime(row.clock_out_at)} · ${row.hours.toFixed(1)}h`
            : "In progress"}
        </div>
      </div>
      {showClockOut && (isManager || canSelfOut) && onClockOut && (
        <Button
          size="sm"
          variant="outline"
          onClick={onClockOut}
          disabled={pending}
        >
          <LogOut className="h-3.5 w-3.5" />
          Clock out
        </Button>
      )}
      {isManager && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Remove entry">
              <Trash2 className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove attendance entry?</AlertDialogTitle>
              <AlertDialogDescription>
                This deletes the clock-in / clock-out record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteM.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Remove
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </li>
  );
}
