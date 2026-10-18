import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { discipline } from '../../../../testing/guardian-fixtures';
import { DisciplineForm } from './discipline-form';

const URL = `${environment.apiBaseUrl}/disciplines`;

describe('DisciplineForm', () => {
  let fixture: ComponentFixture<DisciplineForm>;
  let backend: HttpTestingController;
  let router: Router;

  async function setup(id: string | null = null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [DisciplineForm],
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
    fixture = TestBed.createComponent(DisciplineForm);
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const field = (id: string) =>
    el().querySelector<HTMLInputElement | HTMLTextAreaElement>(`#${id}`)!;

  function type(id: string, value: string): void {
    const control = field(id);
    control.value = value;
    control.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  afterEach(() => backend.verify());

  describe('creating', () => {
    it('does not send anything when the name and the fee are missing', async () => {
      await setup();
      expect(el().querySelector('h1')?.textContent).toContain('Nueva disciplina');
      await submit();
      expect(el().querySelector('#name-error')?.textContent).toContain('obligatorio');
      expect(el().querySelector('#monthlyFee-error')).toBeTruthy();
      backend.expectNone(URL);
    });

    it('rejects a fee of zero or less', async () => {
      await setup();
      type('name', 'Natación');
      type('monthlyFee', '0');
      await submit();
      expect(el().querySelector('#monthlyFee-error')?.textContent).toContain('mínimo');
      backend.expectNone(URL);
    });

    it('sends the trimmed data, omits an empty description and goes back to the list', async () => {
      await setup();
      type('name', '  Natación ');
      type('monthlyFee', '90000');
      await submit();

      const request = backend.expectOne(URL);
      expect(request.request.method).toBe('POST');
      expect(request.request.body).toEqual({ name: 'Natación', monthlyFee: 90000 });
      request.flush(discipline({ id: 9 }), { status: 201, statusText: 'Created' });
      expect(router.navigate).toHaveBeenCalledWith(['/admin/disciplines'], {
        queryParams: { saved: 'created' },
      });
    });

    it('includes the description when it is written', async () => {
      await setup();
      type('name', 'Natación');
      type('description', ' Piscina semiolímpica ');
      type('monthlyFee', '90000');
      await submit();
      const request = backend.expectOne(URL);
      expect(request.request.body.description).toBe('Piscina semiolímpica');
      request.flush(discipline(), { status: 201, statusText: 'Created' });
    });

    it('puts the duplicate name error on the name field', async () => {
      await setup();
      type('name', 'Fútbol');
      type('monthlyFee', '90000');
      await submit();
      failWith(
        backend,
        '/disciplines',
        apiError({ status: 409, code: 'DUPLICATE_DISCIPLINE', message: 'Ya existe' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('#name-error')?.textContent).toContain('Ya existe');
      expect(router.navigate).not.toHaveBeenCalled();
    });
  });

  describe('editing', () => {
    it('loads the discipline, warns about the fee and saves with PUT', async () => {
      await setup('1');
      backend.expectOne(`${URL}/1`).flush(discipline());
      await fixture.whenStable();

      expect(el().querySelector('h1')?.textContent).toContain('Editar disciplina');
      expect(el().querySelector('.hint')?.textContent).toContain('pagos que registres');
      expect(field('name').value).toBe('Fútbol');
      expect(field('monthlyFee').value).toBe('120000');

      type('monthlyFee', '130000');
      await submit();
      const request = backend.expectOne(`${URL}/1`);
      expect(request.request.method).toBe('PUT');
      expect(request.request.body).toEqual({
        name: 'Fútbol',
        description: 'Fútbol juvenil',
        monthlyFee: 130000,
      });
      request.flush(discipline({ monthlyFee: 130000 }));
      expect(router.navigate).toHaveBeenCalledWith(['/admin/disciplines'], {
        queryParams: { saved: 'updated' },
      });
    });

    it('shows an error with a way back when the discipline cannot be loaded', async () => {
      await setup('99');
      failWith(
        backend,
        '/disciplines/99',
        apiError({ status: 404, code: 'NOT_FOUND', message: 'Disciplina no encontrada' }),
      );
      await fixture.whenStable();
      expect(el().querySelector('.alert')?.textContent).toContain('no encontrada');
      expect(el().querySelector('a[href="/admin/disciplines"]')).toBeTruthy();
      expect(el().querySelector('form')).toBeNull();
    });

    it('does not call the API for an id that is not a number', async () => {
      await setup('abc');
      expect(el().querySelector('.alert')?.textContent).toContain('no existe');
      backend.expectNone(`${URL}/NaN`);
    });
  });
});
