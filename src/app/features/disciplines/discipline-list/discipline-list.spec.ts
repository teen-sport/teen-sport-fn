import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { discipline } from '../../../../testing/guardian-fixtures';
import { DisciplineList } from './discipline-list';

const URL = `${environment.apiBaseUrl}/disciplines`;

describe('DisciplineList', () => {
  let fixture: ComponentFixture<DisciplineList>;
  let backend: HttpTestingController;

  async function setup(queryParams: Record<string, string> = {}): Promise<void> {
    TestBed.configureTestingModule({
      imports: [DisciplineList],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap(queryParams) } },
        },
      ],
    });
    fixture = TestBed.createComponent(DisciplineList);
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const list = () => backend.expectOne((req) => req.url === URL);
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );

  afterEach(() => backend.verify());

  it('lists the disciplines with their fee and status', async () => {
    await setup();
    list().flush([discipline(), discipline({ id: 2, name: 'Natación', status: 'INACTIVE' })]);
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Fútbol');
    expect(rows[0].textContent).toContain('120.000');
    expect(rows[0].textContent).toContain('Activo');
    expect(rows[1].textContent).toContain('Inactivo');
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/admin/disciplines/1/edit');
  });

  it('offers to deactivate an active one and to activate an inactive one', async () => {
    await setup();
    list().flush([discipline(), discipline({ id: 2, name: 'Natación', status: 'INACTIVE' })]);
    await fixture.whenStable();
    const rows = el().querySelectorAll('tbody tr');
    expect(rows[0].textContent).toContain('Desactivar');
    expect(rows[1].textContent).toContain('Activar');
  });

  it('invites to create the first discipline when there are none', async () => {
    await setup();
    list().flush([]);
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('Crea la primera');
    expect(el().querySelector('a[href="/admin/disciplines/new"]')).toBeTruthy();
  });

  it('reloads with the chosen status', async () => {
    await setup();
    list().flush([discipline()]);
    await fixture.whenStable();

    const select = el().querySelector<HTMLSelectElement>('#status')!;
    select.value = 'INACTIVE';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const request = list();
    expect(request.request.params.get('status')).toBe('INACTIVE');
    request.flush([]);
  });

  it('asks for confirmation before deactivating and then changes the status', async () => {
    await setup();
    list().flush([discipline()]);
    await fixture.whenStable();

    buttonByText('Desactivar')!.click();
    await fixture.whenStable();
    expect(el().querySelector('[role="dialog"]')?.textContent).toContain('«Fútbol»');
    backend.expectNone(`${URL}/1/status`);

    buttonByText('Sí, desactivar')!.click();
    const patch = backend.expectOne(`${URL}/1/status`);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ status: 'INACTIVE' });
    patch.flush(discipline({ status: 'INACTIVE' }));
    await fixture.whenStable();

    list().flush([discipline({ status: 'INACTIVE' })]);
    await fixture.whenStable();
    expect(el().querySelector('[role="status"]')?.textContent).toContain('se desactivó');
    expect(el().querySelector('[role="dialog"]')).toBeNull();
  });

  it('does nothing when the confirmation is dismissed', async () => {
    await setup();
    list().flush([discipline()]);
    await fixture.whenStable();

    buttonByText('Desactivar')!.click();
    await fixture.whenStable();
    buttonByText('Volver')!.click();
    await fixture.whenStable();

    expect(el().querySelector('[role="dialog"]')).toBeNull();
    backend.expectNone(`${URL}/1/status`);
  });

  it('explains why a discipline with active groups cannot be deactivated', async () => {
    await setup();
    list().flush([discipline()]);
    await fixture.whenStable();
    buttonByText('Desactivar')!.click();
    await fixture.whenStable();
    buttonByText('Sí, desactivar')!.click();
    failWith(
      backend,
      '/disciplines/1/status',
      apiError({ status: 409, code: 'DISCIPLINE_HAS_ACTIVE_GROUPS', message: 'x' }),
    );
    await fixture.whenStable();

    expect(el().querySelector('.alert')?.textContent).toContain('grupos activos');
    expect(el().querySelector('[role="dialog"]')).toBeNull();
  });

  it('activates directly, with no confirmation', async () => {
    await setup();
    list().flush([discipline({ status: 'INACTIVE' })]);
    await fixture.whenStable();
    buttonByText('Activar')!.click();
    const patch = backend.expectOne(`${URL}/1/status`);
    expect(patch.request.body).toEqual({ status: 'ACTIVE' });
    patch.flush(discipline());
    await fixture.whenStable();
    list().flush([discipline()]);
  });

  it('shows the notice that comes after saving a discipline', async () => {
    await setup({ saved: 'created' });
    list().flush([discipline()]);
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('Disciplina creada');
  });

  it('shows the error with a retry button when loading fails', async () => {
    await setup();
    failWith(
      backend,
      '/disciplines',
      apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' }),
    );
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla');
    buttonByText('Reintentar')!.click();
    list().flush([]);
  });
});
