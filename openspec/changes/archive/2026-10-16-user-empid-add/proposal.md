# Proposal

## Why

`kb/modules/admin/login-screen.md` v1.1 ("Employee ID Fetched", change ref `user-empid-add`) adds `USERM.USER_EMP_ID` to the login's data model: after a successful login, the system must also know the user's employee id. Later screens (HR, attendance, approvals and the like) need to know which employee is working without asking for it again. Today the login neither reads the column nor keeps it in the session.

## What Changes

- **Read `USER_EMP_ID`.** The read-only `USERM` mapping gains `USER_EMP_ID` (`NVARCHAR2(40)`, nullable). In the dev data it holds the 36-character `EMPM.EMP_PKID` of the user's employee: 337 of 440 users have one, and every value matches an `EMPM` row. `EMPM` itself is not read.
- **Login returns it.** The session details of `POST /api/admin/login` gain `employeeId`, the user's `USER_EMP_ID` with surrounding spaces removed, or `null` when the user has none.
- **The token carries it.** The access token carries the employee id as its own claim when the user has one, and no such claim when not.
- **Backend services can read it.** `ICurrentSession` gains `EmployeeId`, read from the token like the other session values.
- **Branch change keeps it.** `POST /api/admin/session/change` re-reads the user, so the new session keeps the same employee id.
- **Frontend keeps it.** The browser session (`AuthSession`) stores `employeeId` with the rest of the session. It is not shown anywhere: it is an internal id, not a readable code (decided by the user).

### Assumptions (recorded because the BRS is silent)

- **A missing employee id does not block the login** (decided by the user). The session just has `employeeId: null`; nothing else changes.
- The value is used as stored. It is not checked against `EMPM`, and no employee details (name or code) are fetched; a later change can add them when a screen needs them.
- A session stored in the browser before this change has no `employeeId`. It is read as `null` and keeps working until the user logs in again.
- **Knowledge base:** per `CLAUDE.md`, `kb/` is not updated by this change. The BRS already lists v1.1 and marks it Implemented. The `USERM` mapping notes in `kb/architecture/backend.md` would be out of date by one column; this is reported at the end for the user to decide.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `user-login-api`:
  - "Session details" adds the employee id, or empty when the user has none.
  - "Access token" carries it when present.
- `user-session`: "Session context on the backend" adds the employee id to what services can read.
- `user-branch-change`: "Select switches the session" keeps the employee id along with the user and company.

## Impact

- **Backend.**
  - `iErp.Entities/User.cs` gains `EmployeeId`, and `iErp.Data/Configurations/UserConfiguration.cs` maps it (`USER_EMP_ID`, max length 40), with a snapshot-only migration.
  - `iErp.Admin`:
    - `SessionDto` gains `EmployeeId`.
    - `LoginService` and `ChangeBranchService` fill it.
    - `SessionTokenIssuer` adds the claim.
  - `iErp.Shared/Auth`: `SessionClaims.EmployeeId` and `ICurrentSession.EmployeeId`.
  - `iErp.Api/Auth/HttpCurrentSession.cs` reads it.
  - Tests in `iErp.Tests`: mapping, login and change-branch services, token issuer, endpoints, and the Oracle-only table tests that create a shaped `USERM`.
- **Frontend.**
  - `Session` (`core/auth/auth-session.ts`), the login and change-branch response models, and their test fixtures gain `employeeId: string | null`.
  - Restoring a stored session tolerates its absence.
  - No screen changes.
- **API.** One new field in the login and branch-change response. It is additive, not breaking.
- **Database.** One more column read from `USERM`. There is no write and no DDL; the migration is snapshot-only.
