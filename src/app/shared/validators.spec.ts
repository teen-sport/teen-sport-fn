import { FormControl, FormGroup } from '@angular/forms';
import {
  checkPassword,
  dateRangeWithin,
  endAfterStart,
  maxUtf8Bytes,
  notBlank,
  notFutureDate,
  notPastDate,
  sameValue,
  strongPassword,
} from './validators';

describe('password policy', () => {
  it('accepts a password with every rule', () => {
    expect(Object.values(checkPassword('Entrena#2026')).every(Boolean)).toBe(true);
    expect(strongPassword(new FormControl('Entrena#2026'))).toBeNull();
  });

  it.each([
    ['Ab1#', 'length'],
    ['entrena#2026', 'uppercase'],
    ['ENTRENA#2026', 'lowercase'],
    ['Entrena####', 'digit'],
    ['Entrena2026', 'symbol'],
  ] as const)('reports the missing rule for %s', (password, rule) => {
    expect(checkPassword(password)[rule]).toBe(false);
    expect(strongPassword(new FormControl(password))).toEqual({ weakpassword: true });
  });

  it('does not count spaces as symbols', () => {
    expect(checkPassword('Entrena 2026').symbol).toBe(false);
  });

  it('counts bytes, not characters, against the 72 limit', () => {
    const tooManyBytes = 'Añ1#'.repeat(20); // 80 characters, 100 bytes
    expect(checkPassword(tooManyBytes).length).toBe(false);
    expect(maxUtf8Bytes(72)(new FormControl(tooManyBytes))).toEqual({ maxbytes: { max: 72 } });
    expect(maxUtf8Bytes(72)(new FormControl('a'.repeat(72)))).toBeNull();
  });
});

describe('sameValue', () => {
  it('fails when the two values differ', () => {
    const group = new FormGroup(
      { a: new FormControl('x'), b: new FormControl('y') },
      { validators: [sameValue('a', 'b')] },
    );
    expect(group.errors).toEqual({ mismatch: true });
    group.controls.b.setValue('x');
    expect(group.errors).toBeNull();
  });
});

describe('notBlank', () => {
  it('rejects values made only of spaces', () => {
    expect(notBlank(new FormControl('   '))).toEqual({ required: true });
    expect(notBlank(new FormControl(' Ana '))).toBeNull();
  });
});

describe('notFutureDate', () => {
  afterEach(() => vi.useRealTimers());

  it('accepts an empty field, today and past dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T15:00:00Z'));
    expect(notFutureDate(new FormControl(''))).toBeNull();
    expect(notFutureDate(new FormControl('2026-10-16'))).toBeNull();
    expect(notFutureDate(new FormControl('2010-05-14'))).toBeNull();
  });

  it('rejects a date after today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-16T15:00:00Z'));
    expect(notFutureDate(new FormControl('2026-10-17'))).toEqual({ futuredate: true });
  });

  it('uses the day in Colombia, not the UTC day', () => {
    vi.useFakeTimers();
    // En UTC ya es 17 de octubre, pero en Colombia todavía es 16.
    vi.setSystemTime(new Date('2026-10-17T02:30:00Z'));
    expect(notFutureDate(new FormControl('2026-10-16'))).toBeNull();
    expect(notFutureDate(new FormControl('2026-10-17'))).toEqual({ futuredate: true });
  });
});

describe('notPastDate', () => {
  afterEach(() => vi.useRealTimers());

  it('accepts an empty field, today and later dates', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T15:00:00Z'));
    expect(notPastDate(new FormControl(''))).toBeNull();
    expect(notPastDate(new FormControl('2026-11-10'))).toBeNull();
    expect(notPastDate(new FormControl('2026-12-01'))).toBeNull();
  });

  it('rejects a date before today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T15:00:00Z'));
    expect(notPastDate(new FormControl('2026-11-09'))).toEqual({ pastdate: true });
  });
});

describe('endAfterStart', () => {
  const group = (start: string, end: string) =>
    new FormGroup({ start: new FormControl(start), end: new FormControl(end) });
  const validate = endAfterStart('start', 'end');

  it('accepts an end later than the start, and does not judge while a field is empty', () => {
    expect(validate(group('16:00', '17:30'))).toBeNull();
    expect(validate(group('16:00', ''))).toBeNull();
    expect(validate(group('', '17:30'))).toBeNull();
  });

  it('rejects an end equal to or before the start', () => {
    expect(validate(group('16:00', '16:00'))).toEqual({ timerange: true });
    expect(validate(group('16:00', '15:00'))).toEqual({ timerange: true });
  });
});

describe('dateRangeWithin', () => {
  const group = (from: string, to: string) =>
    new FormGroup({ from: new FormControl(from), to: new FormControl(to) });
  const validate = dateRangeWithin('from', 'to', 62);

  it('accepts a range of one day up to the maximum, and does not judge while a date is empty', () => {
    expect(validate(group('2026-11-10', '2026-11-10'))).toBeNull();
    // 62 días contando los dos extremos: del 10 de noviembre al 10 de enero.
    expect(validate(group('2026-11-10', '2027-01-10'))).toBeNull();
    expect(validate(group('2026-11-10', ''))).toBeNull();
  });

  it('rejects an end before the start', () => {
    expect(validate(group('2026-11-10', '2026-11-09'))).toEqual({ daterange: true });
  });

  it('rejects a range longer than the maximum', () => {
    expect(validate(group('2026-11-10', '2027-01-11'))).toEqual({ rangetoolong: true });
  });
});
