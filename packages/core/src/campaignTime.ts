/*
 * Time-zone aware date logic shared by the web and native widgets (calendar + draw videos),
 * so both platforms always agree on "today", which draws are out and the countdown.
 * Dates are "YYYY-MM-DD" keys in the campaign's time zone.
 */
import type { Easing, Keyframe, TimeOfDay } from './schema';

export type ZonedNow = { dateKey: string; secondsOfDay: number };

const pad = (n: number) => String(n).padStart(2, '0');

/** Fallback when Intl time zones are unavailable: use the device's local time. */
function localNow(date: Date): ZonedNow {
  return {
    dateKey: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    secondsOfDay: date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds(),
  };
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Current date + seconds since midnight in the given IANA time zone. */
export function zonedNow(now: Date | number, timeZone: string): ZonedNow {
  const date = typeof now === 'number' ? new Date(now) : now;
  try {
    let fmt = formatters.get(timeZone);
    if (!fmt) {
      fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23',
      });
      formatters.set(timeZone, fmt);
    }
    const p: Record<string, string> = {};
    for (const part of fmt.formatToParts(date)) p[part.type] = part.value;
    const hour = Number(p.hour) % 24;
    return {
      dateKey: `${p.year}-${p.month}-${p.day}`,
      secondsOfDay: hour * 3600 + Number(p.minute) * 60 + Number(p.second),
    };
  } catch {
    return localNow(date);
  }
}

/** "2026-11-09" + n days (calendar arithmetic in UTC, independent of the device zone). */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

export function dayOfMonth(dateKey: string): number {
  return Number(dateKey.slice(8, 10));
}

/** 0 = Monday … 6 = Sunday */
export function weekdayIndex(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number) as [number, number, number];
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function daysInMonth(monthKey: string): number {
  const [y, m] = monthKey.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** "24.11.2026" */
export function formatDateKey(dateKey: string): string {
  return `${dateKey.slice(8, 10)}.${dateKey.slice(5, 7)}.${dateKey.slice(0, 4)}`;
}

export function formatTimeOfDay(t: TimeOfDay): string {
  return `${pad(t.hour)}:${pad(t.minute)}`;
}

/** "03:12:49" */
export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/* ───────────── Calendar ───────────── */

export type CalendarDayState = 'won' | 'today' | 'tomorrow' | 'soon';

export type CalendarCell =
  | { kind: 'empty' }
  | { kind: 'outside'; day: number }
  | { kind: 'day'; dateKey: string; day: number; state: CalendarDayState; special: string | null };

/** Month grid (Mon-first weeks). Days outside firstDay…lastDay are shown as dim numbers. */
export function calendarCells(input: {
  month: string;
  firstDay: number;
  lastDay: number;
  specialDays: readonly { day: number; label: string }[];
  today: string;
}): CalendarCell[][] {
  const { month, firstDay, today } = input;
  const total = daysInMonth(month);
  const lastDay = Math.min(input.lastDay, total);
  const start = `${month}-${pad(firstDay)}`;
  const tomorrow = addDays(today, 1);
  const cells: CalendarCell[] = [];

  // the grid starts on the Monday of the first campaign week
  for (let i = 0; i < weekdayIndex(start); i++) cells.push({ kind: 'empty' });
  for (let day = firstDay; day <= lastDay; day++) {
    const dateKey = `${month}-${pad(day)}`;
    const state: CalendarDayState =
      dateKey < today ? 'won' : dateKey === today ? 'today' : dateKey === tomorrow ? 'tomorrow' : 'soon';
    const special = input.specialDays.find((s) => s.day === day)?.label ?? null;
    cells.push({ kind: 'day', dateKey, day, state, special });
  }
  // fill the last week with the next month's numbers
  let next = 1;
  while (cells.length % 7 !== 0) cells.push({ kind: 'outside', day: next++ });

  const weeks: CalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/* ───────────── Draw videos ───────────── */

export type DrawStatus =
  | { kind: 'released' }
  | { kind: 'pending'; secondsLeft: number }
  | { kind: 'future' };

export function drawStatus(dateKey: string, now: ZonedNow, release: TimeOfDay): DrawStatus {
  if (dateKey < now.dateKey) return { kind: 'released' };
  if (dateKey > now.dateKey) return { kind: 'future' };
  const releaseSec = release.hour * 3600 + release.minute * 60;
  return now.secondsOfDay >= releaseSec ? { kind: 'released' } : { kind: 'pending', secondsLeft: releaseSec - now.secondsOfDay };
}

/** Every campaign day (startDate … endDate) – future days show when their draw will be. */
export function drawDays(startDate: string, endDate: string): string[] {
  const days: string[] = [];
  for (let d = startDate; d <= endDate && days.length < 400; d = addDays(d, 1)) days.push(d);
  return days;
}

/** The day the switcher opens on: today if it is a campaign day, else the nearest campaign day. */
export function initialDrawDay(startDate: string, endDate: string, today: string): string {
  return today < startDate ? startDate : today > endDate ? endDate : today;
}

export function drawVideoUrl(pattern: string, dateKey: string): string {
  return pattern
    .replaceAll('{YYYY}', dateKey.slice(0, 4))
    .replaceAll('{MM}', dateKey.slice(5, 7))
    .replaceAll('{DD}', dateKey.slice(8, 10));
}

/** Fills {time} / {date} in a label. */
export function fillLabel(template: string, values: { time?: string; date?: string }): string {
  return template.replaceAll('{time}', values.time ?? '').replaceAll('{date}', values.date ?? '');
}

/* ───────────── Countdown layer ───────────── */

/** Seconds from `now` until endDate endTime (both in the campaign time zone). Negative once it has passed. */
export function secondsUntil(endDate: string, endTime: TimeOfDay, now: ZonedNow): number {
  const [y1, m1, d1] = endDate.split('-').map(Number) as [number, number, number];
  const [y0, m0, d0] = now.dateKey.split('-').map(Number) as [number, number, number];
  const days = Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y0, m0 - 1, d0)) / 86400000);
  return days * 86400 + endTime.hour * 3600 + endTime.minute * 60 - now.secondsOfDay;
}

