import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { apiError } from '../../../../testing/auth-fixtures';
import { discipline, enrollmentSummary, page } from '../../../../testing/guardian-fixtures';
import { AdminEnrollmentList } from './admin-enrollment-list';

const API = environment.apiBaseUrl;

describe('AdminEnrollmentList', () => {
  let fixture: ComponentFixture<AdminEnrollmentList>;
  let backend: HttpTestingController;

  const volleyball = discipline({ id: 2, name: 'Voleibol' });
  const volleyGroup = group({
    id: 12,
    name: 'Voleibol sub-17',
    discipline: { id: 2, name: 'Voleibol' },
  });

  async function setup(): Promise<void> {
    TestBed.configureTestingModule({
      imports: [AdminEnrollmentList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(AdminEnrollmentList);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  /** Responde las disciplinas y los grupos con los que se arman los filtros. */
  async function answerSetup(): Promise<void> {
    backend.expectOne((req) => req.url === `${API}/disciplines`).flush([discipline(), volleyball]);
    backend.expectOne((req) => req.url === `${API}/groups`).flush([group(), volleyGroup]);
    await fixture.whenStable();
  }

  const list = () => backend.expectOne((req) => req.url === `${API}/enrollments`);
  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const select = (id: string): HTMLSelectElement =>
    el().querySelector<HTMLSelectElement>(`#${id}`)!;
  const choose = async (id: string, value: string): Promise<void> => {
    const control = select(id);
    control.value = value;
    control.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const optionTexts = (id: string): string[] =>
    Array.from(select(id).options).map((option) => option.textContent!.trim());

  async function open(rows = [enrollmentSummary()]): Promise<void> {
    await setup();
    await answerSetup();
    list().flush(page(rows));
    await fixture.whenStable();
  }

  afterEach(() => backend.verify());

  it('loads the disciplines and the groups first and then the first page of 10', async () => {
    await setup();
    expect(backend.match((req) => req.url === `${API}/enrollments`)).toHaveLength(0);
    await answerSetup();
    const request = list();
    expect(request.request.params.get('page')).toBe('0');
    expect(request.request.params.get('size')).toBe('10');
    for (const name of ['status', 'paymentStatus', 'period', 'disciplineId', 'groupId']) {
      expect(request.request.params.has(name)).toBe(false);
    }
    expect(request.request.params.has('paymentReported')).toBe(false);
    request.flush(page([]));
  });

  it('shows each enrollment with its status, payment and a link to review it', async () => {
    await open([
      enrollmentSummary(),
      enrollmentSummary({
        id: 22,
        status: 'ACTIVE',
        paymentStatus: 'UP_TO_DATE',
        athlete: { id: 5, firstNames: 'Juan', lastNames: 'Pérez' },
      }),
      enrollmentSummary({ id: 23, status: 'REJECTED' }),
    ]);
    const rows = el().querySelectorAll('tbody tr');
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('Sofía Pérez');
    expect(rows[0].textContent).toContain('Fútbol · Fútbol sub-15');
    expect(rows[0].textContent).toContain('Noviembre de 2026');
    expect(rows[0].textContent).toContain('En revisión');
    expect(rows[0].textContent).toContain('Pago pendiente');
    expect(rows[0].querySelector('a')?.textContent).toContain('Revisar');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/enrollments/21');
    expect(rows[1].textContent).toContain('Al día');
    expect(rows[1].querySelector('a')?.textContent).toContain('Ver detalle');
    expect(rows[2].textContent).toContain('Rechazada');
  });

  it('does not show a payment for an enrollment that is no longer in force', async () => {
    await open([enrollmentSummary({ status: 'CANCELLED' })]);
    const cells = el().querySelectorAll('tbody tr td');
    expect(cells[3].textContent?.trim()).toBe('—');
  });

  it('marks the enrollments whose payment the guardian reported', async () => {
    await open([enrollmentSummary({ status: 'ACTIVE', paymentReported: true })]);
    expect(el().querySelector('.reported')?.textContent).toContain('Pago avisado');
  });

  it('offers the disciplines and, for the chosen one, only its groups', async () => {
    await open();
    expect(optionTexts('disciplineId')).toEqual(['Todas', 'Fútbol', 'Voleibol']);
    expect(optionTexts('groupId')).toEqual(['Todos', 'Fútbol sub-15', 'Voleibol sub-17']);

    await choose('disciplineId', '2');
    list().flush(page([]));
    await fixture.whenStable();
    expect(optionTexts('groupId')).toEqual(['Todos', 'Voleibol sub-17']);
  });

  it.each([
    ['status', 'ACTIVE', 'status'],
    ['paymentStatus', 'OVERDUE', 'paymentStatus'],
    ['period', '2026-11', 'period'],
    ['disciplineId', '2', 'disciplineId'],
    ['groupId', '11', 'groupId'],
  ])('filters by %s and goes back to the first page', async (id, value, param) => {
    await open();
    await choose(id, value);
    const request = list();
    expect(request.request.params.get(param)).toBe(value);
    expect(request.request.params.get('page')).toBe('0');
    request.flush(page([]));
  });

  it('filters the enrollments with a reported payment', async () => {
    await open();
    const box = el().querySelector<HTMLInputElement>('input[type=checkbox]')!;
    box.click();
    await fixture.whenStable();
    const request = list();
    expect(request.request.params.get('paymentReported')).toBe('true');
    request.flush(page([]));
  });

  it('clears the group when the discipline changes, with a single request', async () => {
    await open();
    await choose('groupId', '11');
    list().flush(page([]));
    await fixture.whenStable();

    await choose('disciplineId', '2');
    const request = list();
    expect(request.request.params.get('disciplineId')).toBe('2');
    expect(request.request.params.has('groupId')).toBe(false);
    request.flush(page([]));
    await fixture.whenStable();
    expect(select('groupId').value).toBe('');
  });

  it('says that nothing matches the filters and offers to clear them', async () => {
    await open();
    await choose('status', 'REJECTED');
    list().flush(page([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('con esos filtros');

    el().querySelector<HTMLButtonElement>('.empty-state button')!.click();
    await fixture.whenStable();
    const request = list();
    expect(request.request.params.has('status')).toBe(false);
    request.flush(page([enrollmentSummary()]));
    await fixture.whenStable();
    expect(el().querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('says that there are no enrollments yet when nothing is filtered', async () => {
    await open([]);
    expect(el().querySelector('.empty-state')?.textContent).toContain(
      'Todavía no hay inscripciones',
    );
  });

  it('goes to another page', async () => {
    await setup();
    await answerSetup();
    list().flush(page([enrollmentSummary()], { totalPages: 3, totalElements: 25 }));
    await fixture.whenStable();
    const next = Array.from(el().querySelectorAll<HTMLButtonElement>('app-pagination button')).find(
      (button) => button.textContent?.includes('Siguiente'),
    )!;
    next.click();
    await fixture.whenStable();
    const request = list();
    expect(request.request.params.get('page')).toBe('1');
    request.flush(page([], { page: 1, totalPages: 3 }));
  });

  it('shows the error of the list and tries again', async () => {
    await setup();
    await answerSetup();
    list().flush(
      apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }),
      {
        status: 500,
        statusText: 'Server Error',
      },
    );
    await fixture.whenStable();
    expect(el().querySelector('[role=alert]')?.textContent).toContain('Error del servidor.');
    el().querySelector<HTMLButtonElement>('button')!.click();
    list().flush(page([enrollmentSummary()]));
    await fixture.whenStable();
    expect(el().querySelectorAll('tbody tr')).toHaveLength(1);
  });

  it('shows the error of the filters and tries again without asking for the list', async () => {
    await setup();
    backend
      .expectOne((req) => req.url === `${API}/disciplines`)
      .flush(apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor.' }), {
        status: 500,
        statusText: 'Server Error',
      });
    backend.match((req) => req.url === `${API}/groups`);
    await fixture.whenStable();
    expect(el().querySelector('[role=alert]')?.textContent).toContain('Error del servidor.');
    expect(el().querySelector('form.toolbar')).toBeNull();

    el().querySelector<HTMLButtonElement>('button')!.click();
    await answerSetup();
    list().flush(page([]));
  });
});
