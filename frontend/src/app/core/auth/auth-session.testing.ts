import { Session } from './auth-session';

/** A valid session for tests, expiring in an hour unless overridden. */
export function testSession(overrides: Partial<Session> = {}): Session {
  return {
    token: 'token-1',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    userCode: 'U01',
    userName: 'ADMIN',
    companyId: 'c-1',
    companyCode: 'CMP',
    companyName: 'Cargomar Pvt Ltd',
    branchId: 'b-1',
    branchName: 'Kochi',
    yearId: 'y-1',
    yearCode: '2025',
    yearName: '2025-2026',
    ...overrides,
  };
}
