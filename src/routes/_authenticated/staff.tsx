import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/alert-dialog";
import {
  positionsQueryOptions,
  staffQueryOptions,
} from "@/features/staff/queries";
import { StaffFormDialog } from "@/features/staff/components/StaffFormDialog";
import { removeStaff } from "@/lib/staff/staff.functions";
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
});

function StaffPage() {
  const { roles } = useCurrentUser();
  const isManager = roles.includes("manager");
  const queryClient = useQueryClient();
  const staff = useSuspenseQuery(staffQueryOptions);
  const positions = useSuspenseQuery(positionsQueryOptions);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [removing, setRemoving] = useState<StaffMember | null>(null);

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeStaff({ data: { userId } }),
    onSuccess: () => {
      toast.success("Staff member removed.");
      queryClient.invalidateQueries({ queryKey: staffQueryOptions.queryKey });
      setRemoving(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Staff</h1>
          <p className="text-sm text-muted-foreground">
            {staff.data.length} {staff.data.length === 1 ? "person" : "people"} on the team
          </p>
        </div>
        {isManager && (
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 size-4" /> Invite
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {staff.data.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No staff yet. {isManager ? "Invite your first team member." : ""}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {staff.data.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.full_name}</span>
                    {m.roles.includes("manager") && (
                      <Badge variant="secondary" className="text-xs">
                        Manager
                      </Badge>
                    )}
                    {m.pending_invite && (
                      <Badge variant="outline" className="text-xs">
                        <Mail className="mr-1 size-3" /> Pending
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">
                    {m.position_name ?? "No position"}
                    {m.phone ? ` · ${m.phone}` : ""}
                    {m.email ? ` · ${m.email}` : ""}
                  </div>
                </div>
                {isManager && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditing(m);
                        setDialogOpen(true);
                      }}
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    {!m.roles.includes("manager") && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setRemoving(m)}
                        aria-label="Remove"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <StaffFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        positions={positions.data}
        member={editing}
      />

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removing?.full_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete their account and access. You can re-invite them
              later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removing && removeMutation.mutate(removing.id)}
              disabled={removeMutation.isPending}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
