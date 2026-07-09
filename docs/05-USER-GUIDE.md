# Manager User Guide

**Product:** Staff Harmony Hub
**Audience:** Restaurant Managers (pilot: Station 31 Restaurant & Bar)
**Document Version:** 1.0
**Status:** Prototype

---

## 1. Welcome

Staff Harmony Hub is your single place to run the day-to-day people side of the restaurant: who's on your team, who's working when, who's on the floor right now, what's coming up this week, and how the last month looked. This guide walks you through every screen in the Manager Portal, in the order you'll typically use them.

You'll be able to:

- Keep a clean, searchable staff directory
- Build the weekly schedule in minutes
- See who's clocked in today and clock people in or out
- Post announcements the whole team can see
- Reassign a shift when someone can't make it
- Review basic reports for the last 30 days

---

## 2. Getting Started

### 2.1 First-Time Setup (one time only)

The very first time the app is opened, you'll land on the **Setup** screen. This is only shown until the first manager account exists.

1. Enter your full name, email, and a password (8+ characters).
2. Click **Create manager account**.
3. You'll be signed in and taken to the Dashboard.

Once the first manager is created, the Setup screen is permanently disabled — everyone else joins by invitation.

### 2.2 Signing In

- Go to `/auth`.
- Enter your email and password.
- You'll land on the **Dashboard** at `/dashboard`.

If you forget your password, ask another manager to send you a fresh invite link.

### 2.3 Signing Out

Open the user menu in the top-right of the app shell and choose **Sign out**.

---

## 3. The App Shell

Every authenticated screen shares the same layout:

- **Left sidebar (desktop)** or **bottom bar (mobile)** — main navigation.
- **Top header** — page title, quick actions, and your account menu.
- **Main area** — the content of the current screen.

The header shows **Station 31 Restaurant & Bar — Powered by Staff Harmony Hub**.

Navigation items:

| Item | Route | Purpose |
|------|-------|---------|
| Dashboard | `/dashboard` | Today at a glance + quick actions |
| Staff | `/staff` | Staff directory |
| Schedule | `/schedule` | Weekly schedule builder |
| Attendance | `/attendance` | Today on the floor + clock in/out |
| Announcements | `/announcements` | Team posts |
| Shift Reassign | `/swaps` | Reassign a shift to another staff member |
| Reports | `/reports` | 30-day summary |

---

## 4. Dashboard

**Route:** `/dashboard`

The Dashboard is your starting point every shift.

**Welcome hero** — a time-aware greeting ("Good morning, Alex") with today's date.

**Summary cards:**
- **Total staff** — active employees in your directory.
- **Today's staff** — how many people are scheduled today.
- **On the floor** — how many people are currently clocked in.
- **Open announcements** — count of recent posts.

**Quick actions:** one-click cards that jump you to the most common tasks — Invite staff, Create schedule, Post announcement, Clock someone in.

**Feature grid:** every module card. "Live" cards are working now; "Coming soon" cards will light up as more features ship.

---

## 5. Staff Directory

**Route:** `/staff`

The directory is your source of truth for who works at Station 31.

### 5.1 What you see

- **Desktop:** a table with employee code, name, role, primary position, phone, status, and invite state.
- **Mobile:** the same information as tap-friendly cards.

Filters at the top:
- **Search** — name, employee code, or phone.
- **Status tabs** — All / Active / Inactive.
- **Position filter** — narrow to one role.

Every active employee gets an auto-assigned code (`S001`, `S002`, …).

### 5.2 Inviting a new staff member

1. Click **Invite staff**.
2. Step through the 4-step wizard:
   1. **Basics** — full name, email, phone.
   2. **Role & position** — Manager / Shift Lead / Staff, plus primary and secondary positions.
   3. **Availability & hours** — check the days and shifts (Morning / Afternoon / Evening) they're available; set a weekly hour cap if needed.
   4. **Review & send** — confirm and send the invite.
3. The person receives an email with a sign-in link that expires in 7 days.

Their invite status shows on the directory: **Pending** → they haven't accepted yet. **Accepted** → they've signed in at least once. **Expired** → the 7-day window passed.

### 5.3 Managing pending invites

On any Pending row, use the row menu:

- **Resend invite** — sends a fresh email and resets the 7-day window.
- **Cancel invite** — removes the pending account entirely.

### 5.4 Editing a staff member

Click any row (or the **Edit** menu) to open the same 4-step wizard prefilled with their details. Changes save when you click **Save** on the last step.

### 5.5 Deactivating / reactivating

You never fully delete accepted staff — deactivate them instead. This preserves their history in schedules, attendance, and reports.

- **Deactivate** from the row menu. The account is banned from signing in and hidden from schedulable staff lists.
- **Reactivate** from the Inactive tab to bring them back.

### 5.6 Staff profile page

Click a name to open `/staff/<id>` — a read-only detail view showing all fields, availability, and history at a glance.

---

## 6. Weekly Schedule

**Route:** `/schedule`

