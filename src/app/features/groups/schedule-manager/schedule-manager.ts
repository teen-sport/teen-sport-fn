import { Component, inject, input, linkedSignal, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toApiError } from '../../../Core/http/api-error';
import { DayOfWeek, Schedule } from '../../../Core/Models/common';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import { applyServerError, firstError } from '../../../shared/form-errors';
import { dayLabel, formatSchedule } from '../../../shared/format';
import { adminErrorMessage, friendlyError } from '../../admin/admin-errors';
import { GroupService } from '../group.service';

const DAYS: DayOfWeek[] = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

/** Los horarios se muestran de lunes a domingo y, dentro de cada día, por hora de inicio. */
function sorted(schedules: Schedule[]): Schedule[] {
  return [...schedules].sort(
    (a, b) =>
      DAYS.indexOf(a.dayOfWeek) - DAYS.indexOf(b.dayOfWeek) ||
      a.startTime.localeCompare(b.startTime),
  );
}

/**
 * Horarios semanales de un grupo (H12 a H14): agregar, editar y eliminar franjas. El servidor es
 * quien decide si una franja es válida (hora de fin posterior a la de inicio y sin cruces con otras
 * franjas del grupo ni del entrenador); aquí solo se muestra su respuesta. La lista se mantiene al
 * día con lo que el servidor devuelve, sin volver a pedir todo el grupo.
 */
@Component({
  selector: 'app-schedule-manager',
  imports: [ReactiveFormsModule, ConfirmDialog],
  templateUrl: './schedule-manager.html',
})
export class ScheduleManager {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(GroupService);

  readonly groupId = input.required<number>();
  /** Horarios con los que llega el grupo; después los cambios se llevan en `items`. */
  readonly schedules = input.required<Schedule[]>();

  protected readonly items = linkedSignal(() => sorted(this.schedules()));
  protected readonly editingId = signal<number | null>(null);
  protected readonly deleting = signal<Schedule | null>(null);
  protected readonly submitting = signal(false);
  protected readonly busy = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly actionError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(null);

  protected readonly days = DAYS.map((value) => ({ value, label: dayLabel(value) }));
  protected readonly firstError = firstError;
  protected readonly formatSchedule = formatSchedule;
  protected readonly dayLabel = dayLabel;

  protected readonly form = this.fb.group({
    dayOfWeek: this.fb.control<DayOfWeek>('MONDAY', [Validators.required]),
    startTime: ['', [Validators.required]],
    endTime: ['', [Validators.required]],
  });

  protected edit(schedule: Schedule): void {
    this.clearMessages();
    this.editingId.set(schedule.id);
    this.form.setValue({
      dayOfWeek: schedule.dayOfWeek,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
    });
  }

  protected cancelEdit(): void {
    this.clearMessages();
    this.resetForm();
  }

  protected submit(): void {
    if (this.submitting()) {
      return;
    }
    this.clearMessages();
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue();
    const editingId = this.editingId();
    this.submitting.set(true);
    const call =
      editingId === null
        ? this.service.addSchedule(this.groupId(), request)
        : this.service.updateSchedule(editingId, request);
    call.subscribe({
      next: (saved) => {
        this.items.update((current) =>
          sorted(
            editingId === null
              ? [...current, saved]
              : current.map((s) => (s.id === saved.id ? saved : s)),
          ),
        );
        this.notice.set(editingId === null ? 'Horario agregado.' : 'Horario actualizado.');
        this.submitting.set(false);
        this.resetForm();
      },
      error: (error: unknown) => {
        this.formError.set(
          applyServerError(this.form, friendlyError(toApiError(error)), {
            INVALID_TIME_RANGE: 'endTime',
          }),
        );
        this.submitting.set(false);
      },
    });
  }

  protected askToDelete(schedule: Schedule): void {
    this.clearMessages();
    this.deleting.set(schedule);
  }

  protected cancelDelete(): void {
    this.deleting.set(null);
  }

  protected confirmDelete(): void {
    const schedule = this.deleting();
    if (!schedule || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.service.deleteSchedule(schedule.id).subscribe({
      next: () => {
        this.items.update((current) => current.filter((s) => s.id !== schedule.id));
        if (this.editingId() === schedule.id) {
          this.resetForm();
        }
        this.notice.set('Horario eliminado.');
        this.busy.set(false);
        this.deleting.set(null);
      },
      error: (error: unknown) => {
        this.actionError.set(adminErrorMessage(toApiError(error)));
        this.busy.set(false);
        this.deleting.set(null);
      },
    });
  }

  /** Deja el formulario como al principio: vacío y listo para agregar un horario nuevo. */
  private resetForm(): void {
    this.editingId.set(null);
    this.form.reset({ dayOfWeek: 'MONDAY', startTime: '', endTime: '' });
  }

  private clearMessages(): void {
    this.formError.set(null);
    this.actionError.set(null);
    this.notice.set(null);
  }
}
