import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  ArrowLeftRight,
  Check,
  X,
  Ban,
  Loader2,
  CalendarClock,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCurrentUser } from "@/hooks/use-current-user";
import { RESTAURANT } from "@/components/layout/AppShell";
import { swapRequestsQueryOptions } from "@/features/schedule/queries";
import { cancelSwapRequest, decideSwapRequest } from "@/lib/swaps/swaps.functions";
import { formatTime } from "@/features/schedule/types";
import type { SwapRequest, SwapStatus } from "@/features/schedule/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/swaps")({
  head: () => ({
    meta: [{ title: `Shift Swaps — ${RESTAURANT.name}` }],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(swapRequestsQueryOptions);
  },
  component: SwapsPage,
});

const STATUS_STYLES: Record<SwapStatus, string> = {
  pending:
    "bg-amber-100 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-900",
  approved:
    "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-900",
  rejected:
    "bg-rose-100 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-900",
  cancelled:
    "bg-muted text-muted-foreground border-border",
};

type Filter = "pending" | "resolved" | "all";

function SwapsPage() {
  const { roles } = useCurrentUser();
  const isManager = roles.includes("manager");
  const isSupervisor = isManager || roles.includes("shift_lead");

  const q = useSuspenseQuery(swapRequestsQueryOptions);
  const [filter, setFilter] = useState<Filter>("pending");

  const requests = q.data;
  const visible = requests.filter((r) => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "resolved") return r.status !== "pending";
    return true;
  });

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-brand" />
            <h1 className="text-2xl font-semibold tracking-tight">Shift swaps</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Managers propose shift reassignments. Shift leads and managers
            approve or reject them.
          </p>
        </div>
        <div className="mt-4">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
            <TabsList>
              <TabsTrigger value="pending">
                Pending
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="resolved">Resolved</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {visible.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-14 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-muted text-muted-foreground">
              <CalendarClock className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              {filter === "pending"
                ? "No pending swap requests."
                : "Nothing to show here."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((r) => (
            <SwapCard
              key={r.id}
              req={r}
              canDecide={isSupervisor && r.status === "pending"}
              canCancel={isManager && r.status === "pending"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SwapCard({
  req,
  canDecide,
  canCancel,
}: {
  req: SwapRequest;
  canDecide: boolean;
  canCancel: boolean;
}) {
  const queryClient = useQueryClient();
  const decideFn = useServerFn(decideSwapRequest);
  const cancelFn = useServerFn(cancelSwapRequest);

  const [decideOpen, setDecideOpen] = useState<null | "approved" | "rejected">(
    null,
  );
  const [notes, setNotes] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
  };

  const decideM = useMutation({
    mutationFn: (decision: "approved" | "rejected") =>
      decideFn({
        data: { id: req.id, decision, notes: notes.trim() || null },
      }),
    onSuccess: (_d, decision) => {
      toast.success(decision === "approved" ? "Swap approved" : "Swap rejected");
      invalidate();
      setDecideOpen(null);
      setNotes("");
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to update"),
  });

  const cancelM = useMutation({
    mutationFn: () => cancelFn({ data: { id: req.id } }),
    onSuccess: () => {
      toast.success("Request cancelled");
      invalidate();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to cancel"),
  });

  const dateLabel = req.work_date
    ? new Date(req.work_date + "T00:00:00").toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "Unknown date";

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant="outline"
                className={cn("capitalize", STATUS_STYLES[req.status])}
              >
                {req.status}
              </Badge>
              <span className="text-sm font-medium">{dateLabel}</span>
              {req.start_time && (
                <span className="text-sm text-muted-foreground tabular-nums">
                  {formatTime(req.start_time)} – {formatTime(req.end_time)}
                </span>
              )}
              {req.position_name && (
                <Badge variant="secondary">{req.position_name}</Badge>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{req.from_employee_name}</span>
              <ArrowLeftRight className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{req.to_employee_name}</span>
            </div>

            <p className="text-xs text-muted-foreground">
              Proposed by {req.proposed_by_name ?? "manager"} ·{" "}
              {new Date(req.created_at).toLocaleString()}
            </p>

            {req.reason && (
              <p className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                {req.reason}
              </p>
            )}

            {req.status !== "pending" && (req.decision_notes || req.decided_by_name) && (
              <p className="text-xs text-muted-foreground">
                {req.status === "approved" ? "Approved" : req.status === "rejected" ? "Rejected" : "Closed"} by{" "}
                {req.decided_by_name ?? "supervisor"}
                {req.decided_at
                  ? ` · ${new Date(req.decided_at).toLocaleString()}`
                  : ""}
                {req.decision_notes ? ` — ${req.decision_notes}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            {canDecide && (
              <>
                <Button
                  size="sm"
                  onClick={() => setDecideOpen("approved")}
                >
                  <Check className="h-4 w-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDecideOpen("rejected")}
                >
                  <X className="h-4 w-4" />
                  Reject
                </Button>
              </>
            )}
            {canCancel && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cancelM.mutate()}
                disabled={cancelM.isPending}
              >
                {cancelM.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ban className="h-4 w-4" />
                )}
                Cancel
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <Dialog
        open={decideOpen !== null}
        onOpenChange={(o) => !o && setDecideOpen(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {decideOpen === "approved" ? "Approve swap" : "Reject swap"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {decideOpen === "approved"
                ? `Reassign the shift from ${req.from_employee_name} to ${req.to_employee_name}.`
                : "The swap will be marked as rejected. The shift stays with the current employee."}
            </p>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (optional)"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecideOpen(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => decideOpen && decideM.mutate(decideOpen)}
              disabled={decideM.isPending}
            >
              {decideM.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
