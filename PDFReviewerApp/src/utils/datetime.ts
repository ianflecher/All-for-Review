/**
 * Date and time helpers for the planner, wallet and schedule screens.
 *
 * Formatting is done by hand rather than through toLocaleDateString, because
 * Intl support varies between Hermes builds and a missing locale database
 * would turn every date on the screen into a crash or a raw timestamp.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Monday-first, which is how a class timetable reads. */
export const DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];
export const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/**
 * Parses "YYYY-MM-DD" as a local date.
 *
 * `new Date('2026-08-16')` would read as UTC midnight and land on the previous
 * day west of Greenwich, so the parts are pulled out and rebuilt locally. The
 * round-trip check rejects dates the Date constructor would silently roll over,
 * like 2026-02-31 becoming 3 March.
 */
export function parseISODate(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function isValidDate(iso: string): boolean {
  return parseISODate(iso) !== null;
}

export function addDays(iso: string, days: number): string {
  const date = parseISODate(iso) ?? new Date();
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/** Whole days from today. Negative means overdue. Rounded, so DST cannot skew it. */
export function daysUntil(iso: string): number | null {
  const target = parseISODate(iso);
  if (!target) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export function formatDateLabel(iso: string): string {
  const date = parseISODate(iso);
  const days = daysUntil(iso);
  if (!date || days === null) return iso;

  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';

  const base = `${WEEKDAYS[date.getDay()]}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
  return date.getFullYear() === new Date().getFullYear()
    ? base
    : `${base} ${date.getFullYear()}`;
}

export function isValidTime(value: string): boolean {
  return /^([01]?\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

export function minutesOfTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

export function formatTime(value: string): string {
  if (!isValidTime(value)) return value;
  const [hours, minutes] = value.split(':').map(Number);
  const period = hours < 12 ? 'AM' : 'PM';
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${pad(minutes)} ${period}`;
}

/** 0 = Monday, matching DAY_NAMES. */
export function todayDayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

export function minutesNow(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}
