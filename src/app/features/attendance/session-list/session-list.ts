import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SessionService } from '../../../Core/Auth/session.service';
import { toApiError } from '../../../Core/http/api-error';
import { ConfirmDialog } from '../../../shared/confirm-dialog/confirm-dialog';
import {
  addDays,
  formatDate,
  formatWeekdayDate,
  startOfWeek,
  todayInAcademy,
} from '../../../shared/format';
import { StatusBadge } from '../../../shared/status-badge/status-badge';
import { Group } from '../../groups/group.models';
import { GroupService } from '../../groups/group.service';
import { attendanceErrorMessage } from '../attendance-errors';
import { TrainingSession } from '../attendance.models';
import { AttendanceService } from '../attendance.service';
import { sessionsRoute } from '../sessions-route';

const SAVED_NOTICES: Record<string, string> = {
  attendance: 'Asistencia guardada. La sesión quedó como realizada.',
  created: 'Sesión creada.',
  updated: 'Sesión reprogramada.',
};

/**
 * Calendario semanal de sesiones (A3), de lunes a domingo, con botones para ir a la semana anterior o
 * siguiente. Lo usan los tres roles y el servidor decide qué sesiones devuelve a cada uno: todas al
 * administrador (que puede filtrar por grupo), las de sus grupos al entrenador y las de los grupos
 * de sus deportistas al acudiente.
 *
 * Según el rol cambian las acciones: el administrador y el entrenador generan, crean, reprograman y
 * cancelan sesiones (A1, A2, A5 y A6); solo el entrenador toma la asistencia (A7 y A8); el acudiente
 * solo consulta.
 */
@Component({
  selector: 'app-session-list',
  imports: [ReactiveFormsModule, RouterLink, StatusBadge, ConfirmDialog],
  templateUrl: './session-list.html',
  host: {
    class: 'page-wide',
    '(document:keydown.escape)': 'closeMenu()',
    '(document:click)': 'closeMenuOnOutsideClick($event)',
  },
})
export class SessionList {
  private readonly service = inject(AttendanceService);
  private readonly groupService = inject(GroupService);
  private readonly auth = inject(SessionService);
  private readonly query = inject(ActivatedRoute).snapshot.queryParamMap;
  private readonly destroyRef = inject(DestroyRef);

  private readonly today = todayInAcademy();
  private readonly currentWeek = startOfWeek(this.today);
  private request: Subscription | null = null;

  protected readonly isAdmin = computed(() => this.auth.role() === 'ADMIN');
  protected readonly isCoach = computed(() => this.auth.role() === 'COACH');
  protected readonly isGuardian = computed(() => this.auth.role() === 'GUARDIAN');
  /** Quien administra sesiones: el administrador y el entrenador. */
  protected readonly canManage = computed(() => this.isAdmin() || this.isCoach());
  /** Ruta base de las sesiones del rol, por ejemplo «/coach/sessions». */
  protected readonly base = computed(() => sessionsRoute(this.auth.role()));
  protected readonly title = computed(() => {
    if (this.isGuardian()) {
      return 'Sesiones de mis deportistas';
    }
    return this.isAdmin() ? 'Sesiones de entrenamiento' : 'Sesiones y asistencia';
  });
  /** Frase corta bajo el título que dice para qué sirve la pantalla según el rol. */
  protected readonly lead = computed(() => {
    if (this.isGuardian()) {
      return 'Consulta cuándo entrenan tus deportistas.';
    }
    return this.isAdmin()
      ? 'Programa sesiones y revisa la asistencia de todos los grupos.'
      : 'Consulta tus sesiones, programa nuevas y toma la asistencia.';
  });
  protected readonly emptyText = computed(() => {
    if (this.isGuardian()) {
      return 'Tus deportistas no tienen sesiones programadas en esta semana.';
    }
    return this.isAdmin()
      ? 'No hay sesiones en esta semana.'
      : 'No tienes sesiones programadas en esta semana.';
  });

  protected readonly weekStart = signal(this.initialWeek());
  protected readonly weekEnd = computed(() => addDays(this.weekStart(), 6));
  protected readonly isCurrentWeek = computed(() => this.weekStart() === this.currentWeek);
  protected readonly sessions = signal<TrainingSession[] | null>(null);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly notice = signal<string | null>(this.savedNotice());
  protected readonly formatDate = formatDate;
  protected readonly formatWeekdayDate = formatWeekdayDate;

  /** Grupos para el filtro (solo administrador y entrenador). Si no cargan, no se muestra el filtro. */
  protected readonly groups = signal<Group[]>([]);
  protected readonly groupFilter = new FormControl('', { nonNullable: true });

