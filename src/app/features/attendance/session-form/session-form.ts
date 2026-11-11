import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionService } from '../../../Core/Auth/session.service';
import { toApiError } from '../../../Core/http/api-error';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { formatWeekdayDate, todayInAcademy } from '../../../shared/format';
import { endAfterStart, notPastDate } from '../../../shared/validators';
import { Group } from '../../groups/group.models';
import { GroupService } from '../../groups/group.service';
import { attendanceErrorMessage, friendlySessionError } from '../attendance-errors';
import { CreateSessionRequest, TrainingSession } from '../attendance.models';
import { AttendanceService } from '../attendance.service';
import { sessionsRoute } from '../sessions-route';

const MAX_NOTES = 500;

/**
 * Crear una sesión suelta (A1) o reprogramar una existente (A5), según la dirección traiga o no el
 * `:id`. Una sesión suelta puede caer en un día u hora distintos a los horarios del grupo. Al
 * reprogramar no se cambia el grupo: solo la fecha, las horas y las notas. Las reglas (fecha no
 * anterior a hoy, hora de fin posterior, sin otra sesión igual) se avisan aquí antes de enviar y las
 * decide el servidor, cuyo error se muestra junto al campo que corresponde.
 */
@Component({
  selector: 'app-session-form',
  imports: [NgTemplateOutlet, ReactiveFormsModule, RouterLink],
  templateUrl: './session-form.html',
  host: { class: 'page-narrow' },
})
export class SessionForm {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(AttendanceService);
  private readonly groupService = inject(GroupService);
  private readonly router = inject(Router);
  private readonly auth = inject(SessionService);
  private readonly sessionId = Number(inject(ActivatedRoute).snapshot.paramMap.get('id')) || null;

  protected readonly editing = this.sessionId !== null;
  protected readonly base = computed(() => sessionsRoute(this.auth.role()));
  protected readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  protected readonly firstError = firstError;
  protected readonly formatWeekdayDate = formatWeekdayDate;
  protected readonly today = todayInAcademy();
  protected readonly maxNotes = MAX_NOTES;

  protected readonly groups = signal<Group[]>([]);
  /** La sesión que se reprograma (solo al editar). */
  protected readonly session = signal<TrainingSession | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly submitting = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group(
    {
      groupId: ['', this.editing ? [] : [Validators.required]],
      date: ['', [Validators.required, notPastDate]],
      startTime: ['', [Validators.required]],
      endTime: ['', [Validators.required]],
      notes: ['', [Validators.maxLength(MAX_NOTES)]],
    },
    { validators: endAfterStart('startTime', 'endTime') },
  );

  constructor() {
    this.load();
  }

  protected load(): void {
    this.loading.set(true);
    this.loadError.set(null);
    if (this.sessionId !== null) {
      this.service.getSession(this.sessionId).subscribe({
        next: (session) => {
          this.session.set(session);
          this.form.patchValue({
            date: session.date,
            startTime: session.startTime,
            endTime: session.endTime,
            notes: session.notes ?? '',
          });
          this.loading.set(false);
        },
        error: (error: unknown) => this.failLoad(error),
      });
      return;
    }
    // Solo se ofrecen grupos activos: el servidor rechaza sesiones en un grupo inactivo.
    this.groupService.list({ status: 'ACTIVE' }).subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.loading.set(false);
      },
      error: (error: unknown) => this.failLoad(error),
    });
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    const value = this.form.getRawValue();
    const notes = value.notes.trim() || undefined;
    const times = { date: value.date, startTime: value.startTime, endTime: value.endTime, notes };
    const request =
      this.sessionId !== null
        ? this.service.updateSession(this.sessionId, times)
        : this.service.createSession({
            groupId: Number(value.groupId),
            ...times,
          } satisfies CreateSessionRequest);

    request.subscribe({
      next: (saved) =>
        void this.router.navigate([this.base()], {
          queryParams: { saved: this.editing ? 'updated' : 'created', date: saved.date },
        }),
      error: (error: unknown) => {
        this.formError.set(
          applyServerError(this.form, friendlySessionError(toApiError(error)), {
            DATE_IN_PAST: 'date',
            INVALID_TIME_RANGE: 'endTime',
            DUPLICATE_SESSION: 'startTime',
            GROUP_INACTIVE: 'groupId',
          }),
        );
        this.submitting.set(false);
      },
    });
  }

  private failLoad(error: unknown): void {
    this.loadError.set(attendanceErrorMessage(toApiError(error)));
    this.loading.set(false);
  }
}
