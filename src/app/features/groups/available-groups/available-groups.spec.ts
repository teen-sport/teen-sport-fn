import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import {
  athlete,
  discipline,
  enrollmentDetail,
  groupAvailability,
  page,
} from '../../../../testing/guardian-fixtures';
import { Athlete } from '../../athletes/athlete.models';
import { GroupAvailability } from '../../catalog/catalog.models';
import { AvailableGroups } from './available-groups';

const BASE = environment.apiBaseUrl;

describe('AvailableGroups', () => {
  let fixture: ComponentFixture<AvailableGroups>;
  let backend: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    // Solo se congela la fecha: el mes actual es 2026-10 y las esperas de Angular siguen normales.
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-16T15:00:00Z'));
  });

  afterEach(() => {
    backend.verify();
    vi.useRealTimers();
  });

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const availability = () => backend.expectOne((req) => req.url === `${BASE}/availability`);

  async function start(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [AvailableGroups],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AvailableGroups);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  }

  /** Responde las dos consultas iniciales (disciplinas y deportistas) y deja pendiente la de grupos. */
  async function answerSetup(athletes: Athlete[] = [athlete()]): Promise<void> {
    backend
      .expectOne(`${BASE}/disciplines`)
      .flush([discipline(), discipline({ id: 2, name: 'Baloncesto' })]);
    backend.expectOne((req) => req.url === `${BASE}/athletes`).flush(page(athletes));
    await fixture.whenStable();
  }

  async function load(
    groups: GroupAvailability[] = [groupAvailability()],
    athletes: Athlete[] = [athlete()],
  ): Promise<void> {
    await start();
    await answerSetup(athletes);
    availability().flush(groups);
    await fixture.whenStable();
  }

  function choose(id: string, value: string): void {
    const select = el().querySelector<HTMLSelectElement>(`#${id}`)!;
    select.value = value;
    select.dispatchEvent(new Event('change'));
  }

  it('loads disciplines and athletes first, then the groups of the current month', async () => {
    await start();
    backend.expectNone((req) => req.url === `${BASE}/availability`);
    expect(el().textContent).toContain('Cargando');

    await answerSetup();
    const request = availability();
    expect(request.request.params.get('period')).toBe('2026-10');
    expect(request.request.params.has('disciplineId')).toBe(false);
    request.flush([groupAvailability()]);
    await fixture.whenStable();

    const card = el().querySelector('.group')!;
    expect(card.querySelector('h2')?.textContent).toContain('Fútbol sub-15');
    expect(card.textContent).toContain('Carlos Ruiz');
    expect(card.textContent).toContain('6 de 20 disponibles');
    expect(card.textContent).toContain('Lunes 16:00 – 17:30');
    expect(card.textContent).toContain('Miércoles 16:00 – 17:30');
    expect(card.textContent?.replace(/\s/g, ' ')).toMatch(/\$ ?120\.000/);
  });

  it('offers the current month and the next five', async () => {
    await load();
    const values = Array.from(el().querySelectorAll<HTMLOptionElement>('#period option')).map(
      (option) => option.value,
    );
    expect(values).toEqual(['2026-10', '2026-11', '2026-12', '2027-01', '2027-02', '2027-03']);
  });

  it('lists the disciplines in the filter', async () => {
    await load();
    const labels = Array.from(el().querySelectorAll('#disciplineId option')).map((o) =>
      o.textContent?.trim(),
    );
    expect(labels).toEqual(['Todas', 'Fútbol', 'Baloncesto']);
  });

  it('asks again with the new month when the month changes', async () => {
    await load();
    choose('period', '2026-12');
    await fixture.whenStable();
    const request = availability();
    expect(request.request.params.get('period')).toBe('2026-12');
    request.flush([]);
  });

  it('asks again with the discipline when one is chosen', async () => {
    await load();
    choose('disciplineId', '2');
    await fixture.whenStable();
    const request = availability();
    expect(request.request.params.get('disciplineId')).toBe('2');
    request.flush([]);
  });

  it('explains that there are no groups for the filters', async () => {
    await load([]);
    expect(el().querySelector('.group')).toBeNull();
    expect(el().querySelector('.empty-state')?.textContent).toContain('No hay grupos disponibles');
  });

  it('disables the request button of a full group', async () => {
    await load([groupAvailability({ availableSpots: 0 })]);
    expect(el().querySelector('.spots')?.textContent).toContain('Sin cupos disponibles');
    expect(el().querySelector<HTMLButtonElement>('.group .actions button')!.disabled).toBe(true);
  });

  it('opens and closes the request panel of one group', async () => {
    await load();
    const button = el().querySelector<HTMLButtonElement>('.group .actions button')!;
    expect(el().querySelector('app-enrollment-request')).toBeNull();
    button.click();
    await fixture.whenStable();
    expect(el().querySelector('app-enrollment-request')).toBeTruthy();
    expect(button.getAttribute('aria-expanded')).toBe('true');
    button.click();
    await fixture.whenStable();
    expect(el().querySelector('app-enrollment-request')).toBeNull();
  });

  it('closes the panel when the filters change', async () => {
    await load();
    el().querySelector<HTMLButtonElement>('.group .actions button')!.click();
    await fixture.whenStable();
    choose('period', '2026-11');
    await fixture.whenStable();
    availability().flush([groupAvailability()]);
    await fixture.whenStable();
    expect(el().querySelector('app-enrollment-request')).toBeNull();
  });

  it('sends the request for the chosen month and goes to the new enrollment', async () => {
    await load();
    choose('period', '2026-11');
    await fixture.whenStable();
    availability().flush([groupAvailability()]);
    await fixture.whenStable();

    el().querySelector<HTMLButtonElement>('.group .actions button')!.click();
    await fixture.whenStable();
    choose('athlete-11', '4');
    await fixture.whenStable();
    el().querySelector('app-enrollment-request form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const request = backend.expectOne(`${BASE}/enrollments`);
    expect(request.request.body).toEqual({ athleteId: 4, groupId: 11, period: '2026-11' });
    request.flush(enrollmentDetail({ id: 21 }), { status: 201, statusText: 'Created' });
    expect(router.navigate).toHaveBeenCalledWith(['/guardian/enrollments', 21], {
      queryParams: { requested: 1 },
    });
  });

  it('refreshes the groups when the server says the spots ran out', async () => {
    await load();
    el().querySelector<HTMLButtonElement>('.group .actions button')!.click();
    await fixture.whenStable();
    choose('athlete-11', '4');
    await fixture.whenStable();
    el().querySelector('app-enrollment-request form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    failWith(
      backend,
      '/enrollments',
      apiError({ status: 409, code: 'NO_AVAILABLE_SPOTS', message: 'Sin cupos.' }),
    );
    await fixture.whenStable();

    // El panel sigue abierto con su mensaje mientras se refrescan los cupos.
    expect(el().querySelector('app-enrollment-request .alert')?.textContent).toContain(
      'Ya no quedan cupos',
    );
    availability().flush([groupAvailability({ availableSpots: 0 })]);
    await fixture.whenStable();
    expect(el().querySelector('.spots')?.textContent).toContain('Sin cupos disponibles');
    expect(el().querySelector('app-enrollment-request .alert')?.textContent).toContain(
      'Ya no quedan cupos',
    );
  });

  it('suggests registering an athlete when the guardian has none', async () => {
    await load([groupAvailability()], []);
    el().querySelector<HTMLButtonElement>('.group .actions button')!.click();
    await fixture.whenStable();
    expect(el().querySelector('app-enrollment-request .notice')?.textContent).toContain(
      'Primero registra',
    );
  });

  it('shows the error of the first load and retries it', async () => {
    await start();
    backend
      .expectOne(`${BASE}/disciplines`)
      .flush(apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }), {
        status: 500,
        statusText: 'Server Error',
      });
    // Al fallar una de las dos consultas iniciales, la otra se cancela.
    expect(backend.expectOne((req) => req.url === `${BASE}/athletes`).cancelled).toBe(true);
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Error del servidor.');
    expect(el().querySelector('form.toolbar')).toBeNull();

    el().querySelector<HTMLButtonElement>('.alert + button')!.click();
    await fixture.whenStable();
    await answerSetup();
    availability().flush([groupAvailability()]);
    await fixture.whenStable();
    expect(el().querySelector('.group')).toBeTruthy();
  });

  it('shows the error of the groups and retries only that', async () => {
    await start();
    await answerSetup();
    availability().flush(
      apiError({ status: 422, code: 'PERIOD_IN_PAST', message: 'El mes ya pasó.' }),
      { status: 422, statusText: 'Unprocessable' },
    );
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('El mes ya pasó.');
    expect(el().querySelector('form.toolbar')).toBeTruthy();

    el().querySelector<HTMLButtonElement>('.alert + button')!.click();
    await fixture.whenStable();
    availability().flush([groupAvailability()]);
    await fixture.whenStable();
    expect(el().querySelector('.group')).toBeTruthy();
  });

  it('ignores the answer of an old query when the filters change quickly', async () => {
    await load();
    choose('period', '2026-11');
    await fixture.whenStable();
    const first = availability();
    choose('period', '2026-12');
    await fixture.whenStable();
    const second = availability();

    second.flush([groupAvailability({ groupName: 'Grupo de diciembre' })]);
    await fixture.whenStable();
    expect(first.cancelled).toBe(true);
    expect(el().querySelector('.group h2')?.textContent).toContain('Grupo de diciembre');
  });
});
