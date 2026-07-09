# Product Requirements Document (PRD)

**Product:** Staff Harmony Hub
**Pilot Deployment:** Station 31 Restaurant & Bar
**Document Version:** 1.0
**Status:** Prototype — Manager Portal near-complete, Staff Portal planned
**Last Updated:** Day 5 — Documentation Sprint

---

## Table of Contents

- [1. Executive Summary](#1-executive-summary)
- [2. Product Vision](#2-product-vision)
- [3. Business Goals](#3-business-goals)
- [4. Problem Statement](#4-problem-statement)
- [5. Target Users](#5-target-users)
- [6. User Personas](#6-user-personas)
- [7. User Roles](#7-user-roles)
- [8. Functional Requirements](#8-functional-requirements)
- [9. Non-Functional Requirements](#9-non-functional-requirements)
- [10. Current Features (Shipped in Prototype)](#10-current-features-shipped-in-prototype)
- [11. Out-of-Scope Features (Prototype)](#11-out-of-scope-features-prototype)
- [12. Success Metrics](#12-success-metrics)
- [13. Assumptions](#13-assumptions)
- [14. Constraints](#14-constraints)
- [15. Risks](#15-risks)
- [16. Future Roadmap](#16-future-roadmap)

---

## 1. Executive Summary

Staff Harmony Hub is a lightweight, mobile-first restaurant staff management system built for small full-service restaurants (under ~15 employees). The current prototype delivers a Manager Portal that consolidates the day-to-day operational tasks a restaurant manager repeats every week: keeping the staff roster current, building the weekly schedule, tracking who is on the floor, posting announcements, reassigning shifts, and reviewing basic operational reports.

The pilot deployment is **Station 31 Restaurant & Bar**. The product is positioned as a clean, professional SaaS alternative to spreadsheets, WhatsApp groups, and paper schedules.

---

## 2. Product Vision

To give independent restaurants a calm, focused tool that removes the daily chaos of staff coordination — without the cost, complexity, or overhead of enterprise workforce-management platforms.

Staff Harmony Hub should feel like the simplest possible answer to: *"Who is working, when, doing what, and is everything okay today?"*

---

## 3. Business Goals

1. Replace informal tools (spreadsheets, chat groups, printed schedules) with a single, structured system.
2. Reduce the time a manager spends on weekly scheduling from hours to minutes.
3. Provide a reliable source of truth for staff records, roles, and availability.
4. Establish a foundation that can be extended into a full staff-facing product (Staff Portal) in later phases.
5. Deliver a polished prototype suitable for demonstrating the product to additional pilot restaurants.

---

## 4. Problem Statement

Small restaurants coordinate staff through a mix of paper, spreadsheets, and messaging apps. This creates recurring problems:

- Schedules are hard to change and easy to lose.
- Staff records live in the manager's head or a personal notebook.
- Shift changes and swaps happen verbally and are not tracked.
- Attendance is inconsistent, making payroll and accountability difficult.
- Announcements get buried in chat threads.
- There is no single place to see "what is happening today."

Existing enterprise workforce tools are too expensive, too complex, and built for chains rather than independent operators.

---

## 5. Target Users

- **Independent, full-service restaurants** with fewer than ~15 staff.
- **Restaurant managers / owner-operators** who personally run scheduling and staffing.
- **Front-of-house and back-of-house staff** (servers, bartenders, kitchen, hosts) who need to know their shifts.

Pilot deployment: **Station 31 Restaurant & Bar** — a single-location, full-service venue.

---

## 6. User Personas

### 6.1 Maya — Restaurant Manager
- Runs the floor, hires staff, builds the weekly schedule.
- Uses her phone constantly; laptop only for admin work.
- Needs a fast way to add employees, drop shifts on a calendar, and see who is working today.
- Frustrated by spreadsheets and lost WhatsApp messages.

### 6.2 Jordan — Server / Bartender (Staff)
- Cares about: "When am I working next?" and "Did anything change?"
- Wants to see the schedule and announcements from a phone.
- Occasionally needs to swap a shift with a coworker.
- *Staff-facing experience is planned for a later phase.*

### 6.3 Sam — Shift Lead (Future Role)
- Senior staff member with limited supervisory permissions.
- Role exists in the system; dedicated shift-lead workflows are on the roadmap.

---

## 7. User Roles

The system defines three roles, stored in a dedicated roles table (never on the profile):

| Role         | Description                                                        | Current Access                                                     |
| ------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ |
| `manager`    | Full operational control of the restaurant.                        | Full Manager Portal access.                                        |
| `shift_lead` | Senior staff with elevated privileges.                             | Role reserved; dedicated UI planned.                               |
| `staff`      | Regular employee.                                                  | Account exists; dedicated Staff Portal planned.                    |

---

## 8. Functional Requirements

### 8.1 Authentication & Onboarding
- One-time manager bootstrap via a `/setup` route when no manager exists.
- Email + password sign-in via `/auth`.
- Managers invite staff; invitations have a pending → accepted → expired lifecycle.
- Managers can resend or cancel pending invitations.

### 8.2 Staff Directory
- Auto-generated employee code (`S###`).
- Fields: full name, phone, primary position, secondary positions, availability (per-day, per-shift), max hours per week, notes, status (active/inactive).
- Search, filter by position, and status tabs.
- Responsive table (desktop) and cards (mobile).
- Dedicated employee profile page (`/staff/:userId`).
- Deactivating an account also bans the underlying auth user.

### 8.3 Weekly Scheduling
- 7-day grid (Mon–Sun) on desktop; day-by-day view on mobile.
- Create, edit, delete shifts with: employee, date, start time, end time, position, optional break, notes.
- Position-based color coding (Server, Bartender, Kitchen, Host, etc.).
- Weekly navigation: previous / current / next / today.
- Empty state with a "Create First Shift" call to action.

### 8.4 Shift Swaps (Simplified)
- Manager can reassign an existing shift to another employee from a dedicated `/swaps` page.

### 8.5 Attendance
- Employees can clock in and clock out.
- Managers can clock in others.
- "Today on the floor" view with total hours.

### 8.6 Announcements
- Managers can create, edit, and delete announcements.
- Each announcement has a title, optional description, and optional event date.

### 8.7 Reports
- Rolling 30-day summary: total hours, clock-ins, clock-outs, active staff, attendance rate.
- Per-employee breakdown table.

### 8.8 Dashboard
- Time-aware greeting personalized to the current user.
- Live metric cards (total staff, today's staff, next shift, etc.).
- Quick actions and a feature grid with live modules linked directly to their routes.
- Branded as **Station 31 Restaurant & Bar — Powered by Staff Harmony Hub**.

### 8.9 Navigation Shell
- Responsive sidebar (desktop) and bottom navigation (mobile).
- Role-aware: manager-only items are hidden for non-managers.

---

## 9. Non-Functional Requirements

- **Mobile-first:** All primary flows usable on a phone.
- **Performance:** Instant navigation via TanStack Router preloading; server functions typed end-to-end.
- **Security:** Row-Level Security on every table; role checks via security-definer functions.
- **Accessibility:** Semantic HTML, keyboard-navigable dialogs, sufficient contrast.
- **Reliability:** Zod validation at every server boundary.
- **Maintainability:** Feature-first folder structure; strict TypeScript.
- **Design consistency:** Single design system (Deep Indigo + Emerald, Inter typeface).

---

## 10. Current Features (Shipped in Prototype)

- Manager bootstrap and email/password auth
- Staff Directory with invitation lifecycle
- Employee profile page
- Weekly Schedule Builder (create/edit/delete)
- Simplified Shift Swaps (manager reassignment)
- Attendance (clock in / clock out, manager assist)
- Announcements (CRUD)
- Reports (30-day summary + per-employee breakdown)
- Manager Dashboard with live metrics
- Public landing page

---

## 11. Out-of-Scope Features (Prototype)

The following are explicitly **not** part of the current prototype:

- Staff-facing portal (Staff Portal)
- Shift-lead-specific workflows
- Schedule publishing / draft-vs-published workflow
- Time-off requests
- Payroll calculations
- Labor cost / budgeting
- Push, SMS, or email notifications
- Auto-scheduling or AI scheduling
- Schedule templates and copy-previous-week
- Conflict / overtime detection
- Multi-location support
- Multi-tenant / multi-restaurant accounts
- Advanced analytics and exports

---

## 12. Success Metrics

Prototype-level metrics (qualitative and observational at the pilot):

- Manager builds a full week's schedule in under 10 minutes.
- 100% of active staff have complete profile records within the first week of use.
- All shift changes for a given week are captured in the system (not in chat).
- Manager checks the dashboard at least once per shift.
- Positive qualitative feedback from the Station 31 manager on clarity and speed.

---

## 13. Assumptions

- One restaurant, one manager, fewer than ~15 staff.
- Manager is the primary content creator; staff largely consume information.
- Users have modern smartphones and reliable internet.
- Email is a viable channel for invitations and login.
- The pilot restaurant is willing to replace informal tools with the app.

---

## 14. Constraints

- Prototype scope — no billing, no notifications, no payroll.
- Single-tenant design; multi-restaurant is a future concern.
- Built on Lovable Cloud (Supabase) with row-level security as the primary authorization boundary.
- Small team, feature-by-feature delivery cadence.

---

## 15. Risks

| # | Risk                                                                 | Mitigation                                                                 |
| - | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 1 | Managers revert to WhatsApp/spreadsheets if the app feels slower.    | Mobile-first UX, minimal clicks, preloaded routes.                         |
| 2 | Staff cannot yet self-serve (no Staff Portal).                       | Prioritize Staff Portal in the next phase.                                 |
| 3 | Missing notifications means schedule changes may go unseen.          | Announcements module + planned notification layer in a future phase.       |
| 4 | Prototype lacks payroll / labor cost — may block commercial pilots.  | Frame clearly as prototype; roadmap those features explicitly.             |
| 5 | Role escalation if roles are ever moved onto profiles.               | Roles stay in a separate table, gated by security-definer functions.       |

---

## 16. Future Roadmap

**Phase Next — Staff Portal**
- Staff sign-in experience
- Personal schedule view
- Personal attendance and hours
- Announcement feed
- Shift swap requests initiated by staff

**Phase Later — Operational Depth**
- Shift-lead workflows and approvals
- Schedule publishing (draft → published)
- Time-off requests
- Notifications (email / push)
- Schedule templates and copy-previous-week
- Conflict, overtime, and availability warnings

**Phase Future — Business Layer**
- Labor cost and budgeting
- Payroll export
- Multi-location and multi-tenant
- Advanced reporting and exports
- AI-assisted scheduling

---

*End of Product Requirements Document.*
