# Data Model & RLS Reference

**Product:** Staff Harmony Hub
**Document Version:** 1.0
**Status:** Prototype
**Companion To:** `docs/01-PRD.md`, `docs/02-TRD.md`, `docs/03-API.md`

---

## Table of Contents

- [1. Overview](#1-overview)
- [2. Enumerated Types](#2-enumerated-types)
- [3. Security-Definer Functions](#3-security-definer-functions)
- [4. Tables](#4-tables)
- [5. Relationships (ER Summary)](#5-relationships-er-summary)
- [6. Triggers](#6-triggers)
- [7. `availability` JSON Shape](#7-availability-json-shape)
- [8. Sequences](#8-sequences)
- [9. Security Posture Summary](#9-security-posture-summary)
- [10. Known Gaps & Deferred Work](#10-known-gaps-deferred-work)

---

## 1. Overview

This document describes the Postgres data model backing Staff Harmony Hub and the Row-Level Security (RLS) policies enforced on every application table. It reflects the schema currently deployed in Lovable Cloud (Supabase).

Design principles:

- **Roles live in `user_roles`**, never on `profiles`. This prevents privilege escalation via profile writes.
- **RLS is enabled on every application table.** No table in `public` is reachable without an authenticated session; the `anon` role has no grants on application data.
- **RLS policies delegate role checks to `has_role(...)`** — a `SECURITY DEFINER` function — to avoid recursion when policies read from `user_roles`.
- **Grants are explicit**: every table grants `SELECT, INSERT, UPDATE, DELETE` to `authenticated` and `ALL` to `service_role`. `anon` is never granted.
- **Timestamps** (`created_at`, `updated_at`) are standard on every mutable table; `updated_at` is maintained by the `touch_updated_at()` trigger.

---

## 2. Enumerated Types

| Enum | Values |
|------|--------|
| `app_role` | `manager`, `shift_lead`, `staff` |
| `staff_status` | `active`, `inactive` |
| `schedule_status` | `draft`, `published` *(reserved)* |
| `swap_status` | `pending`, `approved`, `rejected`, `cancelled` *(reserved)* |

---

## 3. Security-Definer Functions

Defined in the `public` schema with `SECURITY DEFINER` and `SET search_path = public`:

### 3.1 `has_role(_user_id uuid, _role app_role) → boolean`
Returns `true` when the given user has the given role in `user_roles`. Used by every RLS policy that guards a manager or supervisor action. `SECURITY DEFINER` prevents recursive RLS evaluation.

### 3.2 `any_manager_exists() → boolean`
Returns `true` when at least one row in `user_roles` has `role = 'manager'`. Backs the `/setup` bootstrap check.

### 3.3 `touch_updated_at() → trigger`
Sets `NEW.updated_at = now()` — attached to every mutable table via a `BEFORE UPDATE` trigger.

### 3.4 `handle_new_user() → trigger`
`AFTER INSERT` on `auth.users`. Reads metadata from the sign-up payload (`full_name`, `phone`, `primary_position_id`, `role`) and inserts matching rows into `profiles` and `user_roles`. Idempotent via `ON CONFLICT DO NOTHING`.

### 3.5 `assign_employee_code() → trigger`
`BEFORE INSERT` on `profiles`. Assigns `employee_code = 'S' || lpad(nextval('employee_code_seq')::text, 3, '0')` when null (e.g. `S001`, `S002`, …).

---

## 4. Tables

### 4.1 `positions`
Canonical restaurant roles (Server, Bartender, Cook, …).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `name` | `text` | required, unique per department |
| `department` | `text` | required |
| `sort_order` | `int` | default `0` |
| `created_at` | `timestamptz` | default `now()` |

**Grants:** `authenticated: SELECT,INSERT,UPDATE,DELETE`; `service_role: ALL`.
**RLS:** enabled.

**Policies:**

| Cmd | Name | Using | With Check |
|-----|------|-------|------------|
| SELECT | Authenticated can view positions | `true` | — |

*(Write access is service-role only in the prototype — seeded via migration.)*

---

### 4.2 `profiles`
One row per staff member; `id` mirrors `auth.users.id`.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | FK-equivalent to `auth.users.id` |
| `employee_code` | `text` | auto (`S001`…); unique |
| `full_name` | `text` | required |
| `phone` | `text` | unique when not null |
| `primary_position_id` | `uuid` | FK → `positions.id` |
| `secondary_position_ids` | `uuid[]` | default `{}` |
| `availability` | `jsonb` | per-weekday shift keys (see §7) |
| `max_hours_per_week` | `int` | nullable |
| `notes` | `text` | nullable |
| `status` | `staff_status` | default `active` |
| `invited_at` | `timestamptz` | nullable |
| `invite_expires_at` | `timestamptz` | nullable |
| `created_at` / `updated_at` | `timestamptz` | defaults `now()` |

**Grants:** `authenticated: SELECT,INSERT,UPDATE,DELETE`; `service_role: ALL`.
**RLS:** enabled.

**Policies:**

| Cmd | Name | Using | With Check |
|-----|------|-------|------------|
| SELECT | Authenticated can view profiles | `true` | — |
| UPDATE | Users can update own profile | `auth.uid() = id` | `auth.uid() = id` |

*(Manager-level updates to arbitrary profiles go through `updateStaff`, which uses the authenticated Supabase client under the manager's session — the update path relies on server-function-level role checks combined with the service-role admin client for privileged flows such as invite/deactivate.)*

---

### 4.3 `user_roles`
Role assignments — the sole source of truth for authorization.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `user_id` | `uuid` | required |
| `role` | `app_role` | required |
| `created_at` | `timestamptz` | default `now()` |
| **Unique** | | `(user_id, role)` |

**Grants:** `authenticated: SELECT`; `service_role: ALL`. *(No client-side write path.)*
**RLS:** enabled.

**Policies:**

| Cmd | Name | Using | With Check |
|-----|------|-------|------------|
| SELECT | Authenticated can view roles | `true` | — |

All writes happen through `supabaseAdmin` inside server functions (invite, bootstrap).

---

### 4.4 `shifts`
Scheduled work assignments.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | default `gen_random_uuid()` |
| `employee_id` | `uuid` | FK → `profiles.id` |
| `position_id` | `uuid` | FK → `positions.id`, nullable |
| `work_date` | `date` | required |
| `start_time` | `time` | required |
| `end_time` | `time` | required |
| `break_minutes` | `int` | default `0` |
| `notes` | `text` | nullable |
| `created_by` | `uuid` | nullable |
| `created_at` / `updated_at` | `timestamptz` | |

**Grants:** `authenticated: SELECT,INSERT,UPDATE,DELETE`; `service_role: ALL`.
**RLS:** enabled.

**Policies:**

| Cmd | Name | Using | With Check |
|-----|------|-------|------------|
| SELECT | Authenticated can view shifts | `true` | — |
| INSERT | Managers can insert shifts | — | `has_role(auth.uid(), 'manager')` |
| UPDATE | Managers can update shifts | `has_role(auth.uid(), 'manager')` | `has_role(auth.uid(), 'manager')` |
| DELETE | Managers can delete shifts | `has_role(auth.uid(), 'manager')` | — |

---

### 4.5 `schedule_weeks` *(reserved)*
Publish/lock metadata per week. Present in the schema; not enforced by prototype UI.

| Column | Type | Notes |
|--------|------|-------|
| `week_start` | `date` PK | Monday |
| `status` | `schedule_status` | default `draft` |
| `published_at` | `timestamptz` | nullable |
| `published_by` | `uuid` | nullable |
| `created_at` / `updated_at` | `timestamptz` | |

**Policies:** SELECT for all authenticated; INSERT/UPDATE/DELETE gated by `has_role(..., 'manager')`.

---

### 4.6 `shift_swap_requests` *(reserved for Staff Portal)*
Staff-driven swap workflow. Not surfaced in the prototype UI (managers use direct reassignment).

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `shift_id` | `uuid` | FK → `shifts.id` |
| `from_employee_id` / `to_employee_id` | `uuid` | |
| `proposed_by` | `uuid` | required |
| `status` | `swap_status` | default `pending` |
| `reason` / `decision_notes` | `text` | |
| `decided_by` / `decided_at` | `uuid` / `timestamptz` | |
| `created_at` / `updated_at` | `timestamptz` | |

**Policies:**

| Cmd | Name | Using / With Check |
|-----|------|--------------------|
| SELECT | Authenticated can view swap requests | `true` |
| INSERT | Managers can propose swaps | `has_role(auth.uid(), 'manager') AND proposed_by = auth.uid()` |
| UPDATE | Supervisors can decide swaps | `has_role(..., 'shift_lead') OR has_role(..., 'manager')` |
| DELETE | Managers can cancel swaps | `has_role(auth.uid(), 'manager')` |

---

### 4.7 `attendance`
Clock-in / clock-out records.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `employee_id` | `uuid` | FK → `profiles.id` |
| `work_date` | `date` | default `current_date` |
| `clock_in_at` | `timestamptz` | default `now()` |
| `clock_out_at` | `timestamptz` | nullable — open session while null |
| `created_at` / `updated_at` | `timestamptz` | |

**Grants:** `authenticated: SELECT,INSERT,UPDATE,DELETE`; `service_role: ALL`.
**RLS:** enabled.

**Policies:**

| Cmd | Name | Using | With Check |
|-----|------|-------|------------|
| SELECT | Anyone signed in can view attendance | `true` | — |
| INSERT | Users can clock themselves in | — | `employee_id = auth.uid() OR has_role(auth.uid(), 'manager')` |
| UPDATE | Users can update own attendance or managers can | `employee_id = auth.uid() OR has_role(..., 'manager')` | same |
| DELETE | Managers can delete attendance | `has_role(auth.uid(), 'manager')` | — |

---

### 4.8 `announcements`
Manager-authored posts visible to all staff.

| Column | Type | Notes |
|--------|------|-------|
| `id` | `uuid` PK | |
| `title` | `text` | required |
| `description` | `text` | nullable |
| `event_date` | `date` | nullable |
| `created_by` | `uuid` | nullable |
| `created_at` / `updated_at` | `timestamptz` | |

**Grants:** `authenticated: SELECT,INSERT,UPDATE,DELETE`; `service_role: ALL`.
**RLS:** enabled.

**Policies:**

| Cmd | Name | Using | With Check |
|-----|------|-------|------------|
| SELECT | Anyone signed in can view announcements | `true` | — |
| INSERT | Managers can insert announcements | — | `has_role(auth.uid(), 'manager')` |
| UPDATE | Managers can update announcements | `has_role(auth.uid(), 'manager')` | same |
| DELETE | Managers can delete announcements | `has_role(auth.uid(), 'manager')` | — |

---

## 5. Relationships (ER Summary)

```text
auth.users ──1:1── profiles ──1:N── shifts ──N:1── positions
                     │                  │
                     │                  └── N:1 ── shift_swap_requests (shift_id)
                     │
                     ├──1:N── user_roles
                     ├──1:N── attendance
                     └──1:N── announcements (created_by)

positions ──1:N── profiles (primary_position_id)
```

Notes:
- Foreign keys to `auth.users` are avoided per platform guidance; `profiles.id` mirrors `auth.users.id` and is maintained by `handle_new_user()`.
- `profiles.secondary_position_ids` is a `uuid[]` — an intentional denormalization for a small directory.

---

## 6. Triggers

| Table | Trigger | Event | Function |
|-------|---------|-------|----------|
| `profiles` | assign employee code | `BEFORE INSERT` | `assign_employee_code()` |
| `profiles` | touch updated_at | `BEFORE UPDATE` | `touch_updated_at()` |
| `shifts` | touch updated_at | `BEFORE UPDATE` | `touch_updated_at()` |
| `schedule_weeks` | touch updated_at | `BEFORE UPDATE` | `touch_updated_at()` |
| `shift_swap_requests` | touch updated_at | `BEFORE UPDATE` | `touch_updated_at()` |
| `attendance` | touch updated_at | `BEFORE UPDATE` | `touch_updated_at()` |
| `announcements` | touch updated_at | `BEFORE UPDATE` | `touch_updated_at()` |
| `auth.users` | provision profile + role | `AFTER INSERT` | `handle_new_user()` |

---

## 7. `availability` JSON Shape

`profiles.availability` is a JSON object keyed by weekday, with values that are arrays of shift keys:

```json
{
  "mon": ["morning", "afternoon"],
  "tue": ["evening"],
  "wed": [],
  "thu": ["morning", "afternoon", "evening"],
  "fri": [],
  "sat": ["evening"],
  "sun": []
}
```

Allowed keys: `mon` `tue` `wed` `thu` `fri` `sat` `sun`.
Allowed shift values: `morning` `afternoon` `evening`.
Missing key or empty array = unavailable.
Legacy `{ mon: true }` payloads are normalized to the full-shift array `["morning","afternoon","evening"]` by `normalizeAvailability()` in `src/features/staff/types.ts`.

---

## 8. Sequences

| Sequence | Purpose |
|----------|---------|
| `employee_code_seq` | Backs `assign_employee_code()`; produces `S001`, `S002`, … |

---

## 9. Security Posture Summary

- Every application table has RLS enabled with explicit policies.
- `anon` has zero grants on application tables — no unauthenticated access is possible.
- All role checks flow through `has_role()`; policies never join `user_roles` directly.
- Roles live only in `user_roles`, and `user_roles` is read-only from the client (writes require `service_role`).
- Privileged Auth operations (invite, ban, delete user) use `supabaseAdmin`, dynamically imported inside server-function handlers so the service-role key never ships to the browser.
- Manager-only server functions re-check `has_role(userId, 'manager')` inside the handler even when RLS would already block the write — defense in depth.

---

## 10. Known Gaps & Deferred Work

| Area | Item | Notes |
|------|------|-------|
| `positions` writes | No policy for INSERT/UPDATE/DELETE by managers | Data is seeded via migration; add a manager-scoped policy when positions become editable in the UI. |
| `profiles` write policy | Only self-update is policy-covered; manager edits rely on server-function checks + admin path | Add a `has_role(auth.uid(), 'manager')` UPDATE policy when direct manager writes move fully through the authenticated client. |
| `schedule_weeks` / `shift_swap_requests` | Policies defined but no UI | Wire on Staff Portal work. |
| `attendance` uniqueness | No unique constraint on `(employee_id, work_date, open session)` | Duplicate opens are prevented in application code (`clockIn`), not the database. |
| Audit trail | No append-only history for role or shift changes | Add a change-log table once the pilot moves past prototype. |

---

**End of Document.** Next in the documentation sprint: `docs/05-USER-GUIDE.md` (Manager User Guide).
