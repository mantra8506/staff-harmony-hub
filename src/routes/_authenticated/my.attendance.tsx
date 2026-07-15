import { createFileRoute } from "@tanstack/react-router";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Clock, LogIn, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RESTAURANT } from "@/components/layout/AppShell";
import { myAttendanceQueryOptions } from "@/features/staff-portal/queries";
import { clockIn, clockOut } from "@/lib/attendance/attendance.functions";
import { addDays, toISODate } from "@/features/schedule/types";

export const Route = createFileRoute("/_authenticated/my/attendance")({
  head: () => ({ meta: [{ title: `Attendance — ${RESTAURANT.name}` }] }),
  loader: async ({ context }) => {
    const to = toISODate(new Date());
    const from = toISODate(addDays(new Date(), -30));
    await context.queryClient.ensureQueryData(
      myAttendanceQueryOptions(from, to),
    );
  },
  component: MyAttendanceRoute,
});

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function MyAttendanceRoute() {
  const today = toISODate(new Date());
  const from = toISODate(addDays(new Date(), -30));
  const attQ = useSuspenseQuery(myAttendanceQueryOptions(from, today));
  const rows = attQ.data;

  const todayRows = rows.filter((r) => r.work_date === today);
  const openEntry = todayRows.find((r) => !r.clock_out_at) ?? null;
  const todayHours = todayRows.reduce((a, r) => a + r.hours, 0);
  const history = rows.filter((r) => r.work_date !== today || r.clock_out_at);

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
        <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
        <p className="text-sm text-muted-foreground">
          Clock in and out for your shifts.
        </p>
      </header>

      <Card>
        <CardContent className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Today
              </p>
              <p className="text-lg font-semibold">
                {todayHours.toFixed(2)}h worked
              </p>
              {openEntry ? (
                <p className="text-xs text-muted-foreground">
                  In at {fmtTime(openEntry.clock_in_at)}
                </p>
              ) : todayRows.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  You haven’t clocked in yet.
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Last out at{" "}
                  {fmtTime(todayRows[0].clock_out_at ?? todayRows[0].clock_in_at)}
                </p>
              )}
            </div>
            <Clock className="h-8 w-8 text-muted-foreground" />
          </div>
          {openEntry ? (
            <Button
              size="lg"
              variant="destructive"
              className="h-12 w-full text-base"
              onClick={() => clockOutM.mutate(openEntry.id)}
              disabled={clockOutM.isPending}
            >
              <LogOut className="mr-2 h-5 w-5" /> Clock out
            </Button>
          ) : (
            <Button
              size="lg"
              className="h-12 w-full text-base"
              onClick={() => clockInM.mutate()}
              disabled={clockInM.isPending}
            >
              <LogIn className="mr-2 h-5 w-5" /> Clock in
            </Button>
          )}
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-2 text-sm font-semibold">History (last 30 days)</h2>
        {history.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No past attendance yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {history.map((r) => (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {new Date(r.work_date + "T00:00:00").toLocaleDateString(
                        undefined,
                        { weekday: "short", month: "short", day: "numeric" },
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {fmtTime(r.clock_in_at)} –{" "}
                      {r.clock_out_at ? fmtTime(r.clock_out_at) : "open"}
                    </p>
                  </div>
                  <Badge variant="secondary">{r.hours.toFixed(2)}h</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
