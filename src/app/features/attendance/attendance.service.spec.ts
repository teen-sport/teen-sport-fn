import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AttendanceService } from './attendance.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AttendanceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists the sessions of a range with GET /sessions', () => {
    service
      .listSessions({ from: '2026-11-09', to: '2026-11-15', groupId: 4, status: 'SCHEDULED' })
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('from')).toBe('2026-11-09');
    expect(req.request.params.get('to')).toBe('2026-11-15');
    expect(req.request.params.get('groupId')).toBe('4');
    expect(req.request.params.get('status')).toBe('SCHEDULED');
    req.flush([]);
  });

  it('does not send the filters that are empty', () => {
    service.listSessions({ status: null }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('gets the roster of a session with GET /sessions/{id}/attendance', () => {
    service.roster(12).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions/12/attendance'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('records the attendance with PUT /sessions/{id}/attendance', () => {
    const body = {
      records: [
        { athleteId: 1, status: 'PRESENT' as const },
        { athleteId: 2, status: 'ABSENT' as const },
      ],
    };
    service.record(12, body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions/12/attendance'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('gets one session with GET /sessions/{id}', () => {
    service.getSession(31).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions/31'));
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('creates a single session with POST /sessions', () => {
    const body = {
      groupId: 4,
      date: '2026-11-12',
      startTime: '16:00',
      endTime: '17:30',
      notes: 'Partido amistoso',
    };
    service.createSession(body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('generates the sessions of a group with POST /sessions/generate', () => {
    const body = { groupId: 4, dateFrom: '2026-11-10', dateTo: '2026-11-23', notify: false };
    service.generateSessions(body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions/generate'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({ created: 4, skipped: 0, sessions: [] });
  });

  it('reschedules a session with PUT /sessions/{id}', () => {
    const body = { date: '2026-11-13', startTime: '17:00', endTime: '18:30' };
    service.updateSession(31, body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions/31'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('cancels a session with POST /sessions/{id}/cancel and its reason', () => {
    service.cancelSession(31, 'Lluvia').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/sessions/31/cancel'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ reason: 'Lluvia' });
    req.flush({});
  });

  it('lists the attendance history with GET /attendance-records and its filters', () => {
    service
      .listRecords({
        page: 1,
        size: 20,
        athleteId: 7,
        groupId: 4,
        from: '2026-11-01',
        to: '2026-11-10',
        status: 'ABSENT',
      })
      .subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/attendance-records'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('page')).toBe('1');
    expect(req.request.params.get('size')).toBe('20');
    expect(req.request.params.get('athleteId')).toBe('7');
    expect(req.request.params.get('groupId')).toBe('4');
    expect(req.request.params.get('from')).toBe('2026-11-01');
    expect(req.request.params.get('to')).toBe('2026-11-10');
    expect(req.request.params.get('status')).toBe('ABSENT');
    req.flush({});
  });

  it('sends no parameters to the history when there are no filters', () => {
    service.listRecords().subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/attendance-records'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush({});
  });
});
