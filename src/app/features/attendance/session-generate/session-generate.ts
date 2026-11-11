import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { map, startWith } from 'rxjs';
import { SessionService } from '../../../Core/Auth/session.service';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import {
  addDays,
  formatDate,
  formatSchedule,
  formatWeekdayDate,
  todayInAcademy,
} from '../../../shared/format';
import { dateRangeWithin, notPastDate } from '../../../shared/validators';
import { Group } from '../../groups/group.models';
import { GroupService } from '../../groups/group.service';
import { attendanceErrorMessage, friendlySessionError } from '../attendance-errors';
import { GenerateSessionsResponse } from '../attendance.models';
import { AttendanceService } from '../attendance.service';
import { sessionsRoute } from '../sessions-route';

/** El servidor acepta rangos de hasta 62 días, contando los dos extremos. */
const MAX_DAYS = 62;
/** Por omisión se proponen dos semanas, que es lo que se suele publicar por adelantado. */
const DEFAULT_DAYS = 14;

/**
 * Generar las sesiones de un grupo (A2): por cada horario semanal del grupo y cada día del rango se
 * crea una sesión, y las que ya existen con la misma fecha y hora de inicio se omiten, así que se
 * puede repetir sin duplicar. Muestra cuántas se crearon y cuántas ya existían. El administrador
 * puede generar las de cualquier grupo; el entrenador, solo las de sus grupos (el servidor lo
 * controla, y la lista de grupos que recibe ya es solo la suya).
 */
@Component({
  selector: 'app-session-generate',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './session-generate.html',
  host: { class: 'page-narrow' },
})
export class SessionGenerate {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(AttendanceService);
  private readonly groupService = inject(GroupService);
  private readonly auth = inject(SessionService);

  protected readonly base = computed(() => sessionsRoute(this.auth.role()));
  protected readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  protected readonly firstError = firstError;
  protected readonly formatSchedule = formatSchedule;
  protected readonly formatDate = formatDate;
  protected readonly formatWeekdayDate = formatWeekdayDate;
  protected readonly today = todayInAcademy();
  protected readonly maxDays = MAX_DAYS;

  protected readonly groups = signal<Group[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly result = signal<GenerateSessionsResponse | null>(null);
  /** Desde qué fecha se generó, para abrir esa semana al pasar a ver las sesiones. */
  protected readonly generatedFrom = signal(this.today);

  protected readonly form = this.fb.group(
    {
      groupId: ['', [Validators.required]],
      dateFrom: [this.today, [Validators.required, notPastDate]],
      dateTo: [addDays(this.today, DEFAULT_DAYS - 1), [Validators.required]],
      notify: [false],
    },
    { validators: dateRangeWithin('dateFrom', 'dateTo', MAX_DAYS) },
  );

  private readonly selectedId = toSignal(
    this.form.controls.groupId.valueChanges.pipe(
      startWith(this.form.controls.groupId.value),
      map((value) => Number(value) || null),
    ),
    { initialValue: null },
  );

  /** El grupo elegido, para mostrar sus horarios: de ahí salen las sesiones que se van a crear. */
  protected readonly selectedGroup = computed(
    () => this.groups().find((group) => group.id === this.selectedId()) ?? null,
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    // Solo grupos activos: el servidor rechaza generar sesiones de un grupo inactivo.
    this.groupService.list({ status: 'ACTIVE' }).subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.loading.set(false);
      },
      error: (error: unknown) => {
        this.loadError.set(attendanceErrorMessage(toApiError(error)));
        this.loading.set(false);
      },
    });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.formError.set(null);
    this.result.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    this.service
      .generateSessions({
        groupId: Number(value.groupId),
        dateFrom: value.dateFrom,
        dateTo: value.dateTo,
        notify: value.notify,
      })
      .subscribe({
        next: (result) => {
          this.generatedFrom.set(value.dateFrom);
          this.result.set(result);
          this.submitting.set(false);
        },
        error: (error: unknown) => {
          this.formError.set(
            applyServerError(this.form, friendlySessionError(toApiError(error)), {
              GROUP_INACTIVE: 'groupId',
              GROUP_WITHOUT_SCHEDULES: 'groupId',
              DATE_IN_PAST: 'dateFrom',
            }),
          );
          this.submitting.set(false);
        },
      });
  }
}
