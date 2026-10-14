/** What the user types on the login screen (user code and company code already trimmed). */
export interface LoginCredentials {
  /** The user code (`USERM.USER_CODE`), typed in the User field. */
  userCode: string;
  password: string;
  companyCode: string;
}

/** The answer of `POST admin/login`. */
export interface LoginResponse {
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
  };
}
