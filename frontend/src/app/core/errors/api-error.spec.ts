import { HttpErrorResponse } from '@angular/common/http';
import {
  NETWORK_ERROR_MESSAGE,
  NOT_FOUND_MESSAGE,
  SERVER_ERROR_MESSAGE,
  VALIDATION_ERROR_MESSAGE,
  isApiError,
  toApiError,
} from './api-error';

function failure(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({ status, error, statusText: 'internal text', url: '/api/customers' });
}

describe('toApiError', () => {
  it('maps status 0 to a network message', () => {
    expect(toApiError(failure(0))).toEqual({ status: 0, message: NETWORK_ERROR_MESSAGE });
  });

  it('maps 404 to a not-found message', () => {
    expect(toApiError(failure(404))).toEqual({ status: 404, message: NOT_FOUND_MESSAGE });
  });

  it('maps 5xx to a generic message without technical details', () => {
    const result = toApiError(failure(500, { title: 'An unexpected error occurred.', detail: 'ORA-00942' }));

    expect(result.message).toBe(SERVER_ERROR_MESSAGE);
    expect(JSON.stringify(result)).not.toContain('ORA-00942');
  });

  it('maps 400 field errors to lower-camel keys', () => {
    const result = toApiError(failure(400, { errors: { Title: ['Title is required.'], Description: ['Too long'] } }));

    expect(result.fieldErrors).toEqual({ title: ['Title is required.'], description: ['Too long'] });
  });

  it('has no field errors for a 400 without an errors map', () => {
    expect(toApiError(failure(400, { title: 'Bad request' })).fieldErrors).toBeUndefined();
  });

  it("keeps a 400's own title when it has no field errors", () => {
    expect(toApiError(failure(400, { title: 'The holiday list file is empty.' })).message).toBe('The holiday list file is empty.');
  });

  it('keeps the general message for a 400 with field errors or without a title', () => {
    expect(toApiError(failure(400, { title: 'One or more validation errors occurred.', errors: { Title: ['Required'] } })).message).toBe(
      VALIDATION_ERROR_MESSAGE,
    );
    expect(toApiError(failure(400, {})).message).toBe(VALIDATION_ERROR_MESSAGE);
    expect(toApiError(failure(400, null)).message).toBe(VALIDATION_ERROR_MESSAGE);
  });

  it('uses the problem title for other 4xx responses when present', () => {
    expect(toApiError(failure(409, { title: 'Conflict happened' })).message).toBe('Conflict happened');
  });

  it('recognizes ApiError values', () => {
    expect(isApiError(toApiError(failure(404)))).toBe(true);
    expect(isApiError(new Error('x'))).toBe(false);
    expect(isApiError(null)).toBe(false);
  });
});
