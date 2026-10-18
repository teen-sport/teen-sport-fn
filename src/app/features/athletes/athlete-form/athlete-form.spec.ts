import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { athlete } from '../../../../testing/guardian-fixtures';
import { AthleteForm } from './athlete-form';

const URL = `${environment.apiBaseUrl}/athletes`;

describe('AthleteForm', () => {
  let fixture: ComponentFixture<AthleteForm>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(id: string | null = null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [AthleteForm],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id === null ? {} : { id }) } },
        },
      ],
    });
    fixture = TestBed.createComponent(AthleteForm);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (id: string) => el().querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;

  function type(id: string, value: string): void {
    const control = field(id);
    control.value = value;
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? 'change' : 'input'));
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  function fillValid(): void {
    type('firstNames', '  Sofía ');
    type('lastNames', 'Pérez');
    type('idNumber', ' 1098765432 ');
    type('birthDate', '2011-03-02');
  }

  afterEach(() => backend.verify());

  describe('registering', () => {
    it('shows the registration title, the age rule and Tarjeta de identidad by default', async () => {
      await setup();
      expect(el().querySelector('h1')?.textContent).toContain('Registrar deportista');
      expect(el().querySelector('.hint')?.textContent).toContain('12 a 17 años');
      expect(field('idType').value).toBe('TI');
      backend.expectNone(URL);
    });

    it('does not send anything when required fields are empty', async () => {
      await setup();
      await submit();
      expect(el().querySelector('#firstNames-error')?.textContent).toContain('obligatorio');
      expect(el().querySelector('#lastNames-error')).toBeTruthy();
      expect(el().querySelector('#idNumber-error')).toBeTruthy();
      expect(el().querySelector('#birthDate-error')).toBeTruthy();
      backend.expectNone(URL);
    });

    it('rejects a birth date in the future', async () => {
      await setup();
      fillValid();
      type('birthDate', '2999-01-01');
      await submit();
      expect(el().querySelector('#birthDate-error')?.textContent).toContain('posterior a hoy');
      backend.expectNone(URL);
    });

    it('sends the trimmed data without gender and goes back to the list', async () => {
      await setup();
      fillValid();
      await submit();

      const request = backend.expectOne(URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({
        firstNames: 'Sofía',
        lastNames: 'Pérez',
        idType: 'TI',
        idNumber: '1098765432',
        birthDate: '2011-03-02',
      });
      request.flush(athlete(), { status: 201, statusText: 'Created' });
      expect(router.navigate).toHaveBeenCalledWith(['/guardian/athletes'], {
        queryParams: { saved: 'created' },
      });
    });

    it('includes the gender and the document type when they are chosen', async () => {
      await setup();
      fillValid();
      type('idType', 'CE');
      type('gender', 'FEMALE');
      await submit();
      const request = backend.expectOne(URL);
      expect(request.request.body).toMatchObject({ idType: 'CE', gender: 'FEMALE' });
      request.flush(athlete(), { status: 201, statusText: 'Created' });
    });

    it('puts the age error of the server on the birth date field', async () => {
      await setup();
      fillValid();
      await submit();
      failWith(
        backend,
        '/athletes',
        apiError({
          status: 422,
          code: 'AGE_OUT_OF_RANGE',
          message: 'El deportista debe tener entre 12 y 17 años.',
        }),
      );
      await fixture.whenStable();
      expect(el().querySelector('#birthDate-error')?.textContent).toContain('entre 12 y 17 años');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('puts the duplicate document error on the document number field', async () => {
      await setup();
      fillValid();
      await submit();
      failWith(
        backend,
        '/athletes',
        apiError({
          status: 409,
          code: 'DUPLICATE_ATHLETE',
          message: 'Ya existe un deportista con ese número de documento.',
        }),
      );
      await fixture.whenStable();
      expect(el().querySelector('#idNumber-error')?.textContent).toContain(
        'Ya existe un deportista',
      );
      expect(el().querySelector('.alert')).toBeNull();
    });

    it('shows a general message for an error that belongs to no field', async () => {
      await setup();
      fillValid();
      await submit();
      failWith(
        backend,
        '/athletes',
        apiError({
          status: 422,
          code: 'DATA_POLICY_NOT_ACCEPTED',
          message: 'Debes aceptar la política de datos.',
        }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('política de datos');
    });

    it('does not send twice while the first request is in progress', async () => {
      await setup();
      fillValid();
      await submit();
      await submit();
      backend.expectOne(URL).flush(athlete(), { status: 201, statusText: 'Created' });
    });
  });

  describe('editing', () => {
    it('loads the athlete and pre-fills the form', async () => {
      await setup('4');
      const request = backend.expectOne(`${URL}/4`);
      expect(request.request.method).toBe('GET');
      request.flush(athlete({ gender: 'FEMALE' }));
      await fixture.whenStable();

      expect(el().querySelector('h1')?.textContent).toContain('Editar deportista');
      expect(field('firstNames').value).toBe('Sofía');
      expect(field('idType').value).toBe('TI');
      expect(field('idNumber').value).toBe('1098765432');
      expect(field('birthDate').value).toBe('2011-03-02');
      expect(field('gender').value).toBe('FEMALE');
    });

    it('replaces the athlete with PUT and goes back with an update notice', async () => {
      await setup('4');
      backend.expectOne(`${URL}/4`).flush(athlete());
      await fixture.whenStable();
      type('lastNames', 'Pérez Gómez');
      await submit();

      const request = backend.expectOne(`${URL}/4`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({
        firstNames: 'Sofía',
        lastNames: 'Pérez Gómez',
        idType: 'TI',
        idNumber: '1098765432',
        birthDate: '2011-03-02',
        gender: 'FEMALE',
      });
      request.flush(athlete({ lastNames: 'Pérez Gómez' }));
      expect(router.navigate).toHaveBeenCalledWith(['/guardian/athletes'], {
        queryParams: { saved: 'updated' },
      });
    });

    it('shows the error and no form when the athlete cannot be loaded', async () => {
      await setup('99');
      failWith(
        backend,
        '/athletes/99',
        apiError({ status: 404, code: 'NOT_FOUND', message: 'El deportista no existe.' }),
      );
      await fixture.whenStable();
      expect(el().textContent).toContain('El deportista no existe.');
      expect(el().querySelector('form')).toBeNull();
    });

    it('does not call the server when the id in the address is not a number', async () => {
      await setup('abc');
      expect(el().textContent).toContain('El deportista no existe.');
      expect(el().querySelector('form')).toBeNull();
      backend.expectNone(`${URL}/abc`);
    });
  });
});
