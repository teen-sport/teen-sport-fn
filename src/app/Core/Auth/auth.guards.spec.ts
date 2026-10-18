import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { loginResponse } from '../../../testing/auth-fixtures';
import { authGuard, guestGuard, roleGuard } from './auth.guards';
import { SessionService } from './session.service';

function run(guard: ReturnType<typeof roleGuard>, url = '/admin'): boolean | UrlTree {
  return TestBed.runInInjectionContext(() =>
    guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
  ) as boolean | UrlTree;
}

describe('guards', () => {
  let session: SessionService;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionService);
    router = TestBed.inject(Router);
  });

  it('authGuard sends visitors to the login and remembers the page', () => {
    const result = run(authGuard, '/admin') as UrlTree;
    expect(router.serializeUrl(result)).toBe('/login?returnUrl=%2Fadmin');
  });

  it('authGuard lets signed-in users through', () => {
    session.start(loginResponse());
    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard lets visitors see the login', () => {
    expect(run(guestGuard)).toBe(true);
  });

  it.each([
    ['ADMIN', '/admin'],
    ['COACH', '/coach'],
    ['GUARDIAN', '/guardian'],
  ] as const)('guestGuard sends a signed-in %s to %s', (role, home) => {
    session.start(loginResponse(role));
    expect(router.serializeUrl(run(guestGuard) as UrlTree)).toBe(home);
  });

  it('roleGuard allows the listed roles only', () => {
    session.start(loginResponse('COACH'));
    expect(run(roleGuard('COACH', 'ADMIN'))).toBe(true);
    expect(router.serializeUrl(run(roleGuard('ADMIN')) as UrlTree)).toBe('/coach');
  });

  it('roleGuard sends visitors to the login', () => {
    expect(router.serializeUrl(run(roleGuard('ADMIN')) as UrlTree)).toBe('/login');
  });
});
