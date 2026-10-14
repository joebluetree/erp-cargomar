import { ChangeBranchResponse, SessionOptions } from './change-branch.model';

/** What a user of "Cargomar Pvt Ltd" (now in Kochi, 2025-2026) may switch to, for tests. */
export const SESSION_OPTIONS: SessionOptions = {
  branches: [
    { id: 'b-1', name: 'Kochi' },
    { id: 'b-2', name: 'Mumbai' },
  ],
  years: [
    { id: 'y-1', code: '2025', name: '2025-2026' },
    { id: 'y-0', code: '2024', name: '2024-2025' },
  ],
};

/** A successful switch to Mumbai, 2024-2025, for tests. */
export const CHANGE_RESPONSE: ChangeBranchResponse = {
  token: 'token-2',
  expiresAt: '2099-01-01T00:00:00Z',
  session: {
    userCode: 'U01',
    userName: 'ADMIN',
    companyId: 'c-1',
    companyCode: 'CMP',
    companyName: 'Cargomar Pvt Ltd',
    branchId: 'b-2',
    branchName: 'Mumbai',
    yearId: 'y-0',
    yearCode: '2024',
    yearName: '2024-2025',
  },
};
