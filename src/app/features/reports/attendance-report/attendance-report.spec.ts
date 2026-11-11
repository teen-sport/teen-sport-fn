import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { apiError } from '../../../../testing/auth-fixtures';
import { attendanceReport } from '../../../../testing/report-fixtures';
import { Group } from '../../groups/group.models';
import { AttendanceReport } from './attendance-report';

const REPORT = `${environment.apiBaseUrl}/reports/attendance`;

@Component({
  imports: [AttendanceReport],
  template: `<app-attendance-report [groups]="groups" />`,
})
class Host {
  groups: Group[] = [group({ id: 4, name: 'Sub-15 A' }), group({ id: 9, name: 'Sub-17' })];
}

describe('AttendanceReport', () => {
  let fixture: ComponentFixture<Host>;
  let backend: HttpTestingController;

  async function setup(groups?: Group[]): Promise<void> {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(Host);
    if (groups) {
      fixture.componentInstance.groups = groups;
    }
    backend = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const request = () => backend.expectOne((req) => req.url === REPORT);
  const typeIn = async (id: string, value: string): Promise<void> => {
    const field = el().querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;
    field.value = value;
    field.dispatchEvent(new Event('input'));
    field.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('asks for the report without parameters so the server uses the month so far', async () => {
    await setup();
    const call = request();
    expect(call.request.params.keys()).toEqual([]);
    call.flush(attendanceReport());
    await fixture.whenStable();
    expect(el().querySelector('#attendance-report-title')?.textContent).toContain('cobertura');
  });

  it('titles and explains each filter', async () => {
    await setup([group({ id: 4 }), group({ id: 9, name: 'Sub-17' })]);
    request().flush(attendanceReport());
    await fixture.whenStable();

    const titles = Array.from(el().querySelectorAll('.filter-panel .control-title')).map((node) =>
      node.textContent?.trim(),
    );
    expect(titles).toEqual(['Grupo', 'Fechas']);
    expect(el().querySelectorAll('.filter-panel .control-hint').length).toBe(2);
  });

  it('shows the figures, with the percentages written in Spanish', async () => {
    await setup();
    request().flush(attendanceReport());
    await fixture.whenStable();

    const figures = Array.from(el().querySelectorAll('.summary-grid dd')).map((dd) =>
      dd.textContent?.trim(),
    );
    expect(figures).toEqual(['20', '19', '95 %', '84,2 %']);
    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Sub-15 A');
    expect(rows[0].textContent).toContain('88,5 %');
    // Un grupo sin marcas no tiene porcentaje.
    expect(rows[1].textContent).toContain('—');
  });

  it('says in words that the coverage meets the target of 90 %', async () => {
    await setup();
    request().flush(attendanceReport({ recordingCoverage: 90 }));
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('cumple la meta de 90 %');
  });

  it('says in words that the coverage is below the target', async () => {
    await setup();
    request().flush(attendanceReport({ recordingCoverage: 89.9 }));
    await fixture.whenStable();
    expect(el().querySelector('.notice')?.textContent).toContain('por debajo de la meta de 90 %');
  });

  it('says so when no session has passed in the period', async () => {
    await setup();
    request().flush(
      attendanceReport({
        scheduledSessions: 0,
        completedSessions: 0,
        recordingCoverage: 0,
        byGroup: [],
      }),
    );
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('No hay sesiones');
    expect(el().querySelector('.summary-grid')).toBeNull();
  });

  it('sends the filters that were chosen', async () => {
    await setup();
    request().flush(attendanceReport());
    await fixture.whenStable();
    await typeIn('attendance-group', '9');
    await typeIn('attendance-from', '2026-10-01');
    await typeIn('attendance-to', '2026-10-31');
    await submit();
    const call = request();
    expect(call.request.params.get('groupId')).toBe('9');
    expect(call.request.params.get('dateFrom')).toBe('2026-10-01');
    expect(call.request.params.get('dateTo')).toBe('2026-10-31');
    call.flush(attendanceReport());
  });

  it('does not ask when the start date is after the end date', async () => {
    await setup();
    request().flush(attendanceReport());
    await fixture.whenStable();
    await typeIn('attendance-from', '2026-11-10');
    await typeIn('attendance-to', '2026-11-01');
    await submit();
    backend.expectNone((req) => req.url === REPORT);
    expect(el().querySelector('#attendance-range-error')?.textContent).toContain(
      'no puede ser posterior',
    );
  });

  it('clears the filters and asks again without them', async () => {
    await setup();
    request().flush(attendanceReport());
    await fixture.whenStable();
    await typeIn('attendance-group', '4');
    await submit();
    request().flush(attendanceReport());
    await fixture.whenStable();
    Array.from(el().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Limpiar'))!
      .click();
    await fixture.whenStable();
    const call = request();
    expect(call.request.params.keys()).toEqual([]);
    call.flush(attendanceReport());
  });

  it('hides the group filter when there is a single group', async () => {
    await setup([group({ id: 4 })]);
    request().flush(attendanceReport());
    await fixture.whenStable();
    expect(el().querySelector('#attendance-group')).toBeNull();
  });

  it('shows the error with a retry button', async () => {
    await setup();
    const error = apiError({ status: 422, code: 'INVALID_DATE_RANGE', message: 'x' });
    request().flush(error, { status: 422, statusText: 'Unprocessable' });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('rango de fechas');
    Array.from(el().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    request().flush(attendanceReport());
  });
});
