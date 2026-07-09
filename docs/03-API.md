# API / Server Function Reference

**Product:** Staff Harmony Hub
**Document Version:** 1.0
**Status:** Prototype
**Companion To:** `docs/01-PRD.md`, `docs/02-TRD.md`

---

## 1. Overview

Staff Harmony Hub does not expose a public REST API. All app-internal server logic is delivered as **typed RPC** using TanStack Start's `createServerFn` from `@tanstack/react-start`. The client invokes each function through the generated stub (either directly in a route loader or via `useServerFn` in components); the transport is TanStack's internal serialized RPC over HTTP.

### 1.1 Conventions

- **Location:** `src/lib/<domain>/<domain>.functions.ts`.
- **Method:** `GET` for reads, `POST` for writes.
- **Authorization:** every function (except the two bootstrap endpoints) uses `.middleware([requireSupabaseAuth])`, which validates the bearer token and injects `{ supabase, userId, claims }` on `context`.
- **Validation:** every function that accepts input runs a Zod schema in `.inputValidator()` before the handler executes.
- **Errors:** handlers throw `Error("<message>")` on failure; the client surfaces them via `sonner` toasts and TanStack Query error states.
- **Manager-only** operations re-check the role inside the handler with `has_role(userId, 'manager')` (via RPC or a follow-up SELECT on `user_roles`) before running privileged work.
- **Privileged writes** (creating/deleting Auth users, banning accounts) dynamically import `supabaseAdmin` from `@/integrations/supabase/client.server` inside the handler.

### 1.2 Calling Pattern

```ts
// In a loader
loader: ({ context }) => context.queryClient.ensureQueryData(staffListOptions),

// In a component
const invite = useServerFn(inviteStaff);
await invite({ data: { email, full_name, role, primary_position_id } });
```

### 1.3 Authorization Legend

| Symbol | Meaning |
|--------|---------|
| `PUBLIC` | No auth required. |
| `AUTH` | Any signed-in user. |
| `MANAGER` | Signed-in user with `manager` role. |

---

## 2. Auth / Bootstrap

Module: `src/lib/auth/bootstrap.functions.ts`

### 2.1 `checkBootstrapNeeded`
- **Method:** `GET` · **Auth:** `PUBLIC`
- **Input:** none
- **Returns:** `{ needed: boolean }` — `true` when no manager exists.
- **Uses:** RPC `any_manager_exists()`.

### 2.2 `bootstrapManager`
- **Method:** `POST` · **Auth:** `PUBLIC` (available only while `needed === true`)
- **Input:**
  ```ts
  { email: string; password: string (min 8); full_name: string }
  ```
- **Behavior:** Creates the first Auth user via `supabaseAdmin`, inserts a `profiles` row, and assigns the `manager` role in `user_roles`. Rejects if a manager already exists.
- **Returns:** `{ ok: true }`

---

## 3. Staff Directory

Module: `src/lib/staff/staff.functions.ts`

### 3.1 `listStaff`
- **Method:** `GET` · **Auth:** `AUTH`
- **Input:** none
- **Returns:** `StaffMember[]` — profiles joined with positions, roles, and computed `invite_status` (`accepted | pending | expired | none`).

### 3.2 `getStaffMember`
- **Method:** `GET` · **Auth:** `AUTH`
- **Input:** `{ userId: string (uuid) }`
- **Returns:** Single `StaffMember` or throws `not found`.

### 3.3 `listPositions`
- **Method:** `GET` · **Auth:** `AUTH`
- **Input:** none
- **Returns:** `Position[]` ordered by `sort_order`.

### 3.4 `inviteStaff`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:**
  ```ts
  {
    email: string;
    full_name: string;
    phone?: string;
    role: 'manager' | 'shift_lead' | 'staff';
    primary_position_id?: string (uuid);
    secondary_position_ids?: string[];
    max_hours_per_week?: number;
  }
  ```
- **Behavior:** Uses `supabaseAdmin.auth.admin.inviteUserByEmail` to provision the account, seeds the `profiles` row (auto `employee_code`), assigns the role in `user_roles`, and records `invited_at` + `invite_expires_at` (7 days).
- **Returns:** `{ id: string; employee_code: string }`
- **Errors:** duplicate email; duplicate phone; unknown position.

