import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { inviteStaff, updateStaff } from "@/lib/staff/staff.functions";
import { staffQueryOptions } from "@/features/staff/queries";
import {
  WEEKDAYS,
  type Position,
  type StaffMember,
  type WeekdayKey,
} from "@/features/staff/types";

const formSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s\-().]{5,29}$/, "Enter a valid phone number"),
  primaryPositionId: z.string().uuid("Select a primary position"),
  secondaryPositionIds: z.array(z.string().uuid()).default([]),
  availability: z.record(z.string(), z.boolean()).default({}),
  maxHoursPerWeek: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" || v == null ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 168), {
      message: "Enter 0 to 168",
    })
    .nullable(),
  notes: z.string().trim().max(2000).optional().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});

type FormValues = z.input<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  positions: Position[];
  member?: StaffMember | null;
}

export function StaffFormDialog({ open, onOpenChange, positions, member }: Props) {
  const isEdit = !!member;
  const queryClient = useQueryClient();

  const defaults = useMemo<FormValues>(
    () => ({
      fullName: member?.full_name ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? "",
      primaryPositionId: member?.primary_position_id ?? "",
      secondaryPositionIds: member?.secondary_position_ids ?? [],
      availability: (member?.availability as Record<string, boolean>) ?? {},
      maxHoursPerWeek: member?.max_hours_per_week ?? null,
      notes: member?.notes ?? "",
      status: member?.status ?? "active",
    }),
    [member],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: defaults,
  });

  useEffect(() => {
    if (open) form.reset(defaults);
  }, [open, defaults, form]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: staffQueryOptions.queryKey });
    if (member?.id) queryClient.invalidateQueries({ queryKey: ["staff", member.id] });
  };

  const inviteMutation = useMutation({
    mutationFn: (values: any) => inviteStaff({ data: values }),
    onSuccess: () => {
      toast.success("Staff invited. Email delivery will activate when notifications are enabled.");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateStaff({ data: values }),
    onSuccess: () => {
      toast.success("Staff member saved.");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitting = inviteMutation.isPending || updateMutation.isPending;

  const onSubmit = (raw: FormValues) => {
    const parsed = formSchema.parse(raw);
    const availability: Record<string, boolean> = {};
    for (const d of WEEKDAYS) if (parsed.availability?.[d.key]) availability[d.key] = true;

    const payload = {
      fullName: parsed.fullName,
      phone: parsed.phone,
      primaryPositionId: parsed.primaryPositionId,
      secondaryPositionIds: (parsed.secondaryPositionIds ?? []).filter(
        (id) => id !== parsed.primaryPositionId,
      ),
      availability,
      maxHoursPerWeek: parsed.maxHoursPerWeek,
      notes: parsed.notes ? parsed.notes : null,
      status: parsed.status,
    };

    if (isEdit) updateMutation.mutate({ userId: member!.id, ...payload });
    else inviteMutation.mutate({ email: parsed.email, ...payload });
  };

  const primaryId = form.watch("primaryPositionId");
  const secondary = form.watch("secondaryPositionIds") ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit staff member" : "Invite staff member"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update details, availability, or status."
              : "They'll receive an invite once email delivery is enabled."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name *</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {!isEdit && (
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email *</FormLabel>
                    <FormControl>
                      <Input type="email" autoComplete="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number *</FormLabel>
                  <FormControl>
                    <Input type="tel" autoComplete="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="primaryPositionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Primary position *</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} <span className="text-muted-foreground">· {p.department}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="secondaryPositionIds"
              render={() => (
                <FormItem>
                  <FormLabel>Secondary positions</FormLabel>
                  <div className="grid grid-cols-2 gap-2 rounded-md border border-border p-3 sm:grid-cols-3">
                    {positions
                      .filter((p) => p.id !== primaryId)
                      .map((p) => {
                        const checked = secondary.includes(p.id);
                        return (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(v) => {
                                const next = v
                                  ? [...secondary, p.id]
                                  : secondary.filter((id) => id !== p.id);
                                form.setValue("secondaryPositionIds", next, {
                                  shouldDirty: true,
                                });
                              }}
                            />
                            <span>{p.name}</span>
                          </label>
                        );
                      })}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="availability"
              render={() => (
                <FormItem>
                  <FormLabel>Weekly availability</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {WEEKDAYS.map((d) => {
                      const current = form.watch(`availability.${d.key}` as const);
                      return (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() =>
                            form.setValue(
                              `availability.${d.key as WeekdayKey}` as const,
                              !current,
                              { shouldDirty: true },
                            )
                          }
                          aria-pressed={!!current}
                          className={`min-w-14 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                            current
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background hover:bg-muted"
                          }`}
                        >
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                  <FormDescription>Days they're available to work.</FormDescription>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxHoursPerWeek"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max hours per week</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={168}
                      inputMode="numeric"
                      value={field.value ?? ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? null : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isEdit && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Inactive staff can't sign in or be scheduled.
                    </FormDescription>
                  </FormItem>
                )}
              />
            )}

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving…" : isEdit ? "Save changes" : "Send invite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
