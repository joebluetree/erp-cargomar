# Proposal

## Why

Users who are already logged in to the old system should open the new software without typing their user code, password and company again. The old system saves each user's login details in the `APPDETAILS` table and opens the new software with that row's id in the URL (`kb/modules/admin/auto-login.md`, v1.0, BR-001).

## What Changes

- New backend endpoint `POST /api/admin/login/auto`. It takes an app id, reads that `APPDETAILS` row, and logs the user in only when `USER_LOGGED_OUT` is 'N' (BR-001.1, BR-001.2).
  - The row's user code, password and company code go through the same credential check as the normal login.
  - Its branch and year become the session's branch and year.
  - On success it answers exactly like `POST /api/admin/login`: a token and the session details.
- Every failure gets one general 401 answer. This covers an unknown id, a logged-out user, wrong details, and a branch or year that is not allowed.
- `APPDETAILS` is read only. The application never writes it. Logout in the new software does not change `USER_LOGGED_OUT`.
- New login-screen behaviour: opening the login screen with `?appid=<id>` logs in automatically and opens the Dashboard without showing the login form (BR-001.S1).
  - The id is removed from the address bar straight away.
  - If the automatic login fails, the normal login screen is shown with the message "Automatic login failed. Please log in."

## Capabilities

### New Capabilities
- `user-auto-login`: the backend automatic login from an `APPDETAILS` row. It covers the endpoint, the logged-out check, how branch and year are chosen, the failure answer, and read-only access to `APPDETAILS`.

### Modified Capabilities
- `user-login-page`: the login screen logs in automatically when its URL carries an app id, and falls back to the normal form with a message when that fails.

## Impact

- **Backend** (`iErp.Admin/Login`, `iErp.Entities`, `iErp.Data`):
  - a new read-only entity and mapping for `APPDETAILS`, excluded from migrations;
  - a new auto-login service method and endpoint that share the existing credential check;
  - an empty migration that only records the model snapshot;
  - new unit and integration tests.
- **Frontend** (`features/admin/login`): the login page and the login service gain the automatic login, with tests.
- **Security**: decided with the user to follow the document as written.
  - Anyone who has or guesses a valid app id of a user who has not logged out can log in as that user.
  - `APPDETAILS` holds the password in plain text.
  - The risks are listed in `design.md`.
- **Knowledge base**: per `CLAUDE.md`, no `kb/` document is changed. `kb/architecture/backend.md` and `kb/architecture/frontend.md` do not describe the auto-login endpoint or the `appid` URL; that update is left for the user to request.
