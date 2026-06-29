import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteStaff, updateStaff } from "@/lib/staff/staff.functions";
import { staffQueryOptions } from "@/features/staff/queries";
import type { Position, StaffMember } from "@/features/staff/types";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  positions: Position[];
  member?: StaffMember | null;
}

export function StaffFormDialog({ open, onOpenChange, positions, member }: Props) {
  const isEdit = !!member;
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [positionId, setPositionId] = useState<string>("");

  useEffect(() => {
    if (open) {
      setFullName(member?.full_name ?? "");
      setEmail(member?.email ?? "");
      setPhone(member?.phone ?? "");
      setPositionId(member?.primary_position_id ?? "");
    }
  }, [open, member]);

  const inviteMutation = useMutation({
    mutationFn: () =>
      inviteStaff({
        data: {
          email,
          fullName,
          phone: phone || undefined,
          primaryPositionId: positionId || undefined,
        },
      }),
    onSuccess: () => {
      toast.success("Invite sent.");
      queryClient.invalidateQueries({ queryKey: staffQueryOptions.queryKey });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: () =>
      updateStaff({
        data: {
          userId: member!.id,
          fullName,
          phone: phone || null,
          primaryPositionId: positionId || null,
        },
      }),
    onSuccess: () => {
      toast.success("Saved.");
      queryClient.invalidateQueries({ queryKey: staffQueryOptions.queryKey });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitting = inviteMutation.isPending || updateMutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isEdit) updateMutation.mutate();
    else inviteMutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit staff member" : "Invite staff member"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          {!isEdit && (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                They'll get an email with a link to set their password.
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="position">Primary position</Label>
            <Select value={positionId} onValueChange={setPositionId}>
              <SelectTrigger id="position">
                <SelectValue placeholder="Select a position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Saving…" : isEdit ? "Save changes" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
