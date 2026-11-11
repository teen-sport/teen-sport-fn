import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toApiError } from '../../../Core/http/api-error';
import { AttendanceStatus } from '../../../Core/Models/session-status';
import { formatWeekdayDate, todayInAcademy } from '../../../shared/format';
import { attendanceErrorMessage, ROSTER_CHANGED_CODES } from '../attendance-errors';
import { AttendanceRoster, AttendanceRosterEntry } from '../attendance.models';
import { AttendanceService } from '../attendance.service';

/** Por qué no se puede tomar asistencia en una sesión (el servidor también lo rechazaría). */
type Blocked = 'cancelled' | 'future' | 'empty';

/**
 * Tomar la asistencia de una sesión (A7 y A8). Se carga la lista del grupo, el entrenador marca a
 * cada deportista como presente o ausente y guarda toda la lista de una vez: el servidor exige una
 * marca por cada deportista. Para que tomarla tarde menos de 3 minutos (RNF-05) hay un botón que
 * marca a todos como presentes y luego solo se cambian los ausentes. Guardar de nuevo corrige las
 * marcas anteriores.
 */
@Component({
  selector: 'app-attendance-form',
  imports: [RouterLink],
  templateUrl: './attendance-form.html',
  styleUrl: './attendance-form.css',
  host: { class: 'page-narrow' },
})
export class AttendanceForm {
  private readonly service = inject(AttendanceService);
  private readonly router = inject(Router);
  private readonly rawId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  private readonly today = todayInAcademy();

  protected readonly sessionId = Number(this.rawId);
  protected readonly formatWeekdayDate = formatWeekdayDate;

  protected readonly roster = signal<AttendanceRoster | null>(null);
  protected readonly marks = signal<Record<number, AttendanceStatus>>({});
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  /** Se activa al intentar guardar con deportistas sin marcar, para resaltarlos. */
  protected readonly showMissing = signal(false);

  protected readonly entries = computed(() => this.roster()?.records ?? []);
  protected readonly presentCount = computed(
    () => Object.values(this.marks()).filter((status) => status === 'PRESENT').length,
  );
  protected readonly absentCount = computed(
    () => Object.values(this.marks()).filter((status) => status === 'ABSENT').length,
  );
  protected readonly markedCount = computed(() => this.presentCount() + this.absentCount());
  protected readonly missingCount = computed(() => this.entries().length - this.markedCount());

  protected readonly blocked = computed<Blocked | null>(() => {
    const roster = this.roster();
    if (!roster) {
      return null;
    }
    if (roster.status === 'CANCELLED') {
      return 'cancelled';
    }
    if (roster.date > this.today) {
      return 'future';
    }
    return roster.records.length === 0 ? 'empty' : null;
  });

  constructor() {
    this.load();
  }

  protected load(): void {
    this.fetch(false);
  }

  protected markOf(entry: AttendanceRosterEntry): AttendanceStatus | null {
    return this.marks()[entry.athleteId] ?? null;
  }

  protected isMissing(entry: AttendanceRosterEntry): boolean {
    return this.showMissing() && this.markOf(entry) === null;
  }

  protected mark(entry: AttendanceRosterEntry, status: AttendanceStatus): void {
    this.marks.update((marks) => ({ ...marks, [entry.athleteId]: status }));
    this.formError.set(null);
  }

  protected markAllPresent(): void {
    this.marks.set(Object.fromEntries(this.entries().map((e) => [e.athleteId, 'PRESENT'])));
    this.formError.set(null);
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.formError.set(null);
    if (this.missingCount() > 0) {
      this.showMissing.set(true);
      this.formError.set(
        this.missingCount() === 1
          ? 'Falta 1 deportista por marcar.'
          : `Faltan ${this.missingCount()} deportistas por marcar.`,
      );
      return;
    }

    this.submitting.set(true);
    const records = this.entries().map((entry) => ({
      athleteId: entry.athleteId,
      status: this.marks()[entry.athleteId],
    }));
    this.service.record(this.sessionId, { records }).subscribe({
      next: () =>
        void this.router.navigate(['/coach/sessions'], { queryParams: { saved: 'attendance' } }),
      error: (error: unknown) => {
        const apiError = toApiError(error);
        this.submitting.set(false);
        if (ROSTER_CHANGED_CODES.includes(apiError.code)) {
          // La lista cambió: se vuelve a pedir y se conservan las marcas que ya había puesto.
          this.fetch(true, attendanceErrorMessage(apiError));
          return;
        }
        this.formError.set(attendanceErrorMessage(apiError));
      },
    });
  }

  private fetch(keepMarks: boolean, message: string | null = null): void {
    if (!Number.isInteger(this.sessionId)) {
      this.loadError.set('La sesión no existe.');
      this.loading.set(false);
      return;
    }
    const kept = keepMarks ? this.marks() : {};
    this.loading.set(true);
    this.loadError.set(null);
    this.service.roster(this.sessionId).subscribe({
      next: (roster) => {
        this.roster.set(roster);
        this.marks.set(this.initialMarks(roster, kept));
        this.showMissing.set(false);
        this.formError.set(message);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(attendanceErrorMessage(toApiError(error)));
        this.loading.set(false);
      },
    });
  }

  /** Marcas guardadas en el servidor; si el entrenador ya había marcado a alguien, esa marca manda. */
  private initialMarks(
    roster: AttendanceRoster,
    kept: Record<number, AttendanceStatus>,
  ): Record<number, AttendanceStatus> {
    const marks: Record<number, AttendanceStatus> = {};
    for (const entry of roster.records) {
      const status = kept[entry.athleteId] ?? entry.status;
      if (status) {
        marks[entry.athleteId] = status;
      }
    }
    return marks;
  }
}