Build the week in a visual grid.

### 6.1 Layout

- **Desktop:** a 7-day grid, one column per day, one row per employee. Shifts appear as coloured chips (colour follows position).
- **Mobile:** a single-day view with a day picker at the top; scroll through the week one day at a time.

Week navigation is at the top: **← Previous week**, **This week**, **Next week →**.

### 6.2 Adding a shift

1. Click an empty cell (or the **Add shift** button).
2. Fill in the form:
   - **Employee** (active staff only)
   - **Day**
   - **Start time** and **End time**
   - **Position** (defaults to their primary position)
3. Click **Save**.

The shift appears immediately in the grid. Start time must be earlier than end time.

### 6.3 Editing or deleting a shift

Click any existing shift chip to reopen the form. Use **Save** to update, or **Delete** to remove it.

### 6.4 Empty week

If the current week has no shifts, you'll see a friendly empty state with a **Create first shift** button — start there.

---

## 7. Attendance

**Route:** `/attendance`

Track who's actually on the floor.

### 7.1 Today on the floor

The top of the screen lists everyone currently clocked in — name, position, and how long they've been on shift.

### 7.2 Clocking someone in

1. Click **Clock in** and pick the employee.
2. Confirm.

You can only clock a person in once at a time; if they already have an open session for today, the app blocks a duplicate.

### 7.3 Clocking someone out

Find their row and click **Clock out**. The session closes with the current time.

### 7.4 Fixing a mistake

If you accidentally clocked the wrong person or need to remove a session, use the row menu to delete it. Deletions are manager-only.

---

## 8. Announcements

**Route:** `/announcements`

A running feed of messages the whole team can see.

### 8.1 Reading

The feed lists posts newest first, with title, description, an optional event date, and who posted it.

### 8.2 Posting an announcement

1. Click **New announcement**.
2. Add a **Title** (required), an optional **Description**, and an optional **Event date** (for shift meetings, deep cleans, etc.).
3. Click **Post**.

### 8.3 Editing or deleting

Use the menu on any post to **Edit** or **Delete**. Staff see the change instantly the next time they load the page.

---

## 9. Shift Reassignment

**Route:** `/swaps`

Use this when someone can't make a scheduled shift and you need to hand it to someone else.

1. Pick the shift from the list of upcoming shifts.
2. Pick a new active employee to cover it.
3. Click **Reassign**.

The shift's owner is updated immediately — the schedule reflects the change on the next reload. Attendance and reports still count the new employee automatically.

*(The prototype does not yet include staff-initiated swap requests. Those will arrive with the Staff Portal.)*

---

## 10. Reports

**Route:** `/reports`

A quick pulse on the last 30 days.

**Summary cards** at the top:
- **Total scheduled hours**
- **Total worked hours** (from attendance)
- **Attendance %** (worked ÷ scheduled)
- **Number of shifts**

**Per-employee table** with the same metrics broken out by person. Use it to spot who's picking up extra shifts and where attendance is drifting.

Reports are read-only in the prototype — export and payroll hooks are on the roadmap.

---

## 11. Roles at a Glance

| Role | What they can do |
|------|------------------|
| **Manager** | Everything in this guide. |
| **Shift Lead** | Reserved for future features; treated like Staff in the current prototype. |
| **Staff** | Sign in and view the app; the dedicated Staff Portal is coming in a later phase. |

Roles are set when you invite the person and can be changed by editing their profile.

---

## 12. Best Practices

- **Keep the directory tidy.** Deactivate people the day they leave — don't delete.
- **Build the schedule mid-week.** Post it a few days before it starts so staff can plan.
- **Post announcements early.** Especially for anything that affects a specific shift — attach the event date so it's easy to spot.
- **Clock people in at the door.** Doing it from the manager station keeps attendance honest and makes reports meaningful.
- **Review reports on the same day each week.** A 5-minute weekly habit catches trends before they become problems.

---

## 13. Troubleshooting

| Symptom | What to try |
|---------|-------------|
| "Email already invited" when inviting | The address is already in the system — search the directory for it. |
| Invited teammate can't sign in | Check their invite status. If **Expired**, use **Resend invite**. |
| A staff member is missing from the schedule dropdown | They may be **Inactive** — reactivate them on the Staff screen. |
| "Already clocked in" | The person has an open session for today. Clock them out first, then in again. |
| Numbers on the Dashboard look off | Refresh the page — the cards read live data but a stale tab won't update on its own. |
| You need to change the first-ever manager | Sign in as any existing manager and invite the new person with role **Manager**, then deactivate the old account. |

---

## 14. What's Coming Next

- **Staff Portal** — staff sign in to see their own schedule and request swaps.
- **Notifications** — email/push when schedules change or shifts are reassigned.
- **Payroll export** — hours out to CSV.
- **Multi-location** — one login, many restaurants.

---

**End of Document.** Next in the documentation sprint: `docs/06-DEV-SETUP.md` (Developer Setup & Contribution Guide).
