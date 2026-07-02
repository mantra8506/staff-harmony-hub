import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { cn } from "@/lib/utils";
import { inviteStaff, updateStaff } from "@/lib/staff/staff.functions";
import { staffQueryOptions } from "@/features/staff/queries";
import {
  SHIFTS,
  WEEKDAYS,
  type Position,
  type ShiftKey,
  type StaffMember,
  type WeekdayKey,
} from "@/features/staff/types";

const shiftEnum = z.enum(["morning", "afternoon", "evening"]);
const availabilityShape = z.record(
  z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
  z.array(shiftEnum),
);

const step1Schema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s\-().]{5,29}$/, "Enter a valid phone number"),
});

const step2Schema = z.object({
  primaryPositionId: z.string().uuid("Select a primary position"),
  secondaryPositionIds: z.array(z.string().uuid()).default([]),
});

const step3Schema = z.object({
  availability: availabilityShape.default({}),
  maxHoursPerWeek: z
    .union([z.string(), z.number()])
    .transform((v) => (v === "" || v == null ? null : Number(v)))
    .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v <= 168), {
      message: "Enter a value from 0 to 168",
    })
    .nullable(),
  notes: z.string().trim().max(2000).optional().default(""),
  status: z.enum(["active", "inactive"]).default("active"),
});

const formSchema = step1Schema.merge(step2Schema).merge(step3Schema);

type FormValues = z.input<typeof formSchema>;

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  0: ["fullName", "email", "phone"],
  1: ["primaryPositionId", "secondaryPositionIds"],
  2: ["availability", "maxHoursPerWeek", "notes", "status"],
  3: [],
};

const STEP_TITLES = [
  { title: "Personal information", body: "Basic contact details for this employee." },
  { title: "Job information", body: "Assign a primary role and any cross-trained positions." },
  { title: "Availability", body: "When can they work each week?" },
  { title: "Review", body: "Double-check the details before saving." },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  positions: Position[];
  member?: StaffMember | null;
}

