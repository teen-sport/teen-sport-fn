import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { discipline, groupAvailability } from '../../../testing/guardian-fixtures';
import { CatalogService } from './catalog.service';

const BASE = environment.apiBaseUrl;

describe('CatalogService', () => {
  let service: CatalogService;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogService);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('lists the disciplines with GET /disciplines', () => {
    let result: unknown;
    service.disciplines().subscribe((value) => (result = value));
    const request = backend.expectOne(`${BASE}/disciplines`);
    expect(request.request.method).toBe('GET');
    request.flush([discipline()]);
    expect(result).toEqual([discipline()]);
  });

  it('asks for the availability of a month with GET /availability?period=', () => {
    service.availability('2026-11').subscribe();
    const request = backend.expectOne((req) => req.url === `${BASE}/availability`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('period')).toBe('2026-11');
    expect(request.request.params.has('disciplineId')).toBe(false);
    request.flush([groupAvailability()]);
  });

  it('adds the discipline filter when one is chosen', () => {
    service.availability('2026-11', 3).subscribe();
    const request = backend.expectOne((req) => req.url === `${BASE}/availability`);
    expect(request.request.params.get('disciplineId')).toBe('3');
    request.flush([]);
  });
});
