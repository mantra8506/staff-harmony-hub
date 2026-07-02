import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Mail,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCcw,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  positionsQueryOptions,
  staffQueryOptions,
} from "@/features/staff/queries";
import { StaffFormDialog } from "@/features/staff/components/StaffFormDialog";
import {
  cancelInvite,
  resendInvite,
  setStaffStatus,
} from "@/lib/staff/staff.functions";
import { useCurrentUser } from "@/hooks/use-current-user";
import type { InviteStatus, StaffMember } from "@/features/staff/types";
import { cn } from "@/lib/utils";

type SortKey = "name" | "newest" | "oldest" | "position";
type AvailabilityFilter = "any" | "morning" | "afternoon" | "evening";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff Directory — Station 31" }] }),
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
  const [availabilityFilter, setAvailabilityFilter] =
    useState<AvailabilityFilter>("any");
  const [statusFilter, setStatusFilter] = useState<"active" | "inactive" | "all">("active");
  const [sort, setSort] = useState<SortKey>("name");

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: staffQueryOptions.queryKey });

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
    mutationFn: (userId: string) => resendInvite({ data: { userId } }),
    onSuccess: () => {
      toast.success("Invitation resent.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const cancelMutation = useMutation({
    mutationFn: (userId: string) => cancelInvite({ data: { userId } }),
    onSuccess: () => {
      toast.success("Invitation cancelled.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const items = staff.data.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (positionFilter !== "all") {
        const inPrimary = m.primary_position_id === positionFilter;
        const inSecondary = m.secondary_position_ids.includes(positionFilter);
        if (!inPrimary && !inSecondary) return false;
      }
      if (availabilityFilter !== "any") {
        const hasSlot = Object.values(m.availability ?? {}).some((slots) =>
          Array.isArray(slots) ? slots.includes(availabilityFilter) : false,
        );
        if (!hasSlot) return false;
      }
      if (q) {
        const hay = [
          m.full_name,
          m.email ?? "",
          m.phone ?? "",
          m.primary_position_name ?? "",
          ...m.secondary_position_names,
          m.employee_code ?? "",
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sorted = [...items].sort((a, b) => {
      switch (sort) {
        case "newest":
          return +new Date(b.created_at) - +new Date(a.created_at);
        case "oldest":
          return +new Date(a.created_at) - +new Date(b.created_at);
        case "position":
          return (a.primary_position_name ?? "~").localeCompare(
            b.primary_position_name ?? "~",
          );
        case "name":
        default:
          return a.full_name.localeCompare(b.full_name);
      }
    });
    return sorted;
  }, [staff.data, query, positionFilter, availabilityFilter, statusFilter, sort]);

  const totalActive = staff.data.filter((m) => m.status === "active").length;
  const totalInactive = staff.data.filter((m) => m.status === "inactive").length;
  const totalPending = staff.data.filter((m) => m.invite_status === "pending" || m.invite_status === "expired").length;

  const resetFilters = () => {
    setQuery("");
    setPositionFilter("all");
    setAvailabilityFilter("any");
    setStatusFilter("all");
    setSort("name");
  };

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff Directory</h1>
          <p className="text-sm text-muted-foreground">
            {staff.data.length} total · {totalActive} active · {totalInactive} inactive
            {totalPending > 0 && ` · ${totalPending} pending`}
          </p>
        </div>
        {isManager && (
          <Button onClick={openAdd} className="self-start">
            <Plus className="mr-1 size-4" /> Add employee
          </Button>
        )}
      </header>

      {staff.data.length === 0 ? (
        <EmptyDirectory isManager={isManager} onAdd={openAdd} />
      ) : (
        <>
          <Toolbar
            query={query}
            onQuery={setQuery}
            positionFilter={positionFilter}
            onPositionFilter={setPositionFilter}
            availabilityFilter={availabilityFilter}
            onAvailabilityFilter={setAvailabilityFilter}
            sort={sort}
            onSort={setSort}
            positions={positions.data}
          />

          <Tabs
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as any)}
          >
            <TabsList>
              <TabsTrigger value="active">Active ({totalActive})</TabsTrigger>
              <TabsTrigger value="inactive">Inactive ({totalInactive})</TabsTrigger>
              <TabsTrigger value="all">All ({staff.data.length})</TabsTrigger>
            </TabsList>
          </Tabs>

          {filtered.length === 0 ? (
            <NoResults onReset={resetFilters} />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden overflow-hidden rounded-xl border border-border bg-card shadow-sm md:block">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Position</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((m) => (
                      <StaffRow
                        key={m.id}
                        m={m}
                        isManager={isManager}
                        onEdit={() => {
                          setEditing(m);
                          setDialogOpen(true);
                        }}
                        onToggleStatus={() =>
                          statusMutation.mutate({
                            userId: m.id,
                            status: m.status === "active" ? "inactive" : "active",
                          })
                        }
                        onResend={() => resendMutation.mutate(m.id)}
                        onCancel={() => cancelMutation.mutate(m.id)}
                        busy={
                          statusMutation.isPending ||
                          resendMutation.isPending ||
                          cancelMutation.isPending
                        }
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="grid gap-3 md:hidden">
                {filtered.map((m) => (
                  <StaffCard
                    key={m.id}
                    m={m}
                    isManager={isManager}
                    onEdit={() => {
                      setEditing(m);
                      setDialogOpen(true);
                    }}
                    onToggleStatus={() =>
                      statusMutation.mutate({
                        userId: m.id,
                        status: m.status === "active" ? "inactive" : "active",
                      })
                    }
                    onResend={() => resendMutation.mutate(m.id)}
                    onCancel={() => cancelMutation.mutate(m.id)}
                    busy={
                      statusMutation.isPending ||
                      resendMutation.isPending ||
                      cancelMutation.isPending
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}

      <StaffFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        positions={positions.data}
        member={editing}
      />
    </div>
  );
}

/* ------------------------------ Toolbar ------------------------------ */

function Toolbar(props: {
  query: string;
  onQuery: (v: string) => void;
  positionFilter: string;
  onPositionFilter: (v: string) => void;
  availabilityFilter: AvailabilityFilter;
  onAvailabilityFilter: (v: AvailabilityFilter) => void;
  sort: SortKey;
  onSort: (v: SortKey) => void;
  positions: { id: string; name: string }[];
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(0,auto))]">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search by name, email, phone, or position"
          value={props.query}
          onChange={(e) => props.onQuery(e.target.value)}
          aria-label="Search staff"
        />
      </div>
      <Select value={props.positionFilter} onValueChange={props.onPositionFilter}>
        <SelectTrigger className="sm:w-52" aria-label="Filter by position">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All positions</SelectItem>
          {props.positions.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={props.availabilityFilter}
        onValueChange={(v) => props.onAvailabilityFilter(v as AvailabilityFilter)}
      >
        <SelectTrigger className="sm:w-44" aria-label="Filter by availability">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="any">Any availability</SelectItem>
          <SelectItem value="morning">Available mornings</SelectItem>
          <SelectItem value="afternoon">Available afternoons</SelectItem>
          <SelectItem value="evening">Available evenings</SelectItem>
        </SelectContent>
      </Select>
      <Select value={props.sort} onValueChange={(v) => props.onSort(v as SortKey)}>
        <SelectTrigger className="sm:w-44" aria-label="Sort staff">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="name">Name (A–Z)</SelectItem>
          <SelectItem value="newest">Newest first</SelectItem>
          <SelectItem value="oldest">Oldest first</SelectItem>
          <SelectItem value="position">By position</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/* ------------------------------ Rows ------------------------------ */

function Avatar({ name }: { name: string }) {
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("");
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-xs font-semibold text-brand"
    >
      {initials || "?"}
    </span>
  );
}

function InviteBadge({ status }: { status: InviteStatus }) {
  if (status === "pending") {
    return (
      <Badge variant="outline" className="border-amber-500/40 text-amber-700 dark:text-amber-400">
        <Mail className="mr-1 size-3" /> Pending
      </Badge>
    );
  }
  if (status === "expired") {
    return (
      <Badge variant="outline" className="border-destructive/40 text-destructive">
        Expired
      </Badge>
    );
  }
  return null;
}

function StaffRow({
  m,
  isManager,
  onEdit,
  onToggleStatus,
  onResend,
  onCancel,
  busy,
}: {
  m: StaffMember;
  isManager: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onResend: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <tr className="hover:bg-muted/40">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={m.full_name} />
          <div className="min-w-0">
            <Link
              to="/staff/$userId"
              params={{ userId: m.id }}
              className="block truncate font-medium hover:underline"
            >
              {m.full_name}
            </Link>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                {m.employee_code ?? "—"}
              </span>
              {m.roles.includes("manager") && (
                <Badge variant="secondary" className="text-[10px]">Manager</Badge>
              )}
            </div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="truncate text-sm">{m.primary_position_name ?? "—"}</div>
        {m.secondary_position_names.length > 0 && (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            +{m.secondary_position_names.join(", ")}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-sm">
        <div className="truncate">{m.email ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{m.phone ?? "—"}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={m.status} />
          <InviteBadge status={m.invite_status} />
        </div>
      </td>
      <td className="px-4 py-3 text-right">
        {isManager && (
          <RowActions
            m={m}
            onEdit={onEdit}
            onToggleStatus={onToggleStatus}
            onResend={onResend}
            onCancel={onCancel}
            busy={busy}
          />
        )}
      </td>
    </tr>
  );
}

function StaffCard({
  m,
  isManager,
  onEdit,
  onToggleStatus,
  onResend,
  onCancel,
  busy,
}: {
  m: StaffMember;
  isManager: boolean;
  onEdit: () => void;
  onToggleStatus: () => void;
  onResend: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  return (
    <Card className="border-border shadow-sm">
      <CardContent className="flex items-start gap-3 p-4">
        <Avatar name={m.full_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link
              to="/staff/$userId"
              params={{ userId: m.id }}
              className="block min-w-0"
            >
              <div className="truncate font-medium">{m.full_name}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                  {m.employee_code ?? "—"}
                </span>
                <span className="truncate">{m.primary_position_name ?? "No position"}</span>
              </div>
            </Link>
            {isManager && (
              <RowActions
                m={m}
                onEdit={onEdit}
                onToggleStatus={onToggleStatus}
                onResend={onResend}
                onCancel={onCancel}
                busy={busy}
              />
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusPill status={m.status} />
            <InviteBadge status={m.invite_status} />
          </div>
          {(m.email || m.phone) && (
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              {m.email && <div className="truncate">{m.email}</div>}
              {m.phone && <div>{m.phone}</div>}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StatusPill({ status }: { status: "active" | "inactive" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
        status === "active"
          ? "bg-accent-emerald/10 text-accent-emerald"
          : "bg-muted text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "active" ? "bg-accent-emerald" : "bg-muted-foreground/50",
        )}
      />
      {status === "active" ? "Active" : "Inactive"}
    </span>
  );
}

function RowActions({
  m,
  onEdit,
  onToggleStatus,
  onResend,
  onCancel,
  busy,
}: {
  m: StaffMember;
  onEdit: () => void;
  onToggleStatus: () => void;
  onResend: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const pending = m.invite_status === "pending" || m.invite_status === "expired";
  const isManagerRole = m.roles.includes("manager");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={busy}
          aria-label={`Actions for ${m.full_name}`}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onEdit}>
          <Pencil className="size-4" /> Edit
        </DropdownMenuItem>
        {pending && (
          <>
            <DropdownMenuItem onClick={onResend}>
              <RefreshCcw className="size-4" /> Resend invite
            </DropdownMenuItem>
            {!isManagerRole && (
              <DropdownMenuItem onClick={onCancel} className="text-destructive focus:text-destructive">
                <X className="size-4" /> Cancel invite
              </DropdownMenuItem>
            )}
          </>
        )}
        {!isManagerRole && !pending && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onToggleStatus}>
              {m.status === "active" ? (
                <>
                  <PowerOff className="size-4" /> Deactivate
                </>
              ) : (
                <>
                  <Power className="size-4" /> Activate
                </>
              )}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ---------------------------- Empty states ---------------------------- */

function EmptyDirectory({ isManager, onAdd }: { isManager: boolean; onAdd: () => void }) {
  return (
    <Card className="border-dashed border-border/70 shadow-none">
      <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
        <span className="grid size-14 place-items-center rounded-2xl bg-brand/10 text-brand">
          <Users className="size-6" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">No employees have been added yet.</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Add your team members to build the Staff Directory. Everything else — scheduling,
            attendance, and reports — starts here.
          </p>
        </div>
        {isManager && (
          <Button onClick={onAdd}>
            <UserPlus className="mr-1 size-4" /> Add first employee
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function NoResults({ onReset }: { onReset: () => void }) {
  return (
    <Card className="border-dashed border-border/70 shadow-none">
      <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="grid size-12 place-items-center rounded-xl bg-muted text-muted-foreground">
          <Search className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium">No employees match your filters.</p>
          <p className="text-sm text-muted-foreground">
            Try adjusting your search or clear all filters to see everyone.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onReset}>
          Reset filters
        </Button>
      </CardContent>
    </Card>
  );
}
