import { describe, expect, it } from 'vitest';
import {
  addDays,
  calendarCells,
  drawDays,
  drawStatus,
  drawVideoUrl,
  formatCountdown,
  initialDrawDay,
  weekdayIndex,
  zonedNow,
} from './campaignTime';

describe('zonedNow', () => {
  it('converts to the campaign time zone (Sofia = UTC+2 in November)', () => {
    // 2026-11-24 21:30 UTC = 23:30 in Sofia
    const z = zonedNow(Date.UTC(2026, 10, 24, 21, 30, 5), 'Europe/Sofia');
    expect(z.dateKey).toBe('2026-11-24');
    expect(z.secondsOfDay).toBe(23 * 3600 + 30 * 60 + 5);
    // 22:30 UTC = 00:30 next day in Sofia
    expect(zonedNow(Date.UTC(2026, 10, 24, 22, 30), 'Europe/Sofia').dateKey).toBe('2026-11-25');
  });
});

describe('date helpers', () => {
  it('adds days across months and knows weekdays', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(weekdayIndex('2026-11-09')).toBe(0); // Monday
    expect(weekdayIndex('2026-11-15')).toBe(6); // Sunday
  });
  it('formats countdowns', () => {
    expect(formatCountdown(3 * 3600 + 12 * 60 + 49)).toBe('03:12:49');
    expect(formatCountdown(-5)).toBe('00:00:00');
  });
});

describe('calendarCells', () => {
  const weeks = calendarCells({
    month: '2026-11',
    firstDay: 9,
    lastDay: 30,
    specialDays: [{ day: 30, label: 'РОЖДЕН ДЕН' }],
    today: '2026-11-24',
  });
  const days = weeks.flat().filter((c) => c.kind === 'day');

  it('lays the campaign out in Mon-first weeks like winbet (4 weeks, next month filled in)', () => {
    expect(weeks).toHaveLength(4);
    expect(weeks[0]?.[0]).toMatchObject({ kind: 'day', day: 9 });
    expect(weeks[3]?.slice(1).map((c) => (c.kind === 'outside' ? c.day : null))).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('marks past / today / tomorrow / later days and the special day', () => {
    const state = (d: number) => days.find((c) => c.kind === 'day' && c.day === d);
    expect(state(23)).toMatchObject({ state: 'won' });
    expect(state(24)).toMatchObject({ state: 'today' });
    expect(state(25)).toMatchObject({ state: 'tomorrow' });
    expect(state(30)).toMatchObject({ state: 'soon', special: 'РОЖДЕН ДЕН' });
  });
});

describe('draw videos', () => {
  const release = { hour: 20, minute: 0 };
  it('knows which draws are out and counts down to today\'s', () => {
    const now = { dateKey: '2026-11-24', secondsOfDay: 16 * 3600 + 47 * 60 + 11 };
    expect(drawStatus('2026-11-23', now, release)).toEqual({ kind: 'released' });
    expect(drawStatus('2026-11-25', now, release)).toEqual({ kind: 'future' });
    expect(drawStatus('2026-11-24', now, release)).toEqual({ kind: 'pending', secondsLeft: 3 * 3600 + 12 * 60 + 49 });
    expect(drawStatus('2026-11-24', { ...now, secondsOfDay: 20 * 3600 }, release)).toEqual({ kind: 'released' });
  });

  it('lists every campaign day and opens on today', () => {
    expect(drawDays('2026-11-09', '2026-11-30')).toHaveLength(22);
    expect(initialDrawDay('2026-11-09', '2026-11-30', '2026-11-24')).toBe('2026-11-24');
    expect(initialDrawDay('2026-11-09', '2026-11-30', '2026-12-05')).toBe('2026-11-30');
  });

  it('builds the video URL from the pattern', () => {
    expect(drawVideoUrl('https://cdn.example.com/{DD}{MM}novemberdraw.mp4', '2026-11-09')).toBe(
      'https://cdn.example.com/0911novemberdraw.mp4',
    );
  });
});
