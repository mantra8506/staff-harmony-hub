import { queryOptions } from "@tanstack/react-query";
import {
  getMyProfile,
  listMyAttendance,
  listMyShifts,
} from "@/lib/staff-portal/staff-portal.functions";

export const myShiftsQueryOptions = (weekStart: string, weekEnd: string) =>
  queryOptions({
    queryKey: ["my-shifts", weekStart, weekEnd],
    queryFn: () => listMyShifts({ data: { weekStart, weekEnd } }),
  });

export const myAttendanceQueryOptions = (from: string, to: string) =>
  queryOptions({
    queryKey: ["my-attendance", from, to],
    queryFn: () => listMyAttendance({ data: { from, to } }),
  });

export const myProfileQueryOptions = queryOptions({
  queryKey: ["my-profile"],
  queryFn: () => getMyProfile(),
});
