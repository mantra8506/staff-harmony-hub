import { queryOptions } from "@tanstack/react-query";
import { getWeekStatus, listShifts } from "@/lib/schedule/schedule.functions";
import { listSwapRequests } from "@/lib/swaps/swaps.functions";

export const shiftsQueryOptions = (weekStart: string, weekEnd: string) =>
  queryOptions({
    queryKey: ["shifts", weekStart, weekEnd],
    queryFn: () => listShifts({ data: { weekStart, weekEnd } }),
  });

export const weekStatusQueryOptions = (weekStart: string) =>
  queryOptions({
    queryKey: ["schedule-week", weekStart],
    queryFn: () => getWeekStatus({ data: { weekStart } }),
  });

export const swapRequestsQueryOptions = queryOptions({
  queryKey: ["swap-requests"],
  queryFn: () => listSwapRequests(),
});
