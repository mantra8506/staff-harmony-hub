import { queryOptions } from "@tanstack/react-query";
import { listShifts } from "@/lib/schedule/schedule.functions";

export const shiftsQueryOptions = (weekStart: string, weekEnd: string) =>
  queryOptions({
    queryKey: ["shifts", weekStart, weekEnd],
    queryFn: () => listShifts({ data: { weekStart, weekEnd } }),
  });
