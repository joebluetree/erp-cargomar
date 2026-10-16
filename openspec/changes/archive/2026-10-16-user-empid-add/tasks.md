# Tasks

## 1. Map `USER_EMP_ID`

- [x] 1.1 Add `EmployeeId` to `iErp.Entities/User.cs` and map it in `UserConfiguration` (`USER_EMP_ID`, max length 40, nullable) (D1). Add the `USER_EMP_ID NVARCHAR2(40)` column to the shaped `USERM` in `LoginTablesTests` and `ChangeBranchTablesTests`, and give one test user a value. Verify:
  - a new `Unit/UserMappingTests` (following `UserBranchMappingTests`) shows the column name, length and nullability;
  - `dotnet build backend/iErp.sln` passes.
- [x] 1.2 Run `dotnet ef migrations add UserEmployeeIdReadOnlyMapping -p iErp.Data -s iErp.Data` (or `-s iErp.Api` when its `bin` is not locked). Keep the migration only if it is snapshot-only with empty `Up`/`Down`; delete it if EF reports no change. Verify that `dotnet ef migrations script` contains no `USERM` statement.

## 2. Session, token and current session

- [x] 2.1 Backend (D2–D4):
  - `SessionDto.EmployeeId` (`string?`, last parameter);
  - `SessionClaims.EmployeeId = "ierp:employee_id"`;
  - `SessionTokenIssuer` adds the claim only when present;
  - `ICurrentSession.EmployeeId` and `HttpCurrentSession`;
  - `LoginService` and `ChangeBranchService` pass the trimmed `user.EmployeeId`, with blank becoming `null`;
  - `TestEndpointsController`'s session echo includes it.

  Verify with tests:
  - `LoginServiceTests`: the employee id is mapped, `" E-1 "` becomes `"E-1"`, and a null or blank id becomes `null` while the login still succeeds;
  - `SessionTokenIssuerTests`: the claim is present for "E-1" and absent for `null`;
  - `ChangeBranchServiceTests`: the new session keeps the user's employee id;
  - `LoginEndpointTests` and `ChangeBranchEndpointTests`: the 200 body has `session.employeeId`;
  - an `ICurrentSession` test (`AuthenticationTests`) reads `EmployeeId` from the token, and `null` from a token without the claim.

  Then run `dotnet test backend/iErp.sln` (Oracle tests off).
- [x] 2.2 Read-only check against the dev database: log in through the running API as a user with an employee id and as one without (credentials read by the read-only probe into a temporary file, deleted right after). Both log in. The first response's `session.employeeId` equals a read-only `SELECT TRIM(USER_EMP_ID)` for that user (compared, not printed); the second is `null`.

## 3. Frontend session

- [x] 3.1 Add `employeeId: string | null` to `Session` (`core/auth/auth-session.ts`), `LoginResponse.session` (`features/admin/login/login.model.ts`) and `ChangeBranchResponse.session` (`features/admin/change-branch/change-branch.model.ts`). `AuthSession` restores a stored session without the field as `employeeId: null` (D5). Give `testSession`, `LOGIN_RESPONSE` and `CHANGE_RESPONSE` an employee id. Verify with tests:
  - `auth-session.spec.ts`: the field is stored and restored, and an old stored session without it restores with `null`;
  - `login.service.spec.ts` and the change-branch service spec: the started session carries the response's `employeeId`;
  - the header shows nothing new (the existing shell tests stay green).

  Then run `npm test -- --no-watch` and `npm run build`.

## 4. Final check

- [x] 4.1 `dotnet test backend/iErp.sln`, `npm test -- --no-watch`, `npm run build` and `openspec validate user-empid-add --strict` pass. In the browser against the running API, log in, check that `sessionStorage` `ierp-session` holds `employeeId` and that the header is unchanged, then switch the branch and check that `employeeId` is unchanged. Per `CLAUDE.md`, do not update `kb/`; report which `kb/` notes are now out of date (the `USERM` mapping in `kb/architecture/backend.md`) so the user can decide.
