import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { environment } from '../../../../environments/environment';
import { apiError } from '../../../../testing/auth-fixtures';
import { enrollmentDetail, groupAvailability } from '../../../../testing/guardian-fixtures';
import { EnrollmentGroupChange } from './enrollment-group-change';

const URL = `${environment.apiBaseUrl}/enrollments/21/group`;

describe('EnrollmentGroupChange', () => {
  let fixture: ComponentFixture<EnrollmentGroupChange>;
  let backend: HttpTestingController;
  let notices: string[];

  async function setup(
    groups = [
      groupAvailability(),
      groupAvailability({ groupId: 12, groupName: 'Fútbol sub-17', availableSpots: 3 }),
    ],
  ): Promise<void> {
    TestBed.configureTestingModule({
      imports: [EnrollmentGroupChange],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    fixture = TestBed.createComponent(EnrollmentGroupChange);
    backend = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('enrollment', enrollmentDetail({ status: 'ACTIVE' }));
    fixture.componentRef.setInput('groups', groups);
    notices = [];
    fixture.componentInstance.changed.subscribe((notice) => notices.push(notice));
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const select = (): HTMLSelectElement => el().querySelector<HTMLSelectElement>('#newGroupId')!;
  const choose = async (value: string): Promise<void> => {
    select().value = value;
    select().dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };
  const submit = async (): Promise<void> => {
    el().querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  };

  afterEach(() => backend.verify());

  it('offers only the other groups, with their spots', async () => {
    await setup();
    expect(Array.from(select().options).map((o) => o.textContent!.trim())).toEqual([
      'Elige un grupo',
      'Fútbol sub-17 · 3 cupos libres',
    ]);
  });

  it('says so when the discipline has no other group', async () => {
    await setup([groupAvailability()]);
    expect(el().querySelector('form')).toBeNull();
    expect(el().textContent).toContain('No hay otros grupos activos de Fútbol');
  });

  it('asks to pick a group before sending anything', async () => {
    await setup();
    await submit();
    backend.expectNone(URL);
    expect(el().querySelector('#newGroupId-error')?.textContent).toContain('obligatorio');
  });

  it('changes the group with PATCH and tells which group it is now', async () => {
    await setup();
    await choose('12');
    await submit();
    const request = backend.expectOne(URL);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ groupId: 12 });
    request.flush(enrollmentDetail());
    await fixture.whenStable();
    expect(notices).toEqual(['La inscripción pasó al grupo Fútbol sub-17.']);
    expect(select().value).toBe('');
  });

  it.each([
    ['NO_AVAILABLE_SPOTS', 409, 'no tiene cupos libres'],
    ['GROUP_INACTIVE', 422, 'está inactivo'],
    ['GROUP_OTHER_DISCIPLINE', 422, 'misma disciplina'],
    ['INVALID_STATE', 409, 'ya cambió de estado'],
  ] as const)('explains %s', async (code, status, text) => {
    await setup();
    await choose('12');
    await submit();
    backend
      .expectOne(URL)
      .flush(apiError({ status, code, message: 'del servidor' }), { status, statusText: code });
    await fixture.whenStable();
    expect(el().querySelector('[role=alert]')?.textContent).toContain(text);
    expect(notices).toEqual([]);
    expect(el().querySelector<HTMLButtonElement>('button[type=submit]')!.disabled).toBe(false);
  });
});
