# Staff Harmony Hub — Today's Work & Full Website Overview

## Part 1 — What we shipped today

1. **Staff Portal (Employee View)** — a separate, mobile-first experience for staff at `/my/*`:
   - `/my` dashboard (today/next shift, quick clock in/out, announcements preview)
   - `/my/schedule` — personal shifts only
   - `/my/attendance` — personal clock-in history
   - `/my/announcements` — read-only feed
   - `/my/profile` — view name/email/role, edit phone and password, upload avatar
   - Role-aware navigation: staff never see manager tools; hitting a manager URL bounces to `/my`
   - Login now routes managers → `/dashboard`, staff → `/my`

2. **Logout race-condition fix** — the "Unauthorized: No authorization header provided" flash on sign-out is gone. We now navigate to `/auth` before destroying the Supabase session so protected loaders stop refetching first.

3. **Staff login guidance** — clarified that invited staff set their own password via the invitation email (or "Forgot password") since managers don't set passwords for them.

4. **Email domain configured** — `notify.staffhh.com` added as the project's sender domain (DNS still verifying) and the full email queue/processor infrastructure was installed so branded auth invite emails can start sending as soon as DNS goes green.

## Part 2 — Full website details

### Product
**Station 31 Restaurant & Bar — Powered by Staff Harmony Hub.** A single-restaurant staff management prototype for teams under ~15 people. Two experiences share one codebase: a full Manager Portal and a stripped-down Staff Portal.

### Tech stack
- TanStack Start v1 + React 19 + Vite 7 (Cloudflare Worker runtime)
- Tailwind CSS v4 + shadcn/ui + semantic design tokens (dark-mode ready)
- Lovable Cloud (Supabase) — Postgres + Auth + Storage + RLS
- TanStack Router (file-based) + TanStack Query
- Server logic via `createServerFn` (no edge functions for app logic)

### Roles & access model
Three roles stored in a dedicated `user_roles` table (never on profiles) and checked via a `has_role` security-definer function:
- **Manager** — full access
- **Shift Lead** — planned intermediate tier
- **Staff** — personal data only

### Routes

**Public**
- `/` — landing page ("Staff Harmony Hub" marketing)
- `/auth` — sign in / forgot password
- `/setup` — one-time first-manager bootstrap

**Manager Portal (`/_authenticated`)**
- `/dashboard` — greeting, metrics, quick actions
- `/staff` — Staff Directory (search, invite, edit, 4-step wizard)
- `/staff/$userId` — individual staff profile
- `/schedule` — weekly shift builder
- `/attendance` — clock-in log across team
- `/announcements` — CRUD for team-wide notices
- `/reports` — hours & attendance summaries
- `/swaps` — manager-driven shift reassignment
- `/settings` — restaurant profile, dark-mode toggle, profile, avatar upload, notifications

**Staff Portal (`/_authenticated/my/*`)** — as listed in Part 1.

### Database (public schema, all RLS-enabled)
- `profiles` — name, phone, primary position, avatar
- `user_roles` — role assignments (`manager` | `shift_lead` | `staff`)
- `positions` — job titles (Server, Cook, etc.)
- `shifts` — scheduled shifts (user, position, day, start/end)
- `attendance` — clock-in/clock-out records
- `announcements` — manager broadcasts
- Auto-generated `employee_code` (S001, S002…) per staff member
- Storage bucket: `avatars` (private, per-user signed URLs)

### Documentation (in `/docs`)
1. `01-PRD.md` — Product Requirements
2. `02-TRD.md` — Technical Requirements
3. `03-API.md` — Server Function reference
4. `04-DATABASE.md` — Schema & RLS reference
5. `05-USER-GUIDE.md` — Manager manual
6. `06-DEV-SETUP.md` — Developer setup
Plus a project `README.md` linking all six.

### Email (set up today, DNS verifying)
- Sender domain: `notify.staffhh.com`
- Queue-based sending with retries + suppression list
- Ready for branded auth email templates (signup, invite, password reset, magic link, etc.)

### Design system
- "Deep Indigo + Emerald" palette via semantic tokens in `src/styles.css`
- Mobile-first, large tap targets, stacked cards over tables on small screens
- Dark mode toggle (persisted to `localStorage`)

---

## Suggested next steps (not part of this plan — pick any)
- Scaffold branded auth email templates so invites match the app
- Add "Send password reset" button per staff row for easier demo login
- Publish the app to a live URL