### 3.5 `updateStaff`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ id: string; ...partial profile fields; availability?: Availability; notes? }`
- **Behavior:** Validates unique phone; normalizes availability to the shift-array shape; updates `profiles`.
- **Returns:** `{ ok: true }`

### 3.6 `setStaffStatus`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ id: string; status: 'active' | 'inactive' }`
- **Behavior:** Updates `profiles.status`. On `inactive`, sets Auth `banned_until` far in the future; on `active`, clears it.
- **Returns:** `{ ok: true }`

### 3.7 `resendInvite`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ userId: string }`
- **Behavior:** Re-issues the Auth invite email and refreshes `invited_at` / `invite_expires_at`.
- **Returns:** `{ ok: true }`

### 3.8 `cancelInvite`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ userId: string }`
- **Behavior:** Deletes a pending Auth user and the corresponding `profiles` row (and any `user_roles`). Rejects if the invite has already been accepted.
- **Returns:** `{ ok: true }`

---

## 4. Schedule

Module: `src/lib/schedule/schedule.functions.ts`

### 4.1 `listShifts`
- **Method:** `GET` · **Auth:** `AUTH`
- **Input:** `{ week_start: string (YYYY-MM-DD, Monday) }`
- **Returns:** Shifts within the 7-day window, joined with employee name and position name.

### 4.2 `createShift`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:**
  ```ts
  {
    employee_id: string;
    position_id?: string;
    work_date: string;    // YYYY-MM-DD
    start_time: string;   // HH:mm
    end_time: string;     // HH:mm
    break_minutes?: number;
    notes?: string;
  }
  ```
- **Validation:** `start_time < end_time`; employee and position must exist.
- **Returns:** `{ id: string }`

### 4.3 `updateShift`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ id: string; ...partial shift fields }`
- **Returns:** `{ ok: true }`

### 4.4 `deleteShift`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ id: string }`
- **Returns:** `{ ok: true }`

### 4.5 `getWeekStatus` *(reserved)*
- **Method:** `GET` · **Auth:** `AUTH`
- **Input:** `{ week_start: string }`
- **Returns:** `{ status: 'draft' | 'published'; published_at?: string; published_by?: string }`
- **Status:** Present at the API level; the current UI does not gate on it.

### 4.6 `publishWeek` / `unpublishWeek` *(reserved)*
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ week_start: string }`
- **Behavior:** Upserts `schedule_weeks.status`. Not wired into the prototype UI.

---

## 5. Attendance

Module: `src/lib/attendance/attendance.functions.ts`

### 5.1 `listAttendance`
- **Method:** `GET` · **Auth:** `AUTH`
- **Input:** `{ from: string (YYYY-MM-DD); to: string (YYYY-MM-DD) }`
- **Returns:** Attendance rows in range, joined with employee name.

### 5.2 `clockIn`
- **Method:** `POST` · **Auth:** `AUTH` (managers can clock in any staff; staff clock in themselves)
- **Input:** `{ employee_id?: string }` — defaults to `context.userId`.
- **Behavior:** Rejects if an open session (no `clock_out_at`) already exists for that employee today; otherwise inserts a row with `work_date = today`, `clock_in_at = now()`.
- **Returns:** `{ id: string }`

### 5.3 `clockOut`
- **Method:** `POST` · **Auth:** `AUTH` (self, or `MANAGER` for others)
- **Input:** `{ id: string }` — the attendance row id.
- **Behavior:** Sets `clock_out_at = now()`; rejects if the session is already closed.
- **Returns:** `{ ok: true }`

### 5.4 `deleteAttendance`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ id: string }`
- **Returns:** `{ ok: true }`

---

## 6. Announcements

Module: `src/lib/announcements/announcements.functions.ts`

### 6.1 `listAnnouncements`
- **Method:** `GET` · **Auth:** `AUTH`
- **Input:** none
- **Returns:** All announcements, newest first, with `created_by` name resolved.

### 6.2 `createAnnouncement`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ title: string (1–120); description?: string; event_date?: string (YYYY-MM-DD) }`
- **Returns:** `{ id: string }`

