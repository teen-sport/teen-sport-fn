import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { coachOption, group } from '../../../../testing/admin-fixtures';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { discipline } from '../../../../testing/guardian-fixtures';
import { GroupForm } from './group-form';

const API = environment.apiBaseUrl;

describe('GroupForm', () => {
  let fixture: ComponentFixture<GroupForm>;
  let backend: HttpTestingController;
  let router: Router;

  async function open(disciplines = [discipline()], coaches = [coachOption()]): Promise<void> {
    TestBed.configureTestingModule({
      imports: [GroupForm],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    router = TestBed.inject(Router);
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GroupForm);
    await fixture.whenStable();

    const disciplineRequest = backend.expectOne((req) => req.url === `${API}/disciplines`);
    expect(disciplineRequest.request.params.get('status')).toBe('ACTIVE');
    disciplineRequest.flush(disciplines);
    const coachRequest = backend.expectOne((req) => req.url === `${API}/coaches`);
    expect(coachRequest.request.params.get('status')).toBe('ACTIVE');
    coachRequest.flush(coaches);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = <T extends HTMLElement>(id: string): T => el().querySelector<T>(`#${id}`)!;

  function fill(values: { discipline?: string; coach?: string; name?: string; capacity?: string }) {
    const set = (id: string, value: string | undefined, event: string) => {
      if (value === undefined) {
        return;
      }
      const control = field<HTMLInputElement>(id);
      control.value = value;
      control.dispatchEvent(new Event(event));
    };
    set('disciplineId', values.discipline, 'change');
    set('coachId', values.coach, 'change');
    set('name', values.name, 'input');
    set('maxCapacity', values.capacity, 'input');
  }

  const submit = async (): Promise<void> => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('offers only active disciplines and coaches', async () => {
    await open([discipline(), discipline({ id: 2, name: 'Natación' })], [coachOption()]);
    const options = (id: string) =>
      Array.from(field<HTMLSelectElement>(id).options).map((option) => option.textContent?.trim());
    expect(options('disciplineId')).toEqual(['Elige una disciplina', 'Fútbol', 'Natación']);
    expect(options('coachId')).toEqual(['Elige un entrenador', 'Carlos Ruiz']);
  });

  it('points to the missing pieces when there is no active discipline or coach', async () => {
    await open([], []);
    expect(el().querySelector('form')).toBeNull();
    expect(el().querySelector('a[href="/admin/disciplines/new"]')).toBeTruthy();
    expect(el().querySelector('a[href="/admin/coaches/new"]')).toBeTruthy();
  });

  it('only suggests what is missing', async () => {
    await open([discipline()], []);
    expect(el().querySelector('a[href="/admin/disciplines/new"]')).toBeNull();
    expect(el().querySelector('a[href="/admin/coaches/new"]')).toBeTruthy();
  });

  it('does not send anything while the data is incomplete or the capacity is out of range', async () => {
    await open();
    await submit();
    expect(el().textContent).toContain('Este campo es obligatorio');

    fill({ discipline: '1', coach: '5', name: 'Fútbol sub-15', capacity: '16' });
    await submit();
    expect(el().querySelector('#maxCapacity-error')?.textContent).toContain('máximo es 15');
    backend.expectNone(`${API}/groups`);
  });

  it('creates the group and opens its detail to add the schedules', async () => {
    await open();
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fill({ discipline: '1', coach: '5', name: '  Fútbol sub-15  ', capacity: '12' });
    await submit();

    const request = backend.expectOne(`${API}/groups`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      disciplineId: 1,
      coachId: 5,
      name: 'Fútbol sub-15',
      maxCapacity: 12,
    });
    request.flush(group());
    expect(navigate).toHaveBeenCalledWith(['/admin/groups', 11], {
      queryParams: { saved: 'created' },
    });
  });

  it('shows next to the field the capacity that the server rejects', async () => {
    await open();
    fill({ discipline: '1', coach: '5', name: 'Fútbol sub-15', capacity: '12' });
    await submit();
    failWith(
      backend,
      '/groups',
      apiError({ status: 400, code: 'INVALID_MAX_CAPACITY', message: 'x' }),
    );
    await fixture.whenStable();
    expect(el().querySelector('#maxCapacity-error')?.textContent).toContain('entre 1 y 15');
  });

  it('shows a general error and lets the user try again', async () => {
    await open();
    fill({ discipline: '1', coach: '5', name: 'Fútbol sub-15', capacity: '12' });
    await submit();
    failWith(
      backend,
      '/groups',
      apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Error del servidor' }),
    );
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Error del servidor');
    expect(el().querySelector<HTMLButtonElement>('button[type="submit"]')?.disabled).toBe(false);
  });
});
