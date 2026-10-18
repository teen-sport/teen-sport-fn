import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { coachOption, group } from '../../../../testing/admin-fixtures';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { GroupDetail } from './group-detail';

const API = environment.apiBaseUrl;
const GROUP = `${API}/groups/11`;

describe('GroupDetail', () => {
  let fixture: ComponentFixture<GroupDetail>;
  let backend: HttpTestingController;

  async function open(
    options: { id?: string; query?: Record<string, string>; loaded?: boolean } = {},
  ): Promise<void> {
    TestBed.configureTestingModule({
      imports: [GroupDetail],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: options.id ?? '11' }),
              queryParamMap: convertToParamMap(options.query ?? {}),
            },
          },
        },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(GroupDetail);
    await fixture.whenStable();
    if (options.loaded === false) {
      return;
    }
    backend.expectOne(GROUP).flush(group());
    const coaches = backend.expectOne((req) => req.url === `${API}/coaches`);
    expect(coaches.request.params.get('status')).toBe('ACTIVE');
    coaches.flush([coachOption(), coachOption({ id: 6, userId: 9, fullName: 'Laura Peña' })]);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = <T extends HTMLElement>(id: string): T => el().querySelector<T>(`#${id}`)!;
  const buttonByText = (text: string): HTMLButtonElement | undefined =>
    Array.from(el().querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );
  const submitOf = async (selector: string): Promise<void> => {
    el().querySelector(selector)!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('shows the group with its data, its coach and its schedules', async () => {
    await open();
    expect(el().querySelector('h1')?.textContent).toContain('Fútbol sub-15');
    expect(el().querySelector('.details')?.textContent).toContain('Carlos Ruiz');
    expect(el().querySelector('.details')?.textContent).toContain('Activo');
    expect(field<HTMLInputElement>('name').value).toBe('Fútbol sub-15');
    expect(field<HTMLInputElement>('maxCapacity').value).toBe('12');
    expect(field<HTMLSelectElement>('coachId').value).toBe('5');
    expect(el().querySelector('app-schedule-manager tbody')?.textContent).toContain('Lunes');
  });

  it('shows the notice that comes after creating the group', async () => {
    await open({ query: { saved: 'created' } });
    expect(el().querySelector('.notice')?.textContent).toContain('Agrega ahora sus horarios');
  });

  it('says that the group does not exist when the address is not a valid id', async () => {
    await open({ id: 'abc', loaded: false });
    expect(el().querySelector('.alert')?.textContent).toContain('no existe');
  });

  it('shows the error with a retry button when the group cannot be loaded', async () => {
    await open({ loaded: false });
    const error = apiError({
      status: 404,
      code: 'NOT_FOUND',
      message: 'Grupo no encontrado',
    });
    backend.expectOne(GROUP).flush(error, { status: 404, statusText: error.code });
    // forkJoin cancela la otra petición cuando una falla; se retira de las pendientes.
    backend.match((req) => req.url === `${API}/coaches`);
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Grupo no encontrado');

    buttonByText('Reintentar')!.click();
    backend.expectOne(GROUP).flush(group());
    backend.expectOne((req) => req.url === `${API}/coaches`).flush([coachOption()]);
  });

  describe('name and capacity', () => {
    function type(name: string, capacity: string): void {
      const nameInput = field<HTMLInputElement>('name');
      nameInput.value = name;
      nameInput.dispatchEvent(new Event('input'));
      const capacityInput = field<HTMLInputElement>('maxCapacity');
      capacityInput.value = capacity;
      capacityInput.dispatchEvent(new Event('input'));
    }

    it('saves the changes and shows what the server answers', async () => {
      await open();
      type('  Fútbol sub-17 ', '14');
      await submitOf('form:has(#maxCapacity)');
      const request = backend.expectOne(GROUP);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ name: 'Fútbol sub-17', maxCapacity: 14 });
      request.flush(group({ name: 'Fútbol sub-17', maxCapacity: 14 }));
      await fixture.whenStable();
      expect(el().querySelector('h1')?.textContent).toContain('Fútbol sub-17');
      expect(el().querySelector('.notice')?.textContent).toContain('se guardaron');
    });

    it('does not send an empty name or a capacity above the limit', async () => {
      await open();
      type('   ', '16');
      await submitOf('form:has(#maxCapacity)');
      backend.expectNone(GROUP);
      expect(el().querySelector('#maxCapacity-error')?.textContent).toContain('máximo es 15');
    });

    it('explains next to the field that the capacity cannot go below the occupied spots', async () => {
      await open();
      type('Fútbol sub-15', '2');
      await submitOf('form:has(#maxCapacity)');
      failWith(
        backend,
        '/groups/11',
        apiError({ status: 409, code: 'CAPACITY_BELOW_OCCUPIED', message: 'x' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('#maxCapacity-error')?.textContent).toContain('cupos que ya están');
    });
  });

  describe('coach', () => {
    it('only lets the user change the coach once another one is chosen', async () => {
      await open();
      const button = () => buttonByText('Cambiar entrenador')!;
      expect(button().disabled).toBe(true);

      const select = field<HTMLSelectElement>('coachId');
      select.value = '6';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(button().disabled).toBe(false);

      select.value = '5';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      expect(button().disabled).toBe(true);
    });

    it('assigns the chosen coach and shows the updated group', async () => {
      await open();
      const select = field<HTMLSelectElement>('coachId');
      select.value = '6';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      await submitOf('form:has(#coachId)');

      const request = backend.expectOne(`${GROUP}/coach`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({ coachId: 6 });
      request.flush(group({ coach: { id: 6, fullName: 'Laura Peña' } }));
      await fixture.whenStable();
      expect(el().querySelector('.details')?.textContent).toContain('Laura Peña');
      expect(el().querySelector('.notice')?.textContent).toContain(
        'entrenador del grupo se cambió',
      );
      expect(buttonByText('Cambiar entrenador')!.disabled).toBe(true);
    });

    it('explains the schedule conflict with the new coach', async () => {
      await open();
      const select = field<HTMLSelectElement>('coachId');
      select.value = '6';
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
      await submitOf('form:has(#coachId)');
      failWith(
        backend,
        '/groups/11/coach',
        apiError({ status: 409, code: 'COACH_SCHEDULE_CONFLICT', message: 'x' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('se cruzan');
    });
  });

  describe('status', () => {
    it('asks for confirmation before deactivating and does nothing if the user cancels', async () => {
      await open();
      buttonByText('Desactivar grupo')!.click();
      await fixture.whenStable();
      expect(el().querySelector('[role="dialog"]')).toBeTruthy();
      backend.expectNone(`${GROUP}/status`);

      buttonByText('Volver')!.click();
      await fixture.whenStable();
      expect(el().querySelector('[role="dialog"]')).toBeNull();
    });

    it('deactivates after confirming and then offers to activate it again', async () => {
      await open();
      buttonByText('Desactivar grupo')!.click();
      await fixture.whenStable();
      buttonByText('Sí, desactivar')!.click();

      const request = backend.expectOne(`${GROUP}/status`);
      expect(request.request.method).toBe('PATCH');
      expect(request.request.body).toEqual({ status: 'INACTIVE' });
      request.flush(group({ status: 'INACTIVE' }));
      await fixture.whenStable();
      expect(el().querySelector('[role="dialog"]')).toBeNull();
      expect(el().querySelector('.notice')?.textContent).toContain('se desactivó');
      expect(buttonByText('Activar grupo')).toBeTruthy();
    });

    it('explains why a group with enrollments or sessions cannot be deactivated', async () => {
      await open();
      buttonByText('Desactivar grupo')!.click();
      await fixture.whenStable();
      buttonByText('Sí, desactivar')!.click();
      failWith(
        backend,
        '/groups/11/status',
        apiError({ status: 409, code: 'GROUP_HAS_ACTIVITY', message: 'x' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('inscripciones vigentes');
      expect(el().querySelector('[role="dialog"]')).toBeNull();
    });

    it('activates directly, with no confirmation', async () => {
      await open();
      buttonByText('Desactivar grupo')!.click();
      await fixture.whenStable();
      buttonByText('Sí, desactivar')!.click();
      backend.expectOne(`${GROUP}/status`).flush(group({ status: 'INACTIVE' }));
      await fixture.whenStable();

      buttonByText('Activar grupo')!.click();
      const request = backend.expectOne(`${GROUP}/status`);
      expect(request.request.body).toEqual({ status: 'ACTIVE' });
      request.flush(group());
      await fixture.whenStable();
      expect(el().querySelector('.notice')?.textContent).toContain('activo de nuevo');
    });
  });
});
