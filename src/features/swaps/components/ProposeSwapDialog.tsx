import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, ArrowLeftRight } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
import { createSwapRequest } from "@/lib/swaps/swaps.functions";
import type { StaffMember } from "@/features/staff/types";
import type { Shift } from "@/features/schedule/types";
import { formatTime } from "@/features/schedule/types";

const schema = z.object({
  toEmployeeId: z.string().uuid("Select an employee"),
  reason: z.string().trim().max(500).nullable(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  shift: Shift;
  employees: StaffMember[];
  trigger?: React.ReactNode;
  onDone?: () => void;
}

export function ProposeSwapDialog({ shift, employees, trigger, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const submit = useServerFn(createSwapRequest);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { toEmployeeId: "", reason: null },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      submit({
        data: {
          shiftId: shift.id,
          toEmployeeId: values.toEmployeeId,
          reason: values.reason,
        },
      }),
    onSuccess: () => {
      toast.success("Swap request submitted");
      queryClient.invalidateQueries({ queryKey: ["swap-requests"] });
      setOpen(false);
      form.reset({ toEmployeeId: "", reason: null });
      onDone?.();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to propose swap"),
  });

  const candidates = employees.filter(
    (e) => e.status === "active" && e.id !== shift.employee_id,
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="button" variant="outline" size="sm">
            <ArrowLeftRight className="h-4 w-4" />
            Propose swap
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Propose shift swap</DialogTitle>
          <DialogDescription>
            {shift.employee_name} · {shift.position_name ?? "No position"} ·{" "}
            {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((v) => mutation.mutate(v))}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="toEmployeeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reassign to</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {candidates.map((e) => (
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
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      value={field.value ?? ""}
                      onChange={(e) => field.onChange(e.target.value || null)}
                      placeholder="Why is this swap being proposed?"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Submit request
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
