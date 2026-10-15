import { TestBed } from '@angular/core/testing';
import { loginResponse } from '../../../testing/auth-fixtures';
import { SessionService } from './session.service';

describe('SessionService', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-11T10:00:00Z'));
  });

  afterEach(() => vi.useRealTimers());

  it('starts empty', () => {
    const session = TestBed.inject(SessionService);
    expect(session.isAuthenticated()).toBe(false);
    expect(session.user()).toBeNull();
    expect(session.token()).toBeNull();
  });

  it('keeps the token, the user and the role after login', () => {
    const session = TestBed.inject(SessionService);
    session.start(loginResponse('COACH'));
    expect(session.token()).toBe('jwt-token');
    expect(session.user()?.firstNames).toBe('Marta');
    expect(session.role()).toBe('COACH');
    expect(session.hasRole('COACH', 'ADMIN')).toBe(true);
    expect(session.hasRole('GUARDIAN')).toBe(false);
  });

  it('survives a page reload', () => {
    TestBed.inject(SessionService).start(loginResponse('GUARDIAN'));
    TestBed.resetTestingModule();
    expect(TestBed.inject(SessionService).role()).toBe('GUARDIAN');
  });

  it('drops the session when the token expires', () => {
    const session = TestBed.inject(SessionService);
    session.start(loginResponse('GUARDIAN', 60));
    vi.advanceTimersByTime(61_000);
    expect(session.token()).toBeNull();
    expect(session.isAuthenticated()).toBe(false);
    expect(localStorage.getItem('teensport.session')).toBeNull();
  });

  it('ignores an expired session found in storage', () => {
    TestBed.inject(SessionService).start(loginResponse('GUARDIAN', 60));
    TestBed.resetTestingModule();
    vi.advanceTimersByTime(120_000);
    expect(TestBed.inject(SessionService).isAuthenticated()).toBe(false);
  });

  it('ignores corrupted storage', () => {
    localStorage.setItem('teensport.session', '{not json');
    expect(TestBed.inject(SessionService).isAuthenticated()).toBe(false);
  });

  it('updates the displayed name and keeps it after a reload', () => {
    const session = TestBed.inject(SessionService);
    session.start(loginResponse('GUARDIAN'));
    session.updateUser({ firstNames: 'Marta Lucía', lastNames: 'Gómez Ríos' });
    expect(session.user()?.firstNames).toBe('Marta Lucía');
    TestBed.resetTestingModule();
    expect(TestBed.inject(SessionService).user()?.lastNames).toBe('Gómez Ríos');
  });

  it('ignores a name update when nobody is logged in', () => {
    const session = TestBed.inject(SessionService);
    session.updateUser({ firstNames: 'X', lastNames: 'Y' });
    expect(session.user()).toBeNull();
  });

  it('clears everything on end', () => {
    const session = TestBed.inject(SessionService);
    session.start(loginResponse());
    session.end();
    expect(session.user()).toBeNull();
    expect(localStorage.getItem('teensport.session')).toBeNull();
  });
});
