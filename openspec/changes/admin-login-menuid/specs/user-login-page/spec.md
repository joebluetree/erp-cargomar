# Spec Delta

## ADDED Requirements

### Requirement: Automatic login opens the linked menu
When an automatic login from `/login?appid=<id>` succeeds and the URL also has a non-blank `menuid` parameter, the application SHALL open the screen of the user's menu whose code (`MENUM.MENU_CODE`) equals it, ignoring surrounding spaces and letter case, at its route (`MENUM.MENU_ROUTE1`), in place of the Dashboard (BR-002.1). Without `menuid`, or with a blank one, the Dashboard SHALL open as before (BR-002.2).

#### Scenario: Profile from the link
- **WHEN** a user with the view right on Profile opens `/login?appid=<id>&menuid=NS-EMPPROFILE` for a row that allows the login
- **THEN** the Profile screen is shown inside the shell, and neither the login screen nor the Dashboard is shown

#### Scenario: No menu id
- **WHEN** a user opens `/login?appid=<id>` for a row that allows the login
- **THEN** the Dashboard is shown, as before

#### Scenario: Blank menu id
- **WHEN** a user opens `/login?appid=<id>&menuid=` for a row that allows the login
- **THEN** the Dashboard is shown, with no warning

#### Scenario: Code in another case
- **WHEN** the link has `menuid= ns-empprofile ` and the user may open Profile
- **THEN** the Profile screen is shown

### Requirement: Linked menu address
When the linked menu opens, the address bar SHALL show that screen's normal address, `/<route>?menuId=<code>`, as when the screen is opened from the menu. The address with `appid` and `menuid` SHALL be replaced, not kept in the history.

#### Scenario: Address after opening the menu
- **WHEN** the automatic login opens Profile from `menuid=NS-EMPPROFILE`
- **THEN** the address bar shows `/admin/profile?menuId=NS-EMPPROFILE`, and going back does not return to the address with `appid`

### Requirement: Linked menu not available
When the `menuid` is not the code of a menu in the user's menu (an unknown code, or no view right in the session branch), or the user's menu cannot be loaded, the user SHALL stay logged in, the Dashboard SHALL open, and exactly one warning notification, "The requested screen is not available.", SHALL be shown.

#### Scenario: Unknown code
- **WHEN** the automatic login succeeds with `menuid=NO-SUCH-MENU`
- **THEN** the Dashboard is shown with the warning "The requested screen is not available." and the session is kept

#### Scenario: No view right
- **WHEN** the automatic login succeeds with `menuid=NS-EMPLIST` for a user without the view right on Employee List in the session branch
- **THEN** the Dashboard is shown with the same single warning, and the Employee List is not opened

#### Scenario: Menu cannot be loaded
- **WHEN** the automatic login succeeds with a `menuid` and the user's menu cannot be loaded
- **THEN** the Dashboard is shown with the same single warning

### Requirement: Menu id ignored when the automatic login fails
A failed automatic login SHALL behave as without `menuid`: the login screen is shown with the single warning "Automatic login failed. Please log in.", and no other notification is shown. A `menuid` without an `appid` SHALL be ignored, and the login screen opens as usual.

#### Scenario: Refused login with a menu id
- **WHEN** the backend refuses the automatic login for `/login?appid=<id>&menuid=NS-EMPPROFILE`
- **THEN** the login screen is shown with only the warning "Automatic login failed. Please log in."

#### Scenario: Menu id alone
- **WHEN** `/login?menuid=NS-EMPPROFILE` is opened
- **THEN** the normal login screen is shown and nothing is sent
