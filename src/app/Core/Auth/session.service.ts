import { computed, inject, Injectable, signal } from '@angular/core';
import { Role } from '../Models/role';
import { LoggedUser, LoginResponse, StoredSession } from './auth.models';
import { TokenStore } from './token-store';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly store = inject(TokenStore);
  private readonly current = signal<StoredSession | null>(this.restore());

  readonly user = computed<LoggedUser | null>(() => this.current()?.user ?? null);
  readonly role = computed<Role | null>(() => this.current()?.user.role ?? null);

  token(): string | null {
    const session = this.current();
    if (!session) {
      return null;
    }
    if (Date.now() >= session.expiresAt) {
      this.end();
      return null;
    }
    return session.accessToken;
  }

  isAuthenticated(): boolean {
    return this.token() !== null;
  }

  hasRole(...roles: Role[]): boolean {
    const role = this.role();
    return this.isAuthenticated() && role !== null && roles.includes(role);
  }

  start(response: LoginResponse): void {
    const session: StoredSession = {
      accessToken: response.accessToken,
      expiresAt: Date.now() + response.expiresInSeconds * 1000,
      user: response.user,
    };
    this.current.set(session);
    this.store.save(session);
  }

  end(): void {
    this.current.set(null);
    this.store.clear();
  }

  private restore(): StoredSession | null {
    const stored = this.store.load();
    if (stored && Date.now() < stored.expiresAt) {
      return stored;
    }
    if (stored) {
      this.store.clear();
    }
    return null;
  }
}
