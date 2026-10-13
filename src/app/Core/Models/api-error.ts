export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'TOKEN_EXPIRED'
  | 'ACCESS_DENIED'
  | 'NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'USER_INACTIVE'
  | 'EMAIL_ALREADY_REGISTERED'
  | 'ID_NUMBER_ALREADY_REGISTERED'
  | 'WEAK_PASSWORD'
  | 'DATA_POLICY_NOT_ACCEPTED'
  | 'INCORRECT_CURRENT_PASSWORD'
  | 'INTERNAL_ERROR';

export type ClientErrorCode = 'NETWORK_ERROR' | 'UNKNOWN_ERROR';

export interface ApiErrorDetail {
  field: string;
  message: string;
}

export interface ApiError {
  timestamp: string;
  status: number;
  code: ErrorCode | ClientErrorCode;
  message: string;
  details: ApiErrorDetail[];
  path: string;
}
