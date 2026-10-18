import { Injectable } from '@angular/core';
import { StoredSession } from './auth.models';

const STORAGE_KEY = 'teensport.session';


@Injectable({ providedIn: 'root' })
export class TokenStore {
  load(): StoredSession | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed: unknown = JSON.parse(raw);
      return this.isStoredSession(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  save(session: StoredSession): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      // Sin almacenamiento, la sesión dura hasta recargar la página.
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nada que limpiar.
    }
  }

  private isStoredSession(value: unknown): value is StoredSession {
    if (typeof value !== 'object' || value === null) {
      return false;
    }
    const candidate = value as Partial<StoredSession>;
    return (
      typeof candidate.accessToken === 'string' &&
      typeof candidate.expiresAt === 'number' &&
      typeof candidate.user === 'object' &&
      candidate.user !== null &&
      typeof candidate.user.role === 'string'
    );
  }
}
