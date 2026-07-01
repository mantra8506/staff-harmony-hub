import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  positionsQueryOptions,
  staffMemberQueryOptions,
} from "@/features/staff/queries";
import { StaffFormDialog } from "@/features/staff/components/StaffFormDialog";
import { useCurrentUser } from "@/hooks/use-current-user";
import { WEEKDAYS } from "@/features/staff/types";

export const Route = createFileRoute("/_authenticated/staff/$userId")({
  head: () => ({ meta: [{ title: "Staff profile — Staff HQ" }] }),
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
  notFoundComponent: () => <div className="p-4">Staff member not found.</div>,
});

function StaffProfilePage() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const { roles, user } = useCurrentUser();
  const isManager = roles.includes("manager");
  const isSelf = user?.id === userId;

  const memberQ = useSuspenseQuery(staffMemberQueryOptions(userId));
  const positionsQ = useSuspenseQuery(positionsQueryOptions);
  const m = memberQ.data;

  const [editOpen, setEditOpen] = useState(false);

  const availableDays = WEEKDAYS.filter((d) => m.availability?.[d.key]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/staff">
            <ArrowLeft className="mr-1 size-4" /> Back
          </Link>
        </Button>
        {(isManager || isSelf) && (
          <Button size="sm" onClick={() => setEditOpen(true)}>
            <Pencil className="mr-1 size-4" /> Edit
          </Button>
        )}
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{m.full_name}</h1>
          {m.roles.includes("manager") && <Badge variant="secondary">Manager</Badge>}
          {m.status === "inactive" && <Badge variant="outline">Inactive</Badge>}
          {m.pending_invite && <Badge variant="outline">Pending invite</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {m.primary_position_name ?? "No primary position"}
        </p>
      </header>

      <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Email" value={m.email ?? "—"} />
        <Field label="Phone" value={m.phone ?? "—"} />
        <Field label="Primary position" value={m.primary_position_name ?? "—"} />
        <Field
          label="Secondary positions"
          value={
            m.secondary_position_names.length > 0
              ? m.secondary_position_names.join(", ")
              : "—"
          }
        />
        <Field
          label="Availability"
          value={
            availableDays.length > 0
              ? availableDays.map((d) => d.label).join(", ")
              : "Not set"
          }
        />
        <Field
          label="Max hours / week"
          value={m.max_hours_per_week != null ? String(m.max_hours_per_week) : "—"}
        />
        <Field label="Status" value={m.status === "active" ? "Active" : "Inactive"} />
        <Field
          label="Date added"
          value={new Date(m.created_at).toLocaleDateString()}
        />
      </dl>

      {m.notes && (
        <section>
          <h2 className="mb-2 text-sm font-medium">Notes</h2>
          <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
            {m.notes}
          </p>
        </section>
      )}

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

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}
