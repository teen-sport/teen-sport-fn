import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { athlete, page } from '../../../testing/guardian-fixtures';
import { AthleteService } from './athlete.service';

const URL = `${environment.apiBaseUrl}/athletes`;

describe('AthleteService', () => {
  let service: AthleteService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AthleteService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lists the athletes with GET /athletes and no filters by default', () => {
    let result: unknown;
    service.list().subscribe((value) => (result = value));
    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.keys()).toEqual([]);
    request.flush(page([athlete()]));
    expect(result).toMatchObject({ totalElements: 1, content: [{ firstNames: 'Sofía' }] });
  });

  it('sends the page, the size and the trimmed search text', () => {
    service.list({ page: 2, size: 10, q: '  sofía ' }).subscribe();
    const request = backend.expectOne((req) => req.url === URL);
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('size')).toBe('10');
    expect(request.request.params.get('q')).toBe('sofía');
    request.flush(page([]));
  });

  it('does not send an empty search text', () => {
    service.list({ q: '   ' }).subscribe();
    const request = backend.expectOne((req) => req.url === URL);
    expect(request.request.params.has('q')).toBe(false);
    request.flush(page([]));
  });

  it('reads one athlete with GET /athletes/{id}', () => {
    service.get(9).subscribe();
    const request = backend.expectOne(`${URL}/9`);
    expect(request.request.method).toBe('GET');
    request.flush(athlete({ id: 9 }));
  });

  it('creates an athlete with POST /athletes', () => {
    const body = {
      firstNames: 'Sofía',
      lastNames: 'Pérez',
      idType: 'TI',
      idNumber: '1098765432',
      birthDate: '2011-03-02',
    };
    service.create(body).subscribe();
    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(body);
    request.flush(athlete(), { status: 201, statusText: 'Created' });
  });

  it('replaces an athlete with PUT /athletes/{id}', () => {
    const body = {
      firstNames: 'Sofía',
      lastNames: 'Pérez',
      idType: 'TI',
      idNumber: '1098765432',
      birthDate: '2011-03-02',
      gender: 'FEMALE',
    };
    service.update(4, body).subscribe();
    const request = backend.expectOne(`${URL}/4`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual(body);
    request.flush(athlete({ id: 4 }));
  });
});
