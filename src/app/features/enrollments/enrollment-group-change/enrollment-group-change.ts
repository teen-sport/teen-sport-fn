import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { toApiError } from '../../../Core/http/api-error';
import { firstError } from '../../../shared/form-errors';
import { GroupAvailability } from '../../catalog/catalog.models';
import { adminEnrollmentErrorMessage } from '../enrollment-errors';
import { EnrollmentDetail } from '../enrollment.models';
import { EnrollmentService } from '../enrollment.service';
import { groupOptionLabel } from '../group-options';

/**
 * Cambio de grupo de una inscripción activa (E13). El servidor exige que el grupo nuevo sea activo,
 * de la misma disciplina y tenga cupo; la inscripción conserva su mes de inicio. Avisa con `changed`.
 */
@Component({
  selector: 'app-enrollment-group-change',
  imports: [ReactiveFormsModule],
  templateUrl: './enrollment-group-change.html',
})
export class EnrollmentGroupChange {
  private readonly service = inject(EnrollmentService);

  readonly enrollment = input.required<EnrollmentDetail>();
  readonly groups = input<GroupAvailability[]>([]);
  readonly changed = output<string>();

  protected readonly firstError = firstError;
  protected readonly groupOptionLabel = groupOptionLabel;

  protected readonly groupId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });
  protected readonly otherGroups = computed(() =>
    this.groups().filter((group) => group.groupId !== this.enrollment().group.id),
  );

  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  protected submit(): void {
    if (this.busy()) {
      return;
    }
    this.actionError.set(null);
    if (this.groupId.invalid) {
      this.groupId.markAsTouched();
      return;
    }
    const target = this.otherGroups().find((group) => `${group.groupId}` === this.groupId.value);
    this.busy.set(true);
    this.service.changeGroup(this.enrollment().id, Number(this.groupId.value)).subscribe({
      next: () => {
        this.busy.set(false);
        this.groupId.reset('');
        this.changed.emit(`La inscripción pasó al grupo ${target?.groupName ?? 'elegido'}.`);
      },
      error: (error: unknown) => {
        this.actionError.set(adminEnrollmentErrorMessage(toApiError(error)));
        this.busy.set(false);
      },
    });
  }
}
