# Design

## Context

See proposal.md for the motivation. The current state:

- **`USERM`** is mapped read-only by `User` and `UserConfiguration` (`ExcludeFromMigrations`, explicit upper-case columns). Only the columns the login uses are mapped.
- **`USER_EMP_ID`** (read-only check of the dev schema `ICARDATA2`):
  - `NVARCHAR2(40)`, nullable;
  - 337 of 440 users have a value, and 336 values are distinct;
  - every value is 36 characters and matches an `EMPM.EMP_PKID`.
- **Session values flow** along one path:
  1. `LoginService` builds a `SessionDto`.
  2. `SessionTokenIssuer.Issue` turns it into claims (`SessionClaims`).
  3. `HttpCurrentSession` reads the claims back for `ICurrentSession`.
- **`ChangeBranchService`** re-reads the active `User` row and builds a new `SessionDto` for the new branch and year.
- **On the frontend:**
  - `AuthSession` stores the `Session` (token, expiry and the `SessionDto` fields) in `sessionStorage`;
  - `LoginService` and `ChangeBranchService` spread `response.session` into it.
- **Test fixtures:** the Oracle-only table tests (`LoginTablesTests` and `ChangeBranchTablesTests`) create a shaped `USERM` when the schema has none.

## Goals / Non-Goals

**Goals:**
- One new session value, `employeeId`, that follows the same path as the others: mapping → `SessionDto` → claim → `ICurrentSession` → browser session.
- No behaviour change for users without an employee id.

**Non-Goals:**
- Reading `EMPM`, or showing employee details.
- Validating the employee id.
- Showing the id on any screen.
- Scoping any existing data by employee.

## Decisions

### D1. Map `USER_EMP_ID` as `User.EmployeeId`
`HasColumnName("USER_EMP_ID").HasMaxLength(40)`, nullable string.

Add a snapshot-only migration (`UserEmployeeIdReadOnlyMapping`); the table is excluded, so `Up`/`Down` stay empty. Delete the migration if EF reports no change, as for the earlier read-only mappings.

### D2. `SessionDto.EmployeeId` as the last, nullable parameter
`string? EmployeeId`, trimmed, with null or blank becoming `null`.

It goes last so the existing positional order stays readable. The JSON becomes `"employeeId": "…"` or `"employeeId": null`.

Alternative considered: `""` instead of `null`. Rejected: `null` says "none" unambiguously for later screens, and the spec's "empty value" covers both.

### D3. Token claim `ierp:employee_id`, only when present
`SessionClaims.EmployeeId = "ierp:employee_id"`. `SessionTokenIssuer` adds the claim only when `EmployeeId` is not null.

`HttpCurrentSession.EmployeeId` returns the claim or `null`. A token issued before this change simply has no claim, so it reads as `null` and stays valid.

Alternative considered: always add the claim with an empty value. Rejected: an absent claim is the standard way to say "none", and it keeps older tokens equivalent.

### D4. Branch change keeps it
`ChangeBranchService` builds its `SessionDto` from the re-read `User` row, so it passes `user.EmployeeId` (trimmed) in the same way. No new query is needed: `FindActiveUserAsync` already loads the whole mapped row.

### D5. Frontend: one optional-in-storage field
- `Session.employeeId: string | null`, and the same field on `LoginResponse.session` and `ChangeBranchResponse.session`.
- `AuthSession` restores a stored session without the field as `employeeId: null`, so tabs that were open before a deploy keep working.
- Nothing displays it, so `details()`, the header and the look guard are untouched.
- Test fixtures (`testSession`, `LOGIN_RESPONSE`, `CHANGE_RESPONSE`) get a value, so specs prove the field passes through.

## Risks / Trade-offs

- **[The id is an internal key, not a readable code]** Nothing shows it, so no user sees a 36-character string. A later change that needs a name or code reads `EMPM` by this key.
- **[Duplicate employee ids]** One value in the dev data is shared by 2 users. Accepted: the employee id is information, not a login key, so two users of one employee both log in normally.
- **[Sessions that are already open]** Tokens and stored sessions from before the deploy have no employee id. They read as `null` until the next login; no 401 or reload is forced.
- **[Oracle-only tests]** Their shaped `USERM` must gain `USER_EMP_ID`, or the mapped query fails with ORA-00904 on a schema where the tests create the table. Task 1 updates both `CREATE TABLE` statements.

## Migration Plan

1. Deploy the backend and frontend together, as usual. The new field is additive, so either order would still work.
2. No database change.
3. Rollback: redeploy the previous build. Extra claims in tokens issued meanwhile are ignored.
