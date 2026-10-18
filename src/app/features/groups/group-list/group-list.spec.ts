import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { coachOption, group } from '../../../../testing/admin-fixtures';
import { apiError } from '../../../../testing/auth-fixtures';
import { discipline } from '../../../../testing/guardian-fixtures';
import { GroupList } from './group-list';

const API = environment.apiBaseUrl;

describe('GroupList', () => {
  let fixture: ComponentFixture<GroupList>;
  let backend: HttpTestingController;

  const disciplines = () => backend.expectOne((req) => req.url === `${API}/disciplines`);
  const coaches = () => backend.expectOne((req) => req.url === `${API}/coaches`);
  const groups = () => backend.expectOne((req) => req.url === `${API}/groups`);

  /** Responde lo que se pide al abrir la pantalla: disciplinas, entrenadores y después los grupos. */
  async function open(list = [group()]): Promise<void> {
    disciplines().flush([discipline(), discipline({ id: 2, name: 'Natación' })]);
    coaches().flush([coachOption(), coachOption({ id: 6, userId: 9, fullName: 'Laura Peña' })]);
    await fixture.whenStable();
    groups().flush(list);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [GroupList],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(GroupList);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('loads the filters first and then the groups, without any filter', async () => {
    await fixture.whenStable();
    disciplines().flush([discipline()]);
    coaches().flush([coachOption()]);
    await fixture.whenStable();
    const request = groups();
    expect(request.request.params.keys()).toEqual([]);
    request.flush([]);
  });

  it('shows each group with its discipline, coach, capacity, schedules and a link to its detail', async () => {
    await fixture.whenStable();
    await open();
    const row = el().querySelector('tbody tr')!;
    expect(row.textContent).toContain('Fútbol sub-15');
    expect(row.textContent).toContain('Fútbol');
    expect(row.textContent).toContain('Carlos Ruiz');
    expect(row.textContent).toContain('12');
    expect(row.textContent).toContain('Lunes 16:00 – 17:30');
    expect(row.textContent).toContain('Miércoles 16:00 – 17:30');
    expect(row.textContent).toContain('Activo');
    expect(row.querySelector('a')?.getAttribute('href')).toBe('/admin/groups/11');
  });

  it('says when a group has no schedules yet', async () => {
    await fixture.whenStable();
    await open([group({ schedules: [] })]);
    expect(el().querySelector('tbody')?.textContent).toContain('Sin horarios');
  });

  it('explains what is needed when there are no groups at all', async () => {
    await fixture.whenStable();
    await open([]);
    expect(el().querySelector('.empty-state')?.textContent).toContain('al menos una disciplina');
  });

  it('asks the server again with the chosen filters and says so when nothing matches', async () => {
    await fixture.whenStable();
    await open();

    const discipline = el().querySelector<HTMLSelectElement>('#disciplineId')!;
    discipline.value = '2';
    discipline.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    let request = groups();
    expect(request.request.params.get('disciplineId')).toBe('2');
    request.flush([group()]);
    await fixture.whenStable();

    const coach = el().querySelector<HTMLSelectElement>('#coachId')!;
    coach.value = '6';
    coach.dispatchEvent(new Event('change'));
    const status = el().querySelector<HTMLSelectElement>('#status')!;
    status.value = 'INACTIVE';
    status.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    const requests = backend.match((req) => req.url === `${API}/groups`);
    request = requests[requests.length - 1];
    expect(request.request.params.get('disciplineId')).toBe('2');
    expect(request.request.params.get('coachId')).toBe('6');
    expect(request.request.params.get('status')).toBe('INACTIVE');
    requests.forEach((r) => r.flush([]));
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('con esos filtros');
  });

  it('shows the error with a retry button when the filters cannot be loaded', async () => {
    await fixture.whenStable();
    const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' });
    disciplines().flush(error, { status: 500, statusText: error.code });
    // forkJoin cancela la otra petición cuando una falla; se retira de las pendientes.
    backend.match((req) => req.url === `${API}/coaches`);
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla');

    buttonByText('Reintentar')!.click();
    disciplines().flush([]);
    coaches().flush([]);
    await fixture.whenStable();
    groups().flush([]);
  });

  it('shows the error with a retry button when the groups cannot be loaded', async () => {
    await fixture.whenStable();
    disciplines().flush([discipline()]);
    coaches().flush([coachOption()]);
    await fixture.whenStable();
    const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Sin conexión' });
    groups().flush(error, { status: 500, statusText: error.code });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Sin conexión');

    buttonByText('Reintentar')!.click();
    groups().flush([]);
  });
});
