import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Calendar,
  Hash,
  Mail,
  Pencil,
  Phone,
  Power,
  PowerOff,
  RefreshCcw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  positionsQueryOptions,
  staffMemberQueryOptions,
  staffQueryOptions,
} from "@/features/staff/queries";
import { StaffFormDialog } from "@/features/staff/components/StaffFormDialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { SHIFTS, WEEKDAYS } from "@/features/staff/types";
import {
  resendInvite,
  setStaffStatus,
} from "@/lib/staff/staff.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/staff/$userId")({
  head: () => ({ meta: [{ title: "Employee profile — Station 31" }] }),
  loader: async ({ context, params }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(staffMemberQueryOptions(params.userId)),
      context.queryClient.ensureQueryData(positionsQueryOptions),
    ]);
  },
  component: StaffProfilePage,
  errorComponent: ({ error }) => (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-4">Employee not found.</div>,
});

function StaffProfilePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { roles, user } = useCurrentUser();
  const isManager = roles.includes("manager");
  const isSelf = user?.id === userId;

  const memberQ = useSuspenseQuery(staffMemberQueryOptions(userId));
  const positionsQ = useSuspenseQuery(positionsQueryOptions);
  const m = memberQ.data;

  const [editOpen, setEditOpen] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["staff", userId] });
    queryClient.invalidateQueries({ queryKey: staffQueryOptions.queryKey });
  };

  const statusMutation = useMutation({
    mutationFn: (v: { userId: string; status: "active" | "inactive" }) =>
      setStaffStatus({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "active" ? "Employee activated." : "Employee deactivated.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendInvite({ data: { userId } }),
    onSuccess: () => {
      toast.success("Invitation resent.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pending = m.invite_status === "pending" || m.invite_status === "expired";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/staff">
            <ArrowLeft className="mr-1 size-4" /> Back to directory
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          {isManager && pending && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
            >
              <RefreshCcw className="mr-1 size-4" /> Resend invite
            </Button>
          )}
          {isManager && !m.roles.includes("manager") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                statusMutation.mutate({
                  userId,
                  status: m.status === "active" ? "inactive" : "active",
                })
              }
              disabled={statusMutation.isPending}
            >
              {m.status === "active" ? (
                <>
                  <PowerOff className="mr-1 size-4" /> Deactivate
                </>
              ) : (
                <>
                  <Power className="mr-1 size-4" /> Activate
                </>
              )}
            </Button>
          )}
          {(isManager || isSelf) && (
            <Button size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="mr-1 size-4" /> Edit
            </Button>
          )}
        </div>
      </div>

      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-center">
        <span
          aria-hidden
          className="grid size-16 shrink-0 place-items-center rounded-full bg-brand/10 text-xl font-semibold text-brand"
        >
          {m.full_name
            .split(/\s+/)
            .slice(0, 2)
            .map((s) => s[0]?.toUpperCase() ?? "")
            .join("")}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{m.full_name}</h1>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                m.status === "active"
                  ? "bg-accent-emerald/10 text-accent-emerald"
                  : "bg-muted text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  m.status === "active" ? "bg-accent-emerald" : "bg-muted-foreground/50",
                )}
              />
              {m.status === "active" ? "Active" : "Inactive"}
            </span>
            {m.roles.includes("manager") && <Badge variant="secondary">Manager</Badge>}
            {m.invite_status === "pending" && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
                <Mail className="mr-1 size-3" /> Pending invite
              </Badge>
            )}
            {m.invite_status === "expired" && (
              <Badge variant="outline" className="border-destructive/40 text-destructive">
                Invite expired
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {m.primary_position_name ?? "No primary position"}
            {m.employee_code && (
              <>
                {" · "}
                <span className="font-mono">{m.employee_code}</span>
              </>
            )}
          </p>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <User className="size-4 text-muted-foreground" /> Personal information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <Field icon={Hash} label="Employee ID" value={m.employee_code ?? "—"} mono />
            <Field icon={Mail} label="Email" value={m.email ?? "—"} />
            <Field icon={Phone} label="Phone" value={m.phone ?? "—"} />
            <Field
              icon={Calendar}
              label="Date joined"
              value={new Date(m.created_at).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Job information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0 text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Primary position
              </p>
              <p className="mt-0.5 font-medium">{m.primary_position_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Secondary positions
              </p>
              {m.secondary_position_names.length > 0 ? (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {m.secondary_position_names.map((n) => (
                    <Badge key={n} variant="outline" className="text-xs">
                      {n}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-0.5 text-muted-foreground">None</p>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Employment status
              </p>
              <p className="mt-0.5 font-medium">
                {m.status === "active" ? "Active" : "Inactive"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Weekly availability</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Day</th>
                    {SHIFTS.map((s) => (
                      <th key={s.key} className="px-3 py-2">
                        {s.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {WEEKDAYS.map((d) => {
                    const shifts = (m.availability?.[d.key] ?? []) as string[];
                    const unavailable = shifts.length === 0;
                    return (
                      <tr key={d.key}>
                        <td className="px-3 py-2 font-medium">{d.long}</td>
                        {SHIFTS.map((s) => {
                          const on = shifts.includes(s.key);
                          return (
                            <td key={s.key} className="px-3 py-2">
                              {on ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                                  Available
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </td>
                          );
                        })}
                        {unavailable && (
                          <td
                            className="hidden text-xs text-muted-foreground"
                            aria-hidden
                          />
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-sm">
              <span className="text-muted-foreground">Max hours per week:</span>{" "}
              <span className="font-medium">
                {m.max_hours_per_week != null ? `${m.max_hours_per_week} hrs` : "No cap"}
              </span>
            </div>
          </CardContent>
        </Card>

        {isManager && m.notes && (
          <Card className="border-border shadow-sm lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Manager notes</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
                {m.notes}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <StaffFormDialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) navigate({ to: "/staff/$userId", params: { userId } });
        }}
        positions={positionsQ.data}
        member={m}
      />
    </div>
  );
}

function Field({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className={cn("mt-0.5 truncate text-sm", mono && "font-mono")}>{value}</p>
      </div>
    </div>
  );
}
