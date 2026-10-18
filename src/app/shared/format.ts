import { DayOfWeek, Schedule } from '../Core/Models/common';

/** La academia trabaja con la hora de Colombia: el mes y el día «de hoy» se calculan con ella. */
const ACADEMY_TIME_ZONE = 'America/Bogota';

const DAY_LABELS: Record<DayOfWeek, string> = {
  MONDAY: 'Lunes',
  TUESDAY: 'Martes',
  WEDNESDAY: 'Miércoles',
  THURSDAY: 'Jueves',
  FRIDAY: 'Viernes',
  SATURDAY: 'Sábado',
  SUNDAY: 'Domingo',
};

const money = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Un día de calendario «YYYY-MM-DD» en la zona de la academia. */
const academyDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: ACADEMY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const longMonth = new Intl.DateTimeFormat('es-CO', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

const longDate = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** Un instante (ISO con hora) escrito como fecha en la zona de la academia. */
const longInstantDate = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: ACADEMY_TIME_ZONE,
});

export function dayLabel(day: DayOfWeek): string {
  return DAY_LABELS[day] ?? day;
}

/** «Lunes 16:00 – 17:30» */
export function formatSchedule(schedule: Schedule): string {
  return `${dayLabel(schedule.dayOfWeek)} ${schedule.startTime} – ${schedule.endTime}`;
}

/** Valores en pesos colombianos, sin decimales: «$ 120.000». */
export function formatMoney(value: number): string {
  return money.format(value);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** «2026-10» → «Octubre de 2026». Si el texto no es un periodo válido, lo devuelve igual. */
export function formatPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) {
    return period;
  }
  return capitalize(longMonth.format(new Date(Date.UTC(+match[1], +match[2] - 1, 1))));
}

/** «2026-10-05» → «5 de octubre de 2026». Se arma con UTC para que la zona del navegador no mueva el día. */
export function formatDate(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!match) {
    return date;
  }
  return longDate.format(new Date(Date.UTC(+match[1], +match[2] - 1, +match[3])));
}

/** «2026-10-17T02:30:00Z» → «16 de octubre de 2026» (el día que era en Colombia). */
export function formatInstantDate(instant: string): string {
  const date = new Date(instant);
  return Number.isNaN(date.getTime()) ? instant : longInstantDate.format(date);
}

/** Fecha de hoy «YYYY-MM-DD» según la zona de la academia. */
export function todayInAcademy(now: Date = new Date()): string {
  return academyDay.format(now);
}

/** Mes actual «YYYY-MM» según la zona de la academia. */
export function currentPeriod(now: Date = new Date()): string {
  return todayInAcademy(now).slice(0, 7);
}

export interface PeriodOption {
  value: string;
  label: string;
}

/** El mes actual y los siguientes, para elegir el mes de inicio (el API no acepta meses pasados). */
export function periodOptions(count = 6, now: Date = new Date()): PeriodOption[] {
  const [year, month] = currentPeriod(now).split('-').map(Number);
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    const value = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return { value, label: formatPeriod(value) };
  });
}
