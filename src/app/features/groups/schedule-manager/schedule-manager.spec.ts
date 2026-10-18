import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { group } from '../../../../testing/admin-fixtures';
import { apiError, failWith } from '../../../../testing/auth-fixtures';
import { Schedule } from '../../../Core/Models/common';
import { ScheduleManager } from './schedule-manager';

const SCHEDULES = `${environment.apiBaseUrl}/groups/11/schedules`;
const SCHEDULE = `${environment.apiBaseUrl}/schedules`;

/** Anfitrión mínimo: el gestor recibe el grupo y sus horarios por inputs. */
@Component({
  imports: [ScheduleManager],
  template: `<app-schedule-manager [groupId]="11" [schedules]="schedules()" />`,
})
class Host {
  readonly schedules = signal<Schedule[]>(group().schedules);
}

describe('ScheduleManager', () => {
  let fixture: ComponentFixture<Host>;
  let backend: HttpTestingController;

  async function open(schedules?: Schedule[]): Promise<void> {
    TestBed.configureTestingModule({
      imports: [Host],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(Host);
    if (schedules) {
      fixture.componentInstance.schedules.set(schedules);
    }
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const rows = (): HTMLElement[] => Array.from(el().querySelectorAll<HTMLElement>('tbody tr'));
  const buttonByText = (text: string, root: ParentNode = el()): HTMLButtonElement | undefined =>
    Array.from(root.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes(text),
    );

  async function fillForm(day: string, start: string, end: string): Promise<void> {
    const set = (id: string, value: string, event: string) => {
      const control = el().querySelector<HTMLInputElement>(`#${id}`)!;
      control.value = value;
      control.dispatchEvent(new Event(event));
    };
    set('dayOfWeek', day, 'change');
    set('startTime', start, 'input');
    set('endTime', end, 'input');
    await fixture.whenStable();
  }

  const submit = async (): Promise<void> => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('lists the schedules from Monday to Sunday and by start time within each day', async () => {
    await open([
      { id: 3, dayOfWeek: 'FRIDAY', startTime: '09:00', endTime: '10:00' },
      { id: 2, dayOfWeek: 'MONDAY', startTime: '18:00', endTime: '19:00' },
      { id: 1, dayOfWeek: 'MONDAY', startTime: '16:00', endTime: '17:00' },
    ]);
    expect(rows().map((row) => row.querySelector('th')?.textContent?.trim())).toEqual([
      'Lunes',
      'Lunes',
      'Viernes',
    ]);
    expect(rows()[0].textContent).toContain('16:00');
    expect(rows()[1].textContent).toContain('18:00');
  });

  it('invites to add the first schedule when there are none', async () => {
    await open([]);
    expect(el().querySelector('table')).toBeNull();
    expect(el().querySelector('.empty-state')?.textContent).toContain('todavía no tiene horarios');
  });

  it('adds a schedule, keeps the list sorted and empties the form', async () => {
    await open();
    await fillForm('TUESDAY', '15:00', '16:00');
    await submit();

    const request = backend.expectOne(SCHEDULES);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      dayOfWeek: 'TUESDAY',
      startTime: '15:00',
      endTime: '16:00',
    });
    request.flush({ id: 9, dayOfWeek: 'TUESDAY', startTime: '15:00', endTime: '16:00' });
    await fixture.whenStable();

    expect(rows().map((row) => row.querySelector('th')?.textContent?.trim())).toEqual([
      'Lunes',
      'Martes',
      'Miércoles',
    ]);
    expect(el().querySelector('.notice')?.textContent).toContain('Horario agregado');
    expect(el().querySelector<HTMLInputElement>('#startTime')!.value).toBe('');
  });

  it('asks for both times before sending anything', async () => {
    await open();
    await fillForm('MONDAY', '', '');
    await submit();
    backend.expectNone(SCHEDULES);
    expect(el().querySelector('#startTime-error')).toBeTruthy();
    expect(el().querySelector('#endTime-error')).toBeTruthy();
  });

  it('shows next to the end time that it must be after the start', async () => {
    await open();
    await fillForm('MONDAY', '18:00', '17:00');
    await submit();
    failWith(
      backend,
      '/groups/11/schedules',
      apiError({ status: 400, code: 'INVALID_TIME_RANGE', message: 'x' }),
    );
    await fixture.whenStable();
    expect(el().querySelector('#endTime-error')?.textContent).toContain('posterior');
  });

  it('explains a conflict with another schedule and keeps what the user typed', async () => {
    await open();
    await fillForm('MONDAY', '16:30', '17:00');
    await submit();
    failWith(
      backend,
      '/groups/11/schedules',
      apiError({ status: 409, code: 'SCHEDULE_CONFLICT', message: 'x' }),
    );
    await fixture.whenStable();
    expect(el().querySelector('form .alert')?.textContent).toContain('se cruza');
    expect(el().querySelector<HTMLInputElement>('#startTime')!.value).toBe('16:30');
    expect(rows().length).toBe(2);
  });

  it('loads a schedule into the form to edit it and saves it with its own id', async () => {
    await open();
    buttonByText('Editar', rows()[1])!.click();
    await fixture.whenStable();
    expect(el().querySelector('h3')?.textContent).toContain('Editar el horario');
    expect(el().querySelector<HTMLSelectElement>('#dayOfWeek')!.value).toBe('WEDNESDAY');
    expect(el().querySelector<HTMLInputElement>('#startTime')!.value).toBe('16:00');

    await fillForm('THURSDAY', '16:00', '18:00');
    await submit();
    const request = backend.expectOne(`${SCHEDULE}/2`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toEqual({
      dayOfWeek: 'THURSDAY',
      startTime: '16:00',
      endTime: '18:00',
    });
    request.flush({ id: 2, dayOfWeek: 'THURSDAY', startTime: '16:00', endTime: '18:00' });
    await fixture.whenStable();

    expect(rows()[1].querySelector('th')?.textContent?.trim()).toBe('Jueves');
    expect(el().querySelector('.notice')?.textContent).toContain('Horario actualizado');
    expect(el().querySelector('h3')?.textContent).toContain('Agregar un horario');
  });

  it('cancels the edition and goes back to adding', async () => {
    await open();
    buttonByText('Editar', rows()[0])!.click();
    await fixture.whenStable();
    buttonByText('Cancelar')!.click();
    await fixture.whenStable();
    expect(el().querySelector('h3')?.textContent).toContain('Agregar un horario');
    expect(el().querySelector<HTMLInputElement>('#startTime')!.value).toBe('');
  });

  it('asks for confirmation before deleting and then removes the schedule', async () => {
    await open();
    buttonByText('Eliminar', rows()[0])!.click();
    await fixture.whenStable();
    expect(el().querySelector('[role="dialog"]')?.textContent).toContain('Lunes 16:00 – 17:30');
    backend.expectNone(`${SCHEDULE}/1`);

    buttonByText('Sí, eliminar')!.click();
    const request = backend.expectOne(`${SCHEDULE}/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(rows().length).toBe(1);
    expect(el().querySelector('[role="dialog"]')).toBeNull();
    expect(el().querySelector('.notice')?.textContent).toContain('Horario eliminado');
  });

  it('keeps the schedule and shows the error when it cannot be deleted', async () => {
    await open();
    buttonByText('Eliminar', rows()[0])!.click();
    await fixture.whenStable();
    buttonByText('Sí, eliminar')!.click();
    failWith(
      backend,
      '/schedules/1',
      apiError({ status: 500, code: 'INTERNAL_ERROR', message: 'Falla al eliminar' }),
    );
    await fixture.whenStable();
    expect(el().querySelector('.alert')?.textContent).toContain('Falla al eliminar');
    expect(rows().length).toBe(2);
  });
});
