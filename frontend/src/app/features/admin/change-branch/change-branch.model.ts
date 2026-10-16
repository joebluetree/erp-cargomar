/** A branch the logged-in user may switch to. */
export interface BranchOption {
  id: string;
  name: string;
}

/** A financial year of the logged-in company. */
export interface YearOption {
  id: string;
  code: string;
  name: string;
}

/** The answer of `GET admin/session/options`: branches by name, years newest first. */
export interface SessionOptions {
  branches: BranchOption[];
  years: YearOption[];
}

/** What Select sends: the chosen branch and year. */
export interface ChangeBranchRequest {
  branchId: string;
  yearId: string;
}

/** The answer of `POST admin/session/change`: a new token (same expiry) and the session with the new branch and year. */
export interface ChangeBranchResponse {
  token: string;
  expiresAt: string;
  session: {
    userCode: string;
    userName: string;
    companyId: string;
    companyCode: string;
    companyName: string;
    branchId: string;
    branchName: string;
    yearId: string;
    yearCode: string;
    yearName: string;
    employeeId: string | null;
  };
}
