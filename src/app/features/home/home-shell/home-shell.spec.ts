import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loginResponse } from '../../../../testing/auth-fixtures';
import { SessionService } from '../../../Core/Auth/session.service';
import { Role } from '../../../Core/Models/role';
import { HomeShell } from './home-shell';

describe('HomeShell', () => {
  let fixture: ComponentFixture<HomeShell>;

  async function setup(role: Role): Promise<void> {
    localStorage.clear();
    TestBed.configureTestingModule({ imports: [HomeShell], providers: [provideRouter([])] });
    TestBed.inject(SessionService).start(loginResponse(role));
    fixture = TestBed.createComponent(HomeShell);
    await fixture.whenStable();
  }

  const el = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it.each(['GUARDIAN', 'COACH', 'ADMIN'] as const)(
    'shows the title and points to the profile for a %s',
    async (role) => {
      await setup(role);
      expect(el().querySelector('h1')?.textContent).toContain('Inicio');
      expect(el().querySelector('.profile-hint a[href="/profile"]')).toBeTruthy();
    },
  );

  it('says that the options will appear while there are no shortcuts yet', async () => {
    await setup('GUARDIAN');
    expect(el().querySelector('.shortcuts')).toBeNull();
    expect(el().querySelector('.empty')?.textContent).toContain('a medida que estén disponibles');
  });
});
