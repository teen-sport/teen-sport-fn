import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { trainingSession } from '../../../../testing/attendance-fixtures';
import { apiError, loginResponse } from '../../../../testing/auth-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Role } from '../../../Core/Models/role';
import { SessionForm } from './session-form';

const SESSIONS = `${environment.apiBaseUrl}/sessions`;
const GROUPS = `${environment.apiBaseUrl}/groups`;

describe('SessionForm', () => {
  let fixture: ComponentFixture<SessionForm>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(role: Role = 'COACH', id: string | null = null): Promise<void> {
    // Hoy es martes 10 de noviembre de 2026 (hora de Colombia).
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T15:00:00Z') });
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SessionForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
      ],
    });
    TestBed.inject(SessionService).start(loginResponse(role));
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(SessionForm);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const input = (id: string) => el().querySelector<HTMLInputElement>(`#${id}`)!;
  const type = async (id: string, value: string): Promise<void> => {
    const field = input(id);
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };
  const loadGroups = async (groups = [group({ id: 4, name: 'Sub-15 A' })]): Promise<void> => {
    const request = backend.expectOne((req) => req.url === GROUPS);
    expect(request.request.params.get('status')).toBe('ACTIVE');
    request.flush(groups);
    await fixture.whenStable();
  };

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  describe('creating a session', () => {
    it('asks only for the active groups and shows them with their discipline', async () => {
      await setup();
      await loadGroups();
      expect(el().querySelector('h1')?.textContent).toContain('Nueva sesión');
      expect(el().querySelector('#groupId')?.textContent).toContain('Sub-15 A · Fútbol');
      expect(input('date').min).toBe('2026-11-10');
    });

    it('explains how to continue when there are no active groups', async () => {
      await setup('ADMIN');
      await loadGroups([]);
      expect(el().querySelector('.empty-state')?.textContent).toContain('No hay grupos activos');
      expect(el().querySelector('a[href="/admin/groups/new"]')).toBeTruthy();
      expect(el().querySelector('form')).toBeNull();
    });

    it('says the coach has no active groups, without offering to create one', async () => {
      await setup('COACH');
      await loadGroups([]);
      expect(el().querySelector('.empty-state')?.textContent).toContain('No tienes grupos activos');
      expect(el().querySelector('a[href="/admin/groups/new"]')).toBeNull();
    });

    it('does not send an empty form and marks the missing fields', async () => {
      await setup();
      await loadGroups();
      await submit();
      backend.expectNone(SESSIONS);
      expect(el().querySelector('#groupId-error')?.textContent).toContain('obligatorio');
      expect(el().querySelector('#date-error')?.textContent).toContain('obligatorio');
      expect(el().querySelector('#startTime-error')).toBeTruthy();
    });

    it('rejects a date in the past and an end that is not after the start', async () => {
      await setup();
      await loadGroups();
      await type('groupId', '4');
      await type('date', '2026-11-09');
      await type('startTime', '17:00');
      await type('endTime', '16:00');
      await submit();
      backend.expectNone(SESSIONS);
      expect(el().querySelector('#date-error')?.textContent).toContain('anterior a hoy');
      expect(el().querySelector('#endTime-error')?.textContent).toContain('posterior');
      expect(input('endTime').getAttribute('aria-invalid')).toBe('true');
    });

    it('creates the session and goes to the week of its date', async () => {
      await setup();
      await loadGroups();
      await type('groupId', '4');
      await type('date', '2026-11-12');
      await type('startTime', '16:00');
      await type('endTime', '17:30');
      await type('notes', '  Partido amistoso ');
      await submit();

      const request = backend.expectOne(SESSIONS);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        groupId: 4,
        date: '2026-11-12',
        startTime: '16:00',
        endTime: '17:30',
        notes: 'Partido amistoso',
      });
      request.flush(trainingSession({ date: '2026-11-12' }));
      await fixture.whenStable();
      expect(router.navigate).toHaveBeenCalledWith(['/coach/sessions'], {
        queryParams: { saved: 'created', date: '2026-11-12' },
      });
    });

    it('does not send the notes when they are left blank', async () => {
      await setup('ADMIN');
      await loadGroups();
      await type('groupId', '4');
      await type('date', '2026-11-12');
      await type('startTime', '16:00');
      await type('endTime', '17:30');
      await type('notes', '   ');
      await submit();
      const request = backend.expectOne(SESSIONS);
      expect(request.request.body.notes).toBeUndefined();
      request.flush(trainingSession());
      await fixture.whenStable();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/sessions'], expect.anything());
    });

    it('shows a duplicated session next to the start time and lets the user fix it', async () => {
      await setup();
      await loadGroups();
      await type('groupId', '4');
      await type('date', '2026-11-12');
      await type('startTime', '16:00');
      await type('endTime', '17:30');
      await submit();

      const error = apiError({ status: 409, code: 'DUPLICATE_SESSION', message: 'duplicada' });
      backend.expectOne(SESSIONS).flush(error, { status: 409, statusText: 'Conflict' });
      await fixture.whenStable();

      expect(el().querySelector('#startTime-error')?.textContent).toContain('misma fecha y hora');
      expect(router.navigate).not.toHaveBeenCalled();
      expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
    });

    it('shows an error without a field above the form', async () => {
      await setup();
      await loadGroups();
      await type('groupId', '4');
      await type('date', '2026-11-12');
      await type('startTime', '16:00');
      await type('endTime', '17:30');
      await submit();
      const error = apiError({ status: 403, code: 'ACCESS_DENIED', message: 'no' });
      backend.expectOne(SESSIONS).flush(error, { status: 403, statusText: 'Forbidden' });
      await fixture.whenStable();
      expect(el().querySelector('form .alert')?.textContent).toContain(
        'no es de uno de tus grupos',
      );
    });

    it('shows the error with a retry button when the groups do not load', async () => {
      await setup();
      const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' });
      backend
        .expectOne((req) => req.url === GROUPS)
        .flush(error, { status: 500, statusText: 'Server Error' });
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('Falla');
      el().querySelector<HTMLButtonElement>('button')!.click();
      await loadGroups();
    });
  });

  describe('rescheduling a session', () => {
    it('fills the form with the session and keeps its group fixed', async () => {
      await setup('COACH', '31');
      backend
        .expectOne(`${SESSIONS}/31`)
        .flush(trainingSession({ date: '2026-11-13', notes: 'Traer balones' }));
      await fixture.whenStable();

      expect(el().querySelector('h1')?.textContent).toContain('Reprogramar sesión');
      expect(el().querySelector('.hint')?.textContent).toContain('Sub-15 A');
      expect(el().querySelector('#groupId')).toBeNull();
      expect(input('date').value).toBe('2026-11-13');
      expect(input('startTime').value).toBe('16:00');
      expect(input('endTime').value).toBe('17:30');
      expect(el().querySelector<HTMLTextAreaElement>('#notes')!.value).toBe('Traer balones');
    });

    it('saves the new date and hours with PUT and goes to that week', async () => {
      await setup('ADMIN', '31');
      backend.expectOne(`${SESSIONS}/31`).flush(trainingSession());
      await fixture.whenStable();
      await type('date', '2026-11-14');
      await type('startTime', '09:00');
      await type('endTime', '10:30');
      await submit();

      const request = backend.expectOne(`${SESSIONS}/31`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({
        date: '2026-11-14',
        startTime: '09:00',
        endTime: '10:30',
        notes: undefined,
      });
      request.flush(trainingSession({ date: '2026-11-14' }));
      await fixture.whenStable();
      expect(router.navigate).toHaveBeenCalledWith(['/admin/sessions'], {
        queryParams: { saved: 'updated', date: '2026-11-14' },
      });
    });

    it('does not offer the form for a session that is no longer programmed', async () => {
      await setup('COACH', '31');
      backend.expectOne(`${SESSIONS}/31`).flush(trainingSession({ status: 'CANCELLED' }));
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('ya no está programada');
      expect(el().querySelector('form')).toBeNull();
    });

    it('explains that the session does not exist', async () => {
      await setup('COACH', '31');
      const error = apiError({ status: 404, code: 'NOT_FOUND', message: 'x' });
      backend.expectOne(`${SESSIONS}/31`).flush(error, { status: 404, statusText: 'Not Found' });
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('La sesión no existe');
      expect(el().querySelector('a[href="/coach/sessions"]')).toBeTruthy();
    });
  });
});
