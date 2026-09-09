import {
  DAY_NAMES,
  DAY_SHORT,
  addDays,
  daysUntil,
  formatDateLabel,
  formatTime,
  isValidDate,
  isValidTime,
  minutesOfTime,
  parseISODate,
  toISODate,
  todayDayIndex,
  todayISO,
} from '../datetime';

describe('parsing dates', () => {
  it('rejects dates the Date constructor would silently roll over', () => {
    expect(parseISODate('2026-02-31')).toBeNull();
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(isValidDate('2027-02-29')).toBe(false);
  });

  it('rejects anything that is not a padded ISO date', () => {
    expect(parseISODate('2026-2-1')).toBeNull();
    expect(parseISODate('tomorrow')).toBeNull();
    expect(parseISODate('')).toBeNull();
  });

  it('accepts real dates, including leap days', () => {
    expect(isValidDate('2026-09-15')).toBe(true);
    expect(isValidDate('2028-02-29')).toBe(true);
  });

  it('round-trips through the local calendar, not UTC', () => {
    // new Date('2026-08-19') is UTC midnight and lands a day early west of
    // Greenwich; parsing by parts is what keeps this stable everywhere.
    expect(toISODate(parseISODate('2026-08-19')!)).toBe('2026-08-19');
  });
});

describe('relative days', () => {
  it('counts from today', () => {
    const today = todayISO();
    expect(daysUntil(today)).toBe(0);
    expect(daysUntil(addDays(today, 1))).toBe(1);
    expect(daysUntil(addDays(today, -1))).toBe(-1);
    expect(daysUntil(addDays(today, 30))).toBe(30);
  });

  it('returns null rather than NaN for junk', () => {
    expect(daysUntil('nope')).toBeNull();
  });
});

describe('date arithmetic', () => {
  it.each([
    ['2026-01-31', 1, '2026-02-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2028-02-28', 1, '2028-02-29'],
  ])('adds %s + %i days = %s', (from, days, expected) => {
    expect(addDays(from, days)).toBe(expected);
  });
});

describe('labels', () => {
  it('names the days around today', () => {
    const today = todayISO();
    expect(formatDateLabel(today)).toBe('Today');
    expect(formatDateLabel(addDays(today, 1))).toBe('Tomorrow');
    expect(formatDateLabel(addDays(today, -1))).toBe('Yesterday');
  });

  it('keeps the year on a date from another year', () => {
    expect(formatDateLabel('2019-07-04')).toBe('Thu, 4 Jul 2019');
  });

  it('passes unparseable input straight through', () => {
    expect(formatDateLabel('garbage')).toBe('garbage');
  });
});

describe('times', () => {
  it.each([
    ['23:59', true],
    ['8:30', true],
    ['24:00', false],
    ['08:60', false],
    ['half eight', false],
  ])('validates %s as %s', (value, expected) => {
    expect(isValidTime(value)).toBe(expected);
  });

  it('converts to minutes', () => {
    expect(minutesOfTime('08:30')).toBe(510);
  });

  it.each([
    ['00:00', '12:00 AM'],
    ['12:00', '12:00 PM'],
    ['13:05', '1:05 PM'],
    ['09:00', '9:00 AM'],
    ['nope', 'nope'],
  ])('formats %s as %s', (value, expected) => {
    expect(formatTime(value)).toBe(expected);
  });
});

describe('weekdays', () => {
  it('is Monday-first and agrees with the name table', () => {
    const index = todayDayIndex();
    const jsNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(7);
    expect(DAY_NAMES[index]).toBe(jsNames[new Date().getDay()]);
    expect(DAY_SHORT[index]).toBe(DAY_NAMES[index].slice(0, 3));
  });
});
