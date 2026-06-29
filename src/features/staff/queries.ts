import { queryOptions } from "@tanstack/react-query";
import { listPositions, listStaff } from "@/lib/staff/staff.functions";

export const staffQueryOptions = queryOptions({
  queryKey: ["staff"],
  queryFn: () => listStaff(),
});

export const positionsQueryOptions = queryOptions({
  queryKey: ["positions"],
  queryFn: () => listPositions(),
});
