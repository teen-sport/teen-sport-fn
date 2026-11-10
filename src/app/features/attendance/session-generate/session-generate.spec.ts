import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { trainingSession } from '../../../../testing/attendance-fixtures';
import { apiError, loginResponse } from '../../../../testing/auth-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Role } from '../../../Core/Models/role';
import { SessionGenerate } from './session-generate';

const GROUPS = `${environment.apiBaseUrl}/groups`;
const GENERATE = `${environment.apiBaseUrl}/sessions/generate`;

describe('SessionGenerate', () => {
  let fixture: ComponentFixture<SessionGenerate>;
  let backend: HttpTestingController;

  async function setup(role: Role = 'COACH', groups = [group({ id: 11 })]): Promise<void> {
    // Hoy es martes 10 de noviembre de 2026 (hora de Colombia).
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-11-10T15:00:00Z') });
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [SessionGenerate],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionService).start(loginResponse(role));
    fixture = TestBed.createComponent(SessionGenerate);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
    const request = backend.expectOne((req) => req.url === GROUPS);
    expect(request.request.params.get('status')).toBe('ACTIVE');
    request.flush(groups);
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

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  it('proposes two weeks starting today and does not allow dates before today', async () => {
    await setup();
    expect(input('dateFrom').value).toBe('2026-11-10');
    expect(input('dateTo').value).toBe('2026-11-23');
    expect(input('dateFrom').min).toBe('2026-11-10');
    expect(el().querySelector('h1')?.textContent).toContain('Generar sesiones');
  });

  it('shows the weekly schedules of the chosen group', async () => {
    await setup();
    expect(el().querySelector('.notice')).toBeNull();
    await type('groupId', '11');
    const notice = el().querySelector('.notice')!;
    expect(notice.textContent).toContain('Lunes 16:00 – 17:30');
    expect(notice.textContent).toContain('Miércoles 16:00 – 17:30');
  });

  it('warns that a group without schedules has nothing to generate, with a link for the administrator', async () => {
    await setup('ADMIN', [group({ id: 11, schedules: [] })]);
    await type('groupId', '11');
    expect(el().querySelector('.notice')?.textContent).toContain('no tiene horarios semanales');
    expect(el().querySelector('.notice a')?.getAttribute('href')).toBe('/admin/groups/11');
  });

  it('does not link the coach to the administration of groups', async () => {
    await setup('COACH', [group({ id: 11, schedules: [] })]);
    await type('groupId', '11');
    expect(el().querySelector('.notice a')).toBeNull();
  });

  it('explains how to continue when there are no active groups', async () => {
    await setup('ADMIN', []);
    expect(el().querySelector('.empty-state')?.textContent).toContain('No hay grupos activos');
    expect(el().querySelector('form')).toBeNull();
  });

  it('does not send the form without a group', async () => {
    await setup();
    await submit();
    backend.expectNone(GENERATE);
    expect(el().querySelector('#groupId-error')?.textContent).toContain('obligatorio');
  });

  it('rejects an end before the start and a range longer than 62 days', async () => {
    await setup();
    await type('groupId', '11');
    await type('dateTo', '2026-11-09');
    await submit();
    backend.expectNone(GENERATE);
    expect(el().querySelector('#dateTo-error')?.textContent).toContain('anterior a la inicial');

    await type('dateTo', '2027-01-11');
    await submit();
    backend.expectNone(GENERATE);
    expect(el().querySelector('#dateTo-error')?.textContent).toContain('62 días');
  });

  it('generates and tells how many sessions were created and how many already existed', async () => {
    await setup();
    await type('groupId', '11');
    el().querySelector<HTMLInputElement>('input[type="checkbox"]')!.click();
    await fixture.whenStable();
    await submit();

    const request = backend.expectOne(GENERATE);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      groupId: 11,
      dateFrom: '2026-11-10',
      dateTo: '2026-11-23',
      notify: true,
    });
    request.flush({
      created: 2,
      skipped: 1,
      sessions: [
        trainingSession({ id: 1, date: '2026-11-16' }),
        trainingSession({ id: 2, date: '2026-11-18' }),
      ],
    });
    await fixture.whenStable();

    const result = el().querySelector('#result-title')!.closest('section')!;
    expect(result.textContent).toContain('Se crearon 2 sesiones.');
    expect(result.textContent).toContain('Ya existía 1, así que se omitió.');
    expect(result.querySelectorAll('li').length).toBe(2);
    expect(result.textContent).toContain('Lunes, 16 de noviembre');
    expect(result.querySelector('a')?.getAttribute('href')).toBe('/coach/sessions?date=2026-11-10');
  });

  it('says so when every session already existed', async () => {
    await setup();
    await type('groupId', '11');
    await submit();
    backend.expectOne(GENERATE).flush({ created: 0, skipped: 4, sessions: [] });
    await fixture.whenStable();
    const result = el().querySelector('#result-title')!.closest('section')!;
    expect(result.textContent).toContain('No se creó ninguna sesión.');
    expect(result.textContent).toContain('Ya existían 4, así que se omitieron.');
  });

  it('says so when the range has no day with a schedule', async () => {
    await setup();
    await type('groupId', '11');
    await submit();
    backend.expectOne(GENERATE).flush({ created: 0, skipped: 0, sessions: [] });
    await fixture.whenStable();
    expect(el().querySelector('#result-title')!.closest('section')!.textContent).toContain(
      'ningún día con horario',
    );
  });

  it('shows the error of the server next to the group', async () => {
    await setup();
    await type('groupId', '11');
    await submit();
    const error = apiError({ status: 422, code: 'GROUP_WITHOUT_SCHEDULES', message: 'x' });
    backend.expectOne(GENERATE).flush(error, { status: 422, statusText: 'Unprocessable' });
    await fixture.whenStable();
    expect(el().querySelector('#groupId-error')?.textContent).toContain('no tiene horarios');
    expect(el().querySelector('#result-title')).toBeNull();
  });

  it('shows an error without a field above the form', async () => {
    await setup();
    await type('groupId', '11');
    await submit();
    const error = apiError({ status: 403, code: 'ACCESS_DENIED', message: 'no' });
    backend.expectOne(GENERATE).flush(error, { status: 403, statusText: 'Forbidden' });
    await fixture.whenStable();
    expect(el().querySelector('form .alert')?.textContent).toContain('no es de uno de tus grupos');
  });
});
