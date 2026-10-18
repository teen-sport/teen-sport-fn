import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { GroupService } from './group.service';

describe('GroupService', () => {
  let service: GroupService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(GroupService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists groups with the three filters', () => {
    service.list({ disciplineId: 1, coachId: 5, status: 'ACTIVE' }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/groups'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('disciplineId')).toBe('1');
    expect(req.request.params.get('coachId')).toBe('5');
    expect(req.request.params.get('status')).toBe('ACTIVE');
    req.flush([]);
  });

  it('sends no filters when none are chosen', () => {
    service.list({ disciplineId: null, coachId: null, status: null }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/groups'));
    expect(req.request.params.keys()).toEqual([]);
    req.flush([]);
  });

  it('creates a group with POST', () => {
    const body = { disciplineId: 1, coachId: 5, name: 'Sub-15', maxCapacity: 12 };
    service.create(body).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/groups'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('updates name and capacity with PUT', () => {
    service.update(11, { name: 'Sub-17', maxCapacity: 10 }).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/groups/11'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ name: 'Sub-17', maxCapacity: 10 });
    req.flush({});
  });

  it('changes the status with PATCH', () => {
    service.setStatus(11, 'INACTIVE').subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/groups/11/status'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'INACTIVE' });
    req.flush({});
  });

  it('assigns the coach with PUT', () => {
    service.assignCoach(11, 6).subscribe();
    const req = http.expectOne((r) => r.url.endsWith('/groups/11/coach'));
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ coachId: 6 });
    req.flush({});
  });

  it('adds, edits and deletes schedules', () => {
    const slot = { dayOfWeek: 'MONDAY' as const, startTime: '16:00', endTime: '17:00' };

    service.addSchedule(11, slot).subscribe();
    const add = http.expectOne((r) => r.url.endsWith('/groups/11/schedules'));
    expect(add.request.method).toBe('POST');
    expect(add.request.body).toEqual(slot);
    add.flush({ id: 1, ...slot });

    service.updateSchedule(1, slot).subscribe();
    const edit = http.expectOne((r) => r.url.endsWith('/schedules/1'));
    expect(edit.request.method).toBe('PUT');
    edit.flush({ id: 1, ...slot });

    service.deleteSchedule(1).subscribe();
    const del = http.expectOne((r) => r.url.endsWith('/schedules/1'));
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
  });
});
