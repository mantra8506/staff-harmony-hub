export interface Shift {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_code: string | null;
  work_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_time: string; // HH:MM
  position_id: string | null;
  position_name: string | null;
  break_minutes: number;
  notes: string | null;
  created_at: string;
}

/* ---------------- Week helpers (Monday-start) ---------------- */

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day; // shift to Monday
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatWeekRange(weekStart: Date): string {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const startStr = weekStart.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
  const endStr = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startStr} – ${endStr}`;
}

/* ---------------- Time helpers ---------------- */

/** Parse "HH:MM" or "HH:MM:SS" into minutes since midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m ?? 0);
}

/** Duration in hours, subtracting break. Handles overnight (end < start). */
export function shiftHours(
  start: string,
  end: string,
  breakMinutes: number,
): number {
  let diff = timeToMinutes(end) - timeToMinutes(start);
  if (diff < 0) diff += 24 * 60;
  diff -= breakMinutes;
  return Math.max(0, diff / 60);
}

export function formatTime(t: string): string {
  const [h, m] = t.split(":").map(Number);
  const d = new Date();
  d.setHours(h, m ?? 0, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---------------- Position colors ---------------- */

// Subtle, accessible palette. Keys mapped from department/position name.
const POSITION_PALETTE: {
  key: string;
  bg: string;
  border: string;
  text: string;
  chip: string;
}[] = [
  {
    key: "blue",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900",
    text: "text-blue-900 dark:text-blue-100",
    chip: "bg-blue-500",
  },
  {
    key: "emerald",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900",
    text: "text-emerald-900 dark:text-emerald-100",
    chip: "bg-emerald-500",
  },
  {
    key: "amber",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900",
    text: "text-amber-900 dark:text-amber-100",
    chip: "bg-amber-500",
  },
  {
    key: "violet",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    border: "border-violet-200 dark:border-violet-900",
    text: "text-violet-900 dark:text-violet-100",
    chip: "bg-violet-500",
  },
  {
    key: "rose",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    border: "border-rose-200 dark:border-rose-900",
    text: "text-rose-900 dark:text-rose-100",
    chip: "bg-rose-500",
  },
  {
    key: "cyan",
    bg: "bg-cyan-50 dark:bg-cyan-950/40",
    border: "border-cyan-200 dark:border-cyan-900",
    text: "text-cyan-900 dark:text-cyan-100",
    chip: "bg-cyan-500",
  },
  {
    key: "slate",
    bg: "bg-slate-100 dark:bg-slate-800/60",
    border: "border-slate-200 dark:border-slate-700",
    text: "text-slate-900 dark:text-slate-100",
    chip: "bg-slate-500",
  },
];

const NAMED_COLORS: Record<string, number> = {
  server: 0,
  bartender: 1,
  bar: 1,
  kitchen: 2,
  cook: 2,
  chef: 2,
  host: 3,
  hostess: 3,
  manager: 4,
  runner: 5,
  busser: 5,
  dishwasher: 6,
};

export function positionColors(positionName: string | null | undefined) {
  if (!positionName) return POSITION_PALETTE[6];
  const lower = positionName.toLowerCase();
  for (const [needle, idx] of Object.entries(NAMED_COLORS)) {
    if (lower.includes(needle)) return POSITION_PALETTE[idx];
  }
  // Fallback: stable hash on name
  let h = 0;
  for (let i = 0; i < positionName.length; i++) h = (h * 31 + positionName.charCodeAt(i)) >>> 0;
  return POSITION_PALETTE[h % POSITION_PALETTE.length];
}
