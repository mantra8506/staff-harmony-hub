import { queryOptions } from "@tanstack/react-query";
import { listAnnouncements } from "@/lib/announcements/announcements.functions";
import { listAttendance } from "@/lib/attendance/attendance.functions";

export const announcementsQueryOptions = queryOptions({
  queryKey: ["announcements"],
  queryFn: () => listAnnouncements(),
});

export const attendanceRangeQueryOptions = (from: string, to: string) =>
  queryOptions({
    queryKey: ["attendance", from, to],
    queryFn: () => listAttendance({ data: { from, to } }),
  });