export function StaffFormDialog({ open, onOpenChange, positions, member }: Props) {
  const isEdit = !!member;
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);

  const defaults = useMemo<FormValues>(
    () => ({
      fullName: member?.full_name ?? "",
      email: member?.email ?? "",
      phone: member?.phone ?? "",
      primaryPositionId: member?.primary_position_id ?? "",
      secondaryPositionIds: member?.secondary_position_ids ?? [],
      availability: (member?.availability as Record<WeekdayKey, ShiftKey[]>) ?? {},
      maxHoursPerWeek: member?.max_hours_per_week ?? null,
      notes: member?.notes ?? "",
      status: member?.status ?? "active",
    }),
    [member],
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema) as any,
    defaultValues: defaults,
    mode: "onBlur",
  });

  useEffect(() => {
    if (open) {
      form.reset(defaults);
      setStep(0);
    }
  }, [open, defaults, form]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: staffQueryOptions.queryKey });
    if (member?.id) queryClient.invalidateQueries({ queryKey: ["staff", member.id] });
  };

  const inviteMutation = useMutation({
    mutationFn: (values: any) => inviteStaff({ data: values }),
    onSuccess: () => {
      toast.success("Invitation sent. They'll receive an email when notifications are enabled.");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: (values: any) => updateStaff({ data: values }),
    onSuccess: () => {
      toast.success("Employee updated.");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const submitting = inviteMutation.isPending || updateMutation.isPending;

  const submit = () => {
    const raw = form.getValues();
    const parsed = formSchema.parse(raw);
    const cleanedAvailability: Record<string, ShiftKey[]> = {};
    for (const d of WEEKDAYS) {
      const list = (parsed.availability as any)?.[d.key];
      if (Array.isArray(list) && list.length > 0) cleanedAvailability[d.key] = list;
    }

    const payload = {
      fullName: parsed.fullName,
      phone: parsed.phone,
      primaryPositionId: parsed.primaryPositionId,
      secondaryPositionIds: (parsed.secondaryPositionIds ?? []).filter(
        (id) => id !== parsed.primaryPositionId,
      ),
      availability: cleanedAvailability,
      maxHoursPerWeek: parsed.maxHoursPerWeek,
      notes: parsed.notes ? parsed.notes : null,
      status: parsed.status,
    };

    if (isEdit) updateMutation.mutate({ userId: member!.id, ...payload });
    else inviteMutation.mutate({ email: parsed.email, ...payload });
  };

  const next = async () => {
    const fields = STEP_FIELDS[step];
    const valid = await form.trigger(fields as any, { shouldFocus: true });
    if (!valid) return;
    setStep((s) => Math.min(s + 1, 3));
  };

  const primaryId = form.watch("primaryPositionId");
  const secondary = form.watch("secondaryPositionIds") ?? [];
  const availability = form.watch("availability") ?? {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader className="space-y-2">
          <DialogTitle>{isEdit ? "Edit employee" : "Add employee"}</DialogTitle>
          <DialogDescription>{STEP_TITLES[step].body}</DialogDescription>
        </DialogHeader>

        <Stepper current={step} />

        <Form {...form}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 3) submit();
              else void next();
            }}
            className="space-y-6"
          >
            {step === 0 && <Step1 form={form} isEdit={isEdit} />}
            {step === 1 && (
              <Step2
                form={form}
                positions={positions}
                primaryId={primaryId}
                secondary={secondary}
              />
            )}
            {step === 2 && <Step3 form={form} isEdit={isEdit} />}
            {step === 3 && (
              <ReviewStep
                values={form.getValues()}
                positions={positions}
                availability={availability as any}
                isEdit={isEdit}
              />
            )}

            <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
              <div>
                {step > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={submitting}
                  >
                    <ChevronLeft className="mr-1 size-4" /> Back
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                {step < 3 ? (
                  <Button type="submit">
                    Continue <ChevronRight className="ml-1 size-4" />
                  </Button>
                ) : (
                  <Button type="submit" disabled={submitting}>
                    {submitting && <Loader2 className="mr-1 size-4 animate-spin" />}
                    {isEdit ? "Save changes" : "Send invitation"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* --------------------------- Stepper --------------------------- */

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEP_TITLES.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.title} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                done && "border-brand bg-brand text-brand-foreground",
                active && "border-brand text-brand",
                !done && !active && "border-border text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-3.5" /> : i + 1}
            </span>
            <span
              className={cn(
                "hidden truncate text-xs font-medium sm:inline",
                active ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {s.title}
            </span>
            {i < STEP_TITLES.length - 1 && (
              <span
                className={cn(
                  "h-px flex-1",
                  done ? "bg-brand/60" : "bg-border",
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/* --------------------------- Steps --------------------------- */

function Step1({ form, isEdit }: { form: any; isEdit: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full name *</FormLabel>
            <FormControl>
              <Input autoComplete="name" placeholder="e.g. Priya Sharma" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email *</FormLabel>
            <FormControl>
              <Input
                type="email"
                autoComplete="email"
                placeholder="priya@example.com"
                disabled={isEdit}
                {...field}
              />
            </FormControl>
            {isEdit && (
              <FormDescription>
                Email is used for sign-in and can't be changed here.
              </FormDescription>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Phone number *</FormLabel>
            <FormControl>
              <Input type="tel" autoComplete="tel" placeholder="+1 555 123 4567" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

function Step2({
  form,
  positions,
  primaryId,
  secondary,
}: {
  form: any;
  positions: Position[];
  primaryId: string;
  secondary: string[];
}) {
  return (
    <div className="grid grid-cols-1 gap-5">
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
                    {p.name}{" "}
                    <span className="text-muted-foreground">· {p.department}</span>
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
        render={({ field }) => (
          <FormItem>
            <FormLabel>Secondary positions</FormLabel>
            <FormDescription>Other roles this employee is trained for.</FormDescription>
            <div className="grid grid-cols-1 gap-2 rounded-lg border border-border p-3 sm:grid-cols-2">
              {positions.filter((p) => p.id !== primaryId).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Pick a primary position first.
                </p>
              )}
              {positions
                .filter((p) => p.id !== primaryId)
                .map((p) => {
                  const checked = secondary.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(v) => {
                          const next = new Set(secondary);
                          if (v) next.add(p.id);
                          else next.delete(p.id);
                          field.onChange(Array.from(next));
                        }}
                      />
                      <span className="truncate">
                        {p.name}
                        <span className="text-muted-foreground"> · {p.department}</span>
                      </span>
                    </label>
                  );
                })}
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}

function Step3({ form, isEdit }: { form: any; isEdit: boolean }) {
  const availability: Record<string, ShiftKey[]> = form.watch("availability") ?? {};

  const toggle = (day: WeekdayKey, shift: ShiftKey) => {
    const current = new Set(availability[day] ?? []);
    if (current.has(shift)) current.delete(shift);
    else current.add(shift);
    form.setValue(
      `availability.${day}` as const,
      Array.from(current) as ShiftKey[],
      { shouldDirty: true },
    );
  };

  const setUnavailable = (day: WeekdayKey) => {
    form.setValue(`availability.${day}` as const, [] as ShiftKey[], {
      shouldDirty: true,
    });
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <p className="text-sm font-medium">Weekly availability</p>
        <p className="text-xs text-muted-foreground">
          Tap the shifts they can work. Leave a day empty to mark it as unavailable.
        </p>
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {WEEKDAYS.map((d) => {
            const dayShifts = availability[d.key] ?? [];
            const unavailable = dayShifts.length === 0;
            return (
              <div
                key={d.key}
                className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <div className="w-24 shrink-0 text-sm font-medium">{d.long}</div>
                <div className="flex flex-wrap gap-2">
                  {SHIFTS.map((s) => {
                    const on = dayShifts.includes(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggle(d.key, s.key)}
                        className={cn(
                          "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                          on
                            ? "border-brand bg-brand text-brand-foreground"
                            : "border-border bg-background text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setUnavailable(d.key)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      unavailable
                        ? "border-border bg-muted text-foreground"
                        : "border-border bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    Unavailable
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FormField
        control={form.control}
        name="maxHoursPerWeek"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Maximum hours per week</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                max={168}
                inputMode="numeric"
                placeholder="e.g. 40"
                value={field.value ?? ""}
                onChange={(e) =>
                  field.onChange(e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </FormControl>
            <FormDescription>Leave blank if there's no cap.</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="notes"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Manager notes</FormLabel>
            <FormControl>
              <Textarea
                rows={3}
                placeholder="Internal notes — only visible to managers."
                {...field}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {isEdit && (
        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employment status</FormLabel>
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
    </div>
  );
}

function ReviewStep({
  values,
  positions,
  availability,
  isEdit,
}: {
  values: FormValues;
  positions: Position[];
  availability: Record<string, ShiftKey[]>;
  isEdit: boolean;
}) {
  const primary = positions.find((p) => p.id === values.primaryPositionId);
  const secondaries = (values.secondaryPositionIds ?? [])
    .map((id) => positions.find((p) => p.id === id)?.name)
    .filter(Boolean) as string[];

  return (
    <div className="space-y-4">
      <ReviewSection title="Personal information">
        <ReviewRow label="Full name" value={values.fullName || "—"} />
        <ReviewRow label="Email" value={values.email || "—"} />
        <ReviewRow label="Phone" value={values.phone || "—"} />
      </ReviewSection>

      <ReviewSection title="Job information">
        <ReviewRow label="Primary position" value={primary?.name ?? "—"} />
        <ReviewRow
          label="Secondary positions"
          value={secondaries.length > 0 ? secondaries.join(", ") : "None"}
        />
      </ReviewSection>

      <ReviewSection title="Availability">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {WEEKDAYS.map((d) => {
            const shifts = availability?.[d.key] ?? [];
            return (
              <div key={d.key} className="flex items-baseline gap-2 text-sm">
                <span className="w-20 shrink-0 text-muted-foreground">{d.long}</span>
                <span className="font-medium">
                  {shifts.length === 0
                    ? "Unavailable"
                    : shifts
                        .map((s) => SHIFTS.find((x) => x.key === s)?.label ?? s)
                        .join(", ")}
                </span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          <ReviewRow
            label="Max hours / week"
            value={values.maxHoursPerWeek != null ? String(values.maxHoursPerWeek) : "No cap"}
          />
          {isEdit && (
            <ReviewRow
              label="Status"
              value={values.status === "active" ? "Active" : "Inactive"}
            />
          )}
        </div>
        {values.notes && (
          <div className="mt-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Manager notes
            </p>
            <p className="mt-1 whitespace-pre-wrap rounded-md border border-border bg-muted/30 p-3 text-sm">
              {values.notes}
            </p>
          </div>
        )}
      </ReviewSection>

      {!isEdit && (
        <p className="rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          We'll create the invitation record now. The employee will get an email as soon
          as email delivery is enabled in Settings.
        </p>
      )}
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </section>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-sm">
      <span className="w-32 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