export type CountdownLabels = { days: string; hours: string; minutes: string; seconds: string };

/**
 * "2д 03ч 14м 09с" with labels, "02:03:14:09" without.
 * dhms = always days · hms = hours may exceed 24 · auto = days only while > 0.
 */
export function formatCountdownText(seconds: number, format: 'dhms' | 'hms' | 'auto', labels: CountdownLabels): string {
  const s = Math.max(0, Math.floor(seconds));
  const d = Math.floor(s / 86400);
  const showDays = format === 'dhms' || (format === 'auto' && d > 0);
  const h = showDays ? Math.floor((s % 86400) / 3600) : Math.floor(s / 3600);
  const parts: [number, string][] = [
    ...(showDays ? [[d, labels.days] as [number, string]] : []),
    [h, labels.hours],
    [Math.floor((s % 3600) / 60), labels.minutes],
    [s % 60, labels.seconds],
  ];
  const labelled = parts.some(([, l]) => l !== '');
  return labelled ? parts.map(([n, l], i) => `${i === 0 && showDays ? n : pad(n)}${l}`).join(' ') : parts.map(([n]) => pad(n)).join(':');
}

/* ───────────── Timeline sampling (tests, editor scrubbing, web keyframe generation) ───────────── */


/** Easing functions shared by renderers for parity (t in 0…1). */
export const EASING_FNS: Readonly<Record<Easing, (t: number) => number>> = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - (1 - t) ** 3,
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  back: (t) => 1 + 2.70158 * (t - 1) ** 3 + 1.70158 * (t - 1) ** 2,
  bounce: (t) => {
    const n = 7.5625;
    const d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
    return n * (t -= 2.625 / d) * t + 0.984375;
  },
  elastic: (t) => (t === 0 || t === 1 ? t : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

/** Layer state at time t (ms since the timeline started, without delay/repeat). */
export function sampleTimeline(keyframes: readonly Keyframe[], t: number): Omit<Keyframe, 'atMs' | 'easing'> {
  const first = keyframes[0] as Keyframe;
  const last = keyframes[keyframes.length - 1] as Keyframe;
  const pick = (k: Keyframe) => ({ opacity: k.opacity, x: k.x, y: k.y, scale: k.scale, rotate: k.rotate });
  if (t <= 0) return pick(first);
  if (t >= last.atMs) return pick(last);
  const i = keyframes.findIndex((k) => k.atMs >= t);
  const a = keyframes[i - 1] as Keyframe;
  const b = keyframes[i] as Keyframe;
  const p = EASING_FNS[b.easing]((t - a.atMs) / (b.atMs - a.atMs));
  const mix = (x: number, y: number) => x + (y - x) * p;
  return { opacity: mix(a.opacity, b.opacity), x: mix(a.x, b.x), y: mix(a.y, b.y), scale: mix(a.scale, b.scale), rotate: mix(a.rotate, b.rotate) };
}
