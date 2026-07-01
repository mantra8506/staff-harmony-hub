import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Mail, Search, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  positionsQueryOptions,
  staffQueryOptions,
} from "@/features/staff/queries";
import { StaffFormDialog } from "@/features/staff/components/StaffFormDialog";
import { setStaffStatus } from "@/lib/staff/staff.functions";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { StaffMember } from "@/features/staff/types";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff — Staff HQ" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(staffQueryOptions),
      context.queryClient.ensureQueryData(positionsQueryOptions),
    ]);
  },
  component: StaffPage,
  errorComponent: ({ error }) => (
    <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-4">Staff not found.</div>,
});

function StaffPage() {
  const { roles } = useCurrentUser();
  const isManager = roles.includes("manager");
  const queryClient = useQueryClient();
  const staff = useSuspenseQuery(staffQueryOptions);
  const positions = useSuspenseQuery(positionsQueryOptions);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");

  const statusMutation = useMutation({
    mutationFn: (v: { userId: string; status: "active" | "inactive" }) =>
      setStaffStatus({ data: v }),
    onSuccess: (_d, v) => {
      toast.success(v.status === "active" ? "Staff activated." : "Staff deactivated.");
      queryClient.invalidateQueries({ queryKey: staffQueryOptions.queryKey });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.data.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (positionFilter !== "all") {
        const inPrimary = m.primary_position_id === positionFilter;
        const inSecondary = m.secondary_position_ids.includes(positionFilter);
        if (!inPrimary && !inSecondary) return false;
      }
      if (q && !m.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [staff.data, query, positionFilter, statusFilter]);

  const totalActive = staff.data.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            {totalActive} active · {staff.data.length} total
          </p>
        </div>
        {isManager && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 size-4" /> Invite staff
          </Button>
        )}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search by name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search staff"
          />
        </div>
        <Select value={positionFilter} onValueChange={setPositionFilter}>
          <SelectTrigger className="sm:w-56" aria-label="Filter by position">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All positions</SelectItem>
            {positions.data.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="inactive">Inactive</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      <section aria-label="Staff list" className="overflow-hidden rounded-lg border border-border">
        {filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            {staff.data.length === 0
              ? isManager
                ? "No staff yet. Invite your first team member."
                : "No staff yet."
              : "No staff match your filters."}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <Link
                  to="/staff/$userId"
                  params={{ userId: m.id }}
                  className="min-w-0 flex-1 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-medium">{m.full_name}</span>
                    {m.roles.includes("manager") && (
                      <Badge variant="secondary" className="text-xs">Manager</Badge>
                    )}
                    {m.status === "inactive" && (
                      <Badge variant="outline" className="text-xs">Inactive</Badge>
                    )}
                    {m.pending_invite && (
                      <Badge variant="outline" className="text-xs">
                        <Mail className="mr-1 size-3" /> Pending
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {m.primary_position_name ?? "No position"}
                    {m.phone ? ` · ${m.phone}` : ""}
                    {m.email ? ` · ${m.email}` : ""}
                  </div>
                </Link>
                {isManager && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(m);
                        setDialogOpen(true);
                      }}
                      aria-label={`Edit ${m.full_name}`}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {!m.roles.includes("manager") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={statusMutation.isPending}
                        onClick={() =>
                          statusMutation.mutate({
                            userId: m.id,
                            status: m.status === "active" ? "inactive" : "active",
                          })
                        }
                        aria-label={
                          m.status === "active"
                            ? `Deactivate ${m.full_name}`
                            : `Activate ${m.full_name}`
                        }
                      >
                        {m.status === "active" ? (
                          <PowerOff className="size-4" />
                        ) : (
                          <Power className="size-4" />
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <StaffFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        positions={positions.data}
        member={editing}
      />
    </div>
  );
}
