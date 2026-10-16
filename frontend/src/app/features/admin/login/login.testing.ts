import { LoginResponse } from './login.model';

/** A successful login answer for tests. */
export const LOGIN_RESPONSE: LoginResponse = {
  token: 'token-1',
  expiresAt: '2099-01-01T00:00:00Z',
  session: {
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
    employeeId: 'e-1',
  },
};
