import { Component, computed, inject, signal } from '@angular/core';
import { SessionService } from '../../../Core/Auth/session.service';
import { Group } from '../../groups/group.models';
import { GroupService } from '../../groups/group.service';
import { AttendanceReport } from '../attendance-report/attendance-report';
import { EnrollmentReport } from '../enrollment-report/enrollment-report';
import { RecurrentAbsences } from '../recurrent-absences/recurrent-absences';

/**
 * Reportes e indicadores. Reúne las tres secciones y les presta la lista de grupos para sus
 * filtros: asistencia y cobertura (R2) e inasistencias seguidas (R4) para el administrador y el
 * entrenador (que ve solo sus grupos), e inscripciones del mes (R1) solo para el administrador.
 */
@Component({
  selector: 'app-reports-page',
  imports: [AttendanceReport, RecurrentAbsences, EnrollmentReport],
  templateUrl: './reports-page.html',
  host: { class: 'page-wide' },
})
export class ReportsPage {
  private readonly groupService = inject(GroupService);
  private readonly auth = inject(SessionService);

  protected readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  protected readonly groups = signal<Group[]>([]);

  constructor() {
    this.groupService.list().subscribe({
      next: (groups) => this.groups.set(groups),
      error: () => this.groups.set([]),
    });
  }
}
