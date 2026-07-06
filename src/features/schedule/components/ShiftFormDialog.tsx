import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
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
import {
  createShift,
  deleteShift,
  updateShift,
} from "@/lib/schedule/schedule.functions";
import type { Position, StaffMember } from "@/features/staff/types";
import type { Shift } from "@/features/schedule/types";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const schema = z.object({
  employeeId: z.string().uuid("Select an employee"),
  workDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a day"),
  startTime: z.string().regex(timeRegex, "Required"),
  endTime: z.string().regex(timeRegex, "Required"),
  positionId: z.string().uuid().nullable(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workDate: string;
  weekDays: { iso: string; label: string }[];
  employees: StaffMember[];
  positions: Position[];
  shift?: Shift | null;
  presetEmployeeId?: string | null;
  weekKey: [string, string];
}

export function ShiftFormDialog({
  open,
  onOpenChange,
  workDate,
  weekDays,
  employees,
  positions,
  shift,
  presetEmployeeId,
  weekKey,
}: Props) {
  const queryClient = useQueryClient();
  const isEdit = !!shift;

  const defaultEmployee = shift?.employee_id ?? presetEmployeeId ?? "";
  const defaultEmployeeObj = employees.find((e) => e.id === defaultEmployee);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      employeeId: defaultEmployee,
      workDate,
      startTime: shift?.start_time ?? "16:00",
      endTime: shift?.end_time ?? "22:00",
      positionId:
        shift?.position_id ?? defaultEmployeeObj?.primary_position_id ?? null,
    },
  });

  useEffect(() => {
    if (!open) return;
    const emp = shift?.employee_id ?? presetEmployeeId ?? "";
    const empObj = employees.find((e) => e.id === emp);
    form.reset({
      employeeId: emp,
      workDate,
      startTime: shift?.start_time ?? "16:00",
      endTime: shift?.end_time ?? "22:00",
      positionId:
        shift?.position_id ?? empObj?.primary_position_id ?? null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shift?.id, workDate, presetEmployeeId]);

  const createFn = useServerFn(createShift);
  const updateFn = useServerFn(updateShift);
  const deleteFn = useServerFn(deleteShift);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["shifts", weekKey[0], weekKey[1]] });

  const saveM = useMutation({
    mutationFn: async (values: FormValues) => {
      const payload = { ...values, breakMinutes: 0, notes: null };
      if (isEdit && shift) {
        return updateFn({ data: { id: shift.id, ...payload } });
      }
      return createFn({ data: payload });
    },
    onSuccess: () => {
      toast.success(isEdit ? "Shift updated" : "Shift added");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Something went wrong"),
  });

  const deleteM = useMutation({
    mutationFn: async () => {
      if (!shift) return;
      return deleteFn({ data: { id: shift.id } });
    },
    onSuccess: () => {
      toast.success("Shift deleted");
      invalidate();
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to delete"),
  });

  const activeEmployees = employees.filter((e) => e.status === "active");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit shift" : "Add shift"}</DialogTitle>
          <DialogDescription>
            Fill in the basics — employee, day, times, and position.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => saveM.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="employeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Employee</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v);
                      const emp = employees.find((e) => e.id === v);
                      if (emp?.primary_position_id && !form.getValues("positionId")) {
                        form.setValue("positionId", emp.primary_position_id);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {activeEmployees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.full_name}
                          {e.primary_position_name
                            ? ` · ${e.primary_position_name}`
                            : ""}
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
              name="workDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Day</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select day" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {weekDays.map((d) => (
                        <SelectItem key={d.iso} value={d.iso}>
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="positionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Position</FormLabel>
                  <Select
                    value={field.value ?? "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? null : v)}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No position</SelectItem>
                      {positions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:justify-between">
              <div>
                {isEdit && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button type="button" variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this shift?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This removes the shift from the schedule.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteM.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saveM.isPending}>
                  {saveM.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {isEdit ? "Save" : "Add shift"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