### 6.3 `updateAnnouncement`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ id: string; title?; description?; event_date? }`
- **Returns:** `{ ok: true }`

### 6.4 `deleteAnnouncement`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ id: string }`
- **Returns:** `{ ok: true }`

---

## 7. Shift Reassignment

Module: `src/lib/swaps/reassign.functions.ts`

### 7.1 `reassignShift`
- **Method:** `POST` · **Auth:** `MANAGER`
- **Input:** `{ shift_id: string; new_employee_id: string }`
- **Behavior:** Updates the shift's `employee_id`. Validates both the shift and the new employee exist and are active.
- **Returns:** `{ ok: true }`

---

## 8. Shift Swap Requests *(reserved for Staff Portal)*

Module: `src/lib/swaps/swaps.functions.ts`

Defined at the API level for a future staff-initiated swap workflow. The current prototype UI does not surface these functions — managers use direct reassignment (Section 7) instead.

| Function | Method | Auth | Input | Purpose |
|----------|--------|------|-------|---------|
| `listSwapRequests` | GET | AUTH | — | List all swap requests with joined shift + employees. |
| `createSwapRequest` | POST | AUTH | `{ shift_id, to_employee_id, reason? }` | Propose a swap. |
| `decideSwapRequest` | POST | MANAGER | `{ id, decision: 'approved'\|'rejected', notes? }` | Approve/reject; on approve, reassigns the shift. |
| `cancelSwapRequest` | POST | AUTH (proposer or MANAGER) | `{ id }` | Cancel a pending request. |

---

## 9. Shared Types

Selected types re-exported from `src/features/*/types.ts`:

```ts
type AppRole = "manager" | "shift_lead" | "staff";
type StaffStatus = "active" | "inactive";
type InviteStatus = "accepted" | "pending" | "expired" | "none";
type ShiftKey = "morning" | "afternoon" | "evening";
type Availability = Partial<Record<WeekdayKey, ShiftKey[]>>;

interface StaffMember {
  id: string;
  employee_code: string | null;
  full_name: string;
  phone: string | null;
  primary_position_id: string | null;
  primary_position_name: string | null;
  secondary_position_ids: string[];
  secondary_position_names: string[];
  availability: Availability;
  max_hours_per_week: number | null;
  notes: string | null;
  status: StaffStatus;
  roles: AppRole[];
  email: string | null;
  invite_status: InviteStatus;
  invited_at: string | null;
  invite_expires_at: string | null;
  created_at: string;
}
```

---

## 10. Error Model

All handlers throw plain `Error` instances. Common categories:

| Category | Example message | HTTP surface |
|----------|-----------------|--------------|
| Unauthorized | `Unauthorized` (from middleware) | 401 |
| Forbidden (role) | `Manager role required` | Thrown as Error → surfaced as toast |
| Validation | Zod-formatted issue list | Thrown before handler runs |
| Uniqueness | `Phone number already in use`, `Email already invited` | Toast |
| Not found | `Staff member not found`, `Shift not found` | Toast |
| Conflict | `Already clocked in`, `Session already closed` | Toast |

Clients should treat any thrown error as user-visible and log the raw error to the console for diagnostics. Never render provider-specific errors verbatim in production copy.

---

## 11. Rate Limits, Idempotency, Versioning

- **Rate limits:** none applied at the application layer in the prototype; the edge runtime and Supabase provide baseline protection.
- **Idempotency:** writes are not idempotent by design (create endpoints return fresh IDs). Clients disable submit buttons during in-flight mutations.
- **Versioning:** the RPC surface is not versioned. Breaking changes to a function require a coordinated client + server deployment.

---

## 12. Testing & Debugging

- **Manual invocation:** use the platform's server-function invocation tool to hit a function with a JSON payload and inspect the response.
- **Logs:** server-function stdout/stderr is captured in the platform log viewer (published or preview).
- **Type checking:** `tsgo` (project script) enforces the input/output contract across client call sites.

---

**End of Document.** Next in the documentation sprint: `docs/04-DATABASE.md` (Data Model & RLS Reference).
