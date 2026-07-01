import { queryOptions } from "@tanstack/react-query";
import { getStaffMember, listPositions, listStaff } from "@/lib/staff/staff.functions";

export const staffQueryOptions = queryOptions({
  queryKey: ["staff"],
  queryFn: () => listStaff(),
});

export const positionsQueryOptions = queryOptions({
  queryKey: ["positions"],
  queryFn: () => listPositions(),
});

export const staffMemberQueryOptions = (userId: string) =>
  queryOptions({
    queryKey: ["staff", userId],
    queryFn: () => getStaffMember({ data: { userId } }),
  });
