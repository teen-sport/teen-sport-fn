import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { apiError, loginResponse } from '../../../../testing/auth-fixtures';
import { recurrentAbsence } from '../../../../testing/report-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Role } from '../../../Core/Models/role';
import { Group } from '../../groups/group.models';
import { RecurrentAbsences } from './recurrent-absences';

const REPORT = `${environment.apiBaseUrl}/reports/attendance/recurrent-absences`;

@Component({
  imports: [RecurrentAbsences],
  template: `<app-recurrent-absences [groups]="groups" />`,
})
class Host {
  groups: Group[] = [group({ id: 4, name: 'Sub-15 A' }), group({ id: 9, name: 'Sub-17' })];
}

describe('RecurrentAbsences', () => {
  let fixture: ComponentFixture<Host>;
  let backend: HttpTestingController;

  async function setup(role: Role = 'COACH'): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    TestBed.inject(SessionService).start(loginResponse(role));
    fixture = TestBed.createComponent(Host);
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

  afterEach(() => backend.verify());

  it('asks for the athletes with 3 or more absences in a row, like the server does by default', async () => {
    await setup();
    const call = request();
    expect(call.request.params.get('minConsecutive')).toBe('3');
    expect(call.request.params.has('groupId')).toBe(false);
    call.flush([]);
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('3 o más inasistencias');
  });

  it('lists each athlete with a link to their history, their group and their last attendance', async () => {
    await setup('COACH');
    request().flush([
      recurrentAbsence(),
      recurrentAbsence({
        athlete: { id: 5, firstNames: 'Valeria', lastNames: 'Ramírez' },
        group: { id: 9, name: 'Sub-17' },
        consecutiveAbsences: 5,
        lastAttendance: null,
      }),
    ]);
    await fixture.whenStable();

    const rows = el().querySelectorAll('tbody tr');
    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('a')?.getAttribute('href')).toBe('/coach/attendance?athleteId=2');
    expect(rows[0].textContent).toContain('Juan Quintero');
    expect(rows[0].textContent).toContain('Sub-15 A');
    expect(rows[0].textContent).toContain('27 de octubre de 2026');
    expect(rows[1].textContent).toContain('5');
    expect(rows[1].textContent).toContain('Nunca ha asistido');
  });

  it('links to the history of the administrator when the user is the administrator', async () => {
    await setup('ADMIN');
    request().flush([recurrentAbsence()]);
    await fixture.whenStable();
    expect(el().querySelector('tbody a')?.getAttribute('href')).toBe(
      '/admin/attendance?athleteId=2',
    );
  });

  it('sends the minimum, the group and the start date that were chosen', async () => {
    await setup();
    request().flush([]);
    await fixture.whenStable();
    await typeIn('absences-min', '5');
    await typeIn('absences-group', '9');
    await typeIn('absences-from', '2026-10-01');
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const call = request();
    expect(call.request.params.get('minConsecutive')).toBe('5');
    expect(call.request.params.get('groupId')).toBe('9');
    expect(call.request.params.get('dateFrom')).toBe('2026-10-01');
    call.flush([]);
    await fixture.whenStable();
    expect(el().querySelector('.empty-state')?.textContent).toContain('5 o más inasistencias');
  });

  it('shows the error with a retry button', async () => {
    await setup();
    const error = apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla' });
    request().flush(error, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla');
    Array.from(el().querySelectorAll<HTMLButtonElement>('button'))
      .find((b) => b.textContent?.includes('Reintentar'))!
      .click();
    request().flush([]);
  });
});
