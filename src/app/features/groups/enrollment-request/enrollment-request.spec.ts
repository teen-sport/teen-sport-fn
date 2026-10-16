import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import {
  athlete,
  enrollmentDetail,
  groupAvailability,
} from '../../../../testing/guardian-fixtures';
import { Athlete } from '../../athletes/athlete.models';
import { EnrollmentDetail } from '../../enrollments/enrollment.models';
import { EnrollmentRequest } from './enrollment-request';

const URL = `${environment.apiBaseUrl}/enrollments`;

describe('EnrollmentRequest', () => {
  let fixture: ComponentFixture<EnrollmentRequest>;
  let backend: HttpTestingController;
  let requested: EnrollmentDetail[];
  let closed: number;
  let spotsChanged: number;

  async function setup(athletes: Athlete[] = [athlete(), athlete({ id: 5, firstNames: 'Juan' })]) {
    TestBed.configureTestingModule({
      imports: [EnrollmentRequest],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EnrollmentRequest);
    fixture.componentRef.setInput('group', groupAvailability());
    fixture.componentRef.setInput('period', '2026-11');
    fixture.componentRef.setInput('athletes', athletes);
    backend = TestBed.inject(HttpTestingController);
    requested = [];
    closed = 0;
    spotsChanged = 0;
    fixture.componentInstance.requested.subscribe((value) => requested.push(value));
    fixture.componentInstance.closed.subscribe(() => closed++);
    fixture.componentInstance.spotsChanged.subscribe(() => spotsChanged++);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const select = () => el().querySelector<HTMLSelectElement>('#athlete-11')!;

  async function choose(athleteId: string): Promise<void> {
    select().value = athleteId;
    select().dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  afterEach(() => backend.verify());

  it('summarizes what is being requested', async () => {
    await setup();
    const text = el().querySelector('form p')?.textContent ?? '';
    expect(text).toContain('Fútbol sub-15');
    expect(text).toContain('Noviembre de 2026');
    expect(text.replace(/\s/g, ' ')).toMatch(/\$ ?120\.000/);
  });

  it('lists the athletes of the guardian after the placeholder option', async () => {
    await setup();
    const labels = Array.from(select().options).map((option) => option.textContent?.trim());
    expect(labels).toEqual(['Elige un deportista', 'Sofía Pérez', 'Juan Pérez']);
  });

  it('asks to choose an athlete before sending', async () => {
    await setup();
    await submit();
    expect(el().querySelector('.error')?.textContent).toContain('Elige a quién');
    backend.expectNone(URL);
  });

  it('sends athlete, group and month and reports the new enrollment', async () => {
    await setup();
    await choose('5');
    await submit();

    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ athleteId: 5, groupId: 11, period: '2026-11' });
    request.flush(enrollmentDetail({ id: 77 }), { status: 201, statusText: 'Created' });
    expect(requested.map((enrollment) => enrollment.id)).toEqual([77]);
  });

  it('does not send twice while waiting for the answer', async () => {
    await setup();
    await choose('4');
    await submit();
    await submit();
    backend.expectOne(URL).flush(enrollmentDetail(), { status: 201, statusText: 'Created' });
  });

  it.each([
    ['DUPLICATE_ENROLLMENT', 409, 'ya tiene una inscripción vigente'],
    ['PERIOD_IN_PAST', 422, 'ya pasó'],
    ['AGE_OUT_OF_RANGE', 422, 'entre 12 y 17 años'],
    ['GROUP_INACTIVE', 422, 'ya no está disponible'],
  ] as const)('explains %s and lets the guardian try again', async (code, status, text) => {
    await setup();
    await choose('4');
    await submit();
    failWith(backend, '/enrollments', apiError({ status, code, message: 'texto del servidor' }));
    await fixture.whenStable();

    expect(el().querySelector('.alert')?.textContent).toContain(text);
    expect(requested).toEqual([]);
    expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });

  it('warns that the spots are gone and asks the list to refresh', async () => {
    await setup();
    await choose('4');
    await submit();
    failWith(
      backend,
      '/enrollments',
      apiError({ status: 409, code: 'NO_AVAILABLE_SPOTS', message: 'Sin cupos.' }),
    );
    await fixture.whenStable();

    expect(el().querySelector('.alert')?.textContent).toContain('Ya no quedan cupos');
    expect(spotsChanged).toBe(1);
  });

  it('suggests registering an athlete first when the guardian has none', async () => {
    await setup([]);
    expect(el().querySelector('form')).toBeNull();
    expect(el().querySelector('.notice')?.textContent).toContain('Primero registra');
    expect(el().querySelector('a[href="/guardian/athletes/new"]')).toBeTruthy();
  });

  it('closes without sending anything', async () => {
    await setup();
    el().querySelector<HTMLButtonElement>('button.btn-secondary')!.click();
    expect(closed).toBe(1);
    backend.expectNone(URL);
  });
});
