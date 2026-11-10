import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ReportService } from './report.service';

describe('ReportService', () => {
  let service: ReportService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(ReportService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('asks for the enrollment report of a month with GET /reports/enrollments', () => {
    service.enrollments('2026-11').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/reports/enrollments'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('period')).toBe('2026-11');
    req.flush({});
  });

  it('asks for the attendance report with the filters that were given', () => {
    service
      .attendance({ dateFrom: '2026-11-01', dateTo: '2026-11-10', groupId: 4, disciplineId: 2 })
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/reports/attendance'));
    expect(req.request.params.get('dateFrom')).toBe('2026-11-01');
    expect(req.request.params.get('dateTo')).toBe('2026-11-10');
    expect(req.request.params.get('groupId')).toBe('4');
    expect(req.request.params.get('disciplineId')).toBe('2');
    req.flush({});
  });

  it('sends no parameters to the attendance report when there are no filters', () => {
    service.attendance().subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/reports/attendance'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush({});
  });

  it('asks for the report of an athlete with GET /reports/attendance/athletes/{id}', () => {
    service.athleteAttendance(7, { dateFrom: '2026-11-01' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/reports/attendance/athletes/7'));
    expect(req.request.params.get('dateFrom')).toBe('2026-11-01');
    expect(req.request.params.has('dateTo')).toBe(false);
    req.flush({});
  });

  it('asks for the recurrent absences with their filters', () => {
    service
      .recurrentAbsences({ minConsecutive: 4, groupId: 4, dateFrom: '2026-10-01' })
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/reports/attendance/recurrent-absences'));
    expect(req.request.params.get('minConsecutive')).toBe('4');
    expect(req.request.params.get('groupId')).toBe('4');
    expect(req.request.params.get('dateFrom')).toBe('2026-10-01');
    req.flush([]);
  });

  it('sends no parameters to the recurrent absences when there are no filters', () => {
    service.recurrentAbsences().subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/reports/attendance/recurrent-absences'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });
});
