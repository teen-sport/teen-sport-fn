import {
  addDays,
  currentPeriod,
  dayLabel,
  formatDate,
  formatHours,
  formatInstantDate,
  formatMoney,
  formatPercent,
  formatPeriod,
  formatSchedule,
  formatWeekdayDate,
  periodOptions,
  periodRange,
  startOfWeek,
  todayInAcademy,
} from './format';

describe('format helpers', () => {
  it('writes a schedule in Spanish', () => {
    expect(
      formatSchedule({ id: 1, dayOfWeek: 'MONDAY', startTime: '16:00', endTime: '17:30' }),
    ).toBe('Lunes 16:00 – 17:30');
    expect(dayLabel('SATURDAY')).toBe('Sábado');
  });

  it('writes money in Colombian pesos without decimals', () => {
    expect(formatMoney(120000).replace(/\s/g, ' ')).toMatch(/^\$ ?120\.000$/);
  });

  it.each([
    ['2026-10', 'Octubre de 2026'],
    ['2027-01', 'Enero de 2027'],
  ])('writes the period %s as «%s»', (period, expected) => {
    expect(formatPeriod(period)).toBe(expected);
  });

  it('leaves a value that is not a period or a date as it came', () => {
    expect(formatPeriod('pronto')).toBe('pronto');
    expect(formatDate('pronto')).toBe('pronto');
  });

  it('writes a date without moving the day with the time zone', () => {
    expect(formatDate('2026-10-05')).toBe('5 de octubre de 2026');
    expect(formatDate('2026-01-01')).toBe('1 de enero de 2026');
  });

  it('writes an instant with the day it was in Colombia', () => {
    expect(formatInstantDate('2026-10-17T02:30:00Z')).toBe('16 de octubre de 2026');
    expect(formatInstantDate('2026-10-16T15:00:00Z')).toBe('16 de octubre de 2026');
    expect(formatInstantDate('pronto')).toBe('pronto');
  });

  it('uses the academy day (Bogotá), not the UTC day', () => {
    // 02:30 UTC del 17 de octubre = 21:30 del 16 de octubre en Colombia.
    const now = new Date('2026-10-17T02:30:00Z');
    expect(todayInAcademy(now)).toBe('2026-10-16');
    expect(currentPeriod(new Date('2026-11-01T03:00:00Z'))).toBe('2026-10');
  });

  it('offers the current month and the following ones, crossing the year', () => {
    const options = periodOptions(4, new Date('2026-11-20T15:00:00Z'));
    expect(options.map((option) => option.value)).toEqual([
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
    ]);
    expect(options[0].label).toBe('Noviembre de 2026');
  });

  it('lists a range of months around the current one', () => {
    const options = periodRange(2, 1, new Date('2026-01-20T15:00:00Z'));
    expect(options.map((option) => option.value)).toEqual([
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
    ]);
    expect(options[1].label).toBe('Diciembre de 2025');
  });
});

describe('days and weeks', () => {
  it('adds and subtracts days across months and years', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-01-02', -3)).toBe('2025-12-30');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
  });

  it('leaves a text that is not a day as it is', () => {
    expect(addDays('mañana', 1)).toBe('mañana');
    expect(startOfWeek('mañana')).toBe('mañana');
    expect(formatWeekdayDate('mañana')).toBe('mañana');
  });

  it.each([
    ['2026-11-09', '2026-11-09'], // lunes
    ['2026-11-10', '2026-11-09'], // martes
    ['2026-11-15', '2026-11-09'], // domingo
    ['2026-11-16', '2026-11-16'], // lunes siguiente
  ])('starts the week of %s on Monday %s', (day, monday) => {
    expect(startOfWeek(day)).toBe(monday);
  });

  it('writes the weekday with the date', () => {
    expect(formatWeekdayDate('2026-11-10')).toBe('Martes, 10 de noviembre');
  });

  it('writes a percentage with at most one decimal and a dash when there is no data', () => {
    expect(formatPercent(84.2)).toBe('84,2 %');
    expect(formatPercent(100)).toBe('100 %');
    expect(formatPercent(66.666)).toBe('66,7 %');
    expect(formatPercent(0)).toBe('0 %');
    expect(formatPercent(null)).toBe('—');
    expect(formatPercent(undefined)).toBe('—');
  });

  it('writes hours with at most one decimal and a dash when there is no data', () => {
    expect(formatHours(18.5)).toBe('18,5 h');
    expect(formatHours(24)).toBe('24 h');
    expect(formatHours(null)).toBe('—');
  });
});
