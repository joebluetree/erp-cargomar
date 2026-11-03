import { HttpErrorResponse } from '@angular/common/http';

/** A backend or network failure, reduced to what the UI may show. */
export interface ApiError {
  status: number;
  /** User-friendly text. Never contains exception details. */
  message: string;
  /** Backend validation errors keyed by lower-camel field name, e.g. `title`. */
  fieldErrors?: Record<string, string[]>;
}

export const NETWORK_ERROR_MESSAGE = 'The server could not be reached. Check your connection and try again.';
export const NOT_FOUND_MESSAGE = 'The item could not be found.';
export const SERVER_ERROR_MESSAGE = 'Something went wrong. Please try again.';
export const VALIDATION_ERROR_MESSAGE = 'Please correct the highlighted fields.';

export function isApiError(value: unknown): value is ApiError {
  return typeof value === 'object' && value !== null && 'status' in value && 'message' in value;
}

function toFieldErrors(body: unknown): Record<string, string[]> | undefined {
  const errors = (body as { errors?: unknown } | null)?.errors;
  if (typeof errors !== 'object' || errors === null) {
    return undefined;
  }
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (Array.isArray(value) && value.length > 0) {
      result[key.charAt(0).toLowerCase() + key.slice(1)] = value.map(String);
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

export function toApiError(error: HttpErrorResponse): ApiError {
  if (error.status === 0) {
    return { status: 0, message: NETWORK_ERROR_MESSAGE };
  }
  if (error.status === 400) {
    const fieldErrors = toFieldErrors(error.error);
    // A refusal without field errors (such as an upload's "The holiday list file is empty.") keeps the backend's own
    // text; form validation, which marks its fields, keeps the general message.
    const title = (error.error as { title?: unknown } | null)?.title;
    const message = !fieldErrors && typeof title === 'string' && title ? title : VALIDATION_ERROR_MESSAGE;
    return { status: 400, message, fieldErrors };
  }
  if (error.status === 404) {
    return { status: 404, message: NOT_FOUND_MESSAGE };
  }
  if (error.status >= 500) {
    return { status: error.status, message: SERVER_ERROR_MESSAGE };
  }
  const title = (error.error as { title?: unknown } | null)?.title;
  return { status: error.status, message: typeof title === 'string' && title ? title : SERVER_ERROR_MESSAGE };
}
