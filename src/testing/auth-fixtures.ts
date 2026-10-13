import { HttpTestingController } from '@angular/common/http/testing';
import { environment } from '../environments/environment';
import { LoginResponse } from '../app/Core/Auth/auth.models';
import { ApiError } from '../app/Core/Models/api-error';
import { Role } from '../app/Core/Models/role';

export function loginResponse(role: Role = 'GUARDIAN', expiresInSeconds = 3600): LoginResponse {
  return {
    accessToken: 'jwt-token',
    tokenType: 'Bearer',
    expiresInSeconds,
    user: {
      id: 7,
      firstNames: 'Marta',
      lastNames: 'Gómez',
      role,
      guardianId: role === 'GUARDIAN' ? 3 : null,
      coachId: role === 'COACH' ? 5 : null,
    },
  };
}

export function apiError(overrides: Partial<ApiError>): ApiError {
  return {
    timestamp: '2026-10-11T10:00:00Z',
    status: 400,
    code: 'VALIDATION_ERROR',
    message: 'La solicitud contiene campos inválidos.',
    details: [],
    path: '/api/v1/test',
    ...overrides,
  };
}

/** Answers the next request to `path` with an API error body. */
export function failWith(http: HttpTestingController, path: string, error: ApiError): void {
  http
    .expectOne(`${environment.apiBaseUrl}${path}`)
    .flush(error, { status: error.status, statusText: error.code });
}