  /** Menú «Programar» (generar o crear sesiones): abierto o cerrado. */
  protected readonly menuOpen = signal(false);

  /** Cancelación en curso: la sesión elegida, y el estado de la petición. */
  protected readonly cancelling = signal<TrainingSession | null>(null);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);

  /** Sesiones que ya pasaron (o son de hoy), no se cancelaron y todavía no tienen asistencia. */
  protected readonly pendingCount = computed(
    () => (this.sessions() ?? []).filter((session) => this.isPending(session)).length,
  );

  constructor() {
    this.load();
    if (this.canManage()) {
      this.groupService.list().subscribe({
        next: (groups) => this.groups.set(groups),
        error: () => this.groups.set([]),
      });
      this.groupFilter.valueChanges
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(() => this.load());
    }
  }

  protected load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.loadError.set(null);
    const groupId = this.groupFilter.value;
    this.request = this.service
      .listSessions({
        from: this.weekStart(),
        to: this.weekEnd(),
        groupId: groupId ? Number(groupId) : undefined,
      })
      .subscribe({
        next: (sessions) => {
          this.sessions.set(
            [...sessions].sort((a, b) =>
              `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`),
            ),
          );
          this.loading.set(false);
        },
        error: (error: unknown) => {
          this.loadError.set(attendanceErrorMessage(toApiError(error)));
          this.loading.set(false);
        },
      });
  }

  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Cierra el menú si se hace clic en cualquier parte fuera de él. */
  protected closeMenuOnOutsideClick(event: Event): void {
    if (this.menuOpen() && !(event.target as Element | null)?.closest('.schedule-menu')) {
      this.closeMenu();
    }
  }

  protected previousWeek(): void {
    this.goToWeek(addDays(this.weekStart(), -7));
  }

  protected nextWeek(): void {
    this.goToWeek(addDays(this.weekStart(), 7));
  }

  /** Vuelve a la semana de hoy. Si ya se está viendo, no hace nada (no hay por qué pedirla otra vez). */
  protected thisWeek(): void {
    if (!this.isCurrentWeek()) {
      this.goToWeek(this.currentWeek);
    }
  }

  /** La asistencia la toma el entrenador, desde el día de la sesión y mientras no esté cancelada. */
  protected canRecord(session: TrainingSession): boolean {
    return this.isCoach() && session.status !== 'CANCELLED' && session.date <= this.today;
  }

  /** Reprogramar y cancelar solo se puede con sesiones programadas (el servidor responde 409 si no). */
  protected canChange(session: TrainingSession): boolean {
    return this.canManage() && session.status === 'SCHEDULED';
  }

  protected isPending(session: TrainingSession): boolean {
    return (
      this.canManage() &&
      session.status !== 'CANCELLED' &&
      session.date <= this.today &&
      !session.attendanceRecorded
    );
  }

  /** Los deportistas del acudiente que asisten a la sesión, separados por coma. */
  protected athleteNames(session: TrainingSession): string {
    return (session.athletes ?? []).map((athlete) => athlete.firstNames).join(', ');
  }

  protected askCancel(session: TrainingSession): void {
    this.actionError.set(null);
    this.cancelling.set(session);
  }

  protected closeCancel(): void {
    this.cancelling.set(null);
  }

  /** A6: cancela la sesión elegida con el motivo escrito (el diálogo no deja confirmar sin motivo). */
  protected confirmCancel(reason: string | undefined): void {
    const session = this.cancelling();
    if (!session || !reason || this.busy()) {
      return;
    }
    this.busy.set(true);
    this.service.cancelSession(session.id, reason).subscribe({
      next: () => {
        this.busy.set(false);
        this.cancelling.set(null);
        this.notice.set('Sesión cancelada. El motivo quedó guardado en la sesión.');
        this.load();
      },
      error: (error: unknown) => {
        this.busy.set(false);
        this.cancelling.set(null);
        this.actionError.set(attendanceErrorMessage(toApiError(error)));
        // La sesión pudo cambiar de estado mientras tanto: se vuelve a pedir la semana.
        this.load();
      },
    });
  }

  private goToWeek(start: string): void {
    this.weekStart.set(start);
    this.notice.set(null);
    this.actionError.set(null);
    this.load();
  }

  /** Si la dirección trae `?date=`, se abre la semana de esa fecha (por ejemplo, la de una sesión recién creada). */
  private initialWeek(): string {
    const date = this.query.get('date');
    return date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? startOfWeek(date) : this.currentWeek;
  }

  private savedNotice(): string | null {
    return SAVED_NOTICES[this.query.get('saved') ?? ''] ?? null;
  }
}
