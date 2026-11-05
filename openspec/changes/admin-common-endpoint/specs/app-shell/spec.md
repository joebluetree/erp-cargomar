# Spec Delta

## MODIFIED Requirements

### Requirement: Shell layout on every page
Every page except the login screen and the common view's entry and message page (`common-view`, `/view`) SHALL be displayed inside a layout with a header, a sidebar and a content area. For a session started by the common view (`common-view`), the layout SHALL show only the content area, with its padding: no announcement bar, no header and no sidebar or menu button. The header SHALL show, as its main title at the top left, the name of the logged-in company ("Cargomar Pvt Ltd" when there is no session), shown in the brand green of the page titles (the Dashboard title's colour), which SHALL be a link that opens the Dashboard, and a hamburger button for the navigation. At its right it SHALL show the logged-in session details, the Change branch button (`user-branch-change`), the theme switch and the Logout button, as defined by the `user-session` capability. The content area SHALL display the current page, and the layout SHALL supply the page width and padding so feature pages do not provide their own frame. The content area SHALL fill the width that is available beside the sidebar, and the page content SHALL start at the left edge of the content area (with the layout's padding) instead of being centered or limited to a maximum width.

#### Scenario: Page inside shell
- **WHEN** the user of a normal login opens any page other than the login screen and `/view`
- **THEN** the header, sidebar and content area are shown and the page appears in the content area

#### Scenario: Common view session shows only the content
- **WHEN** the session was started by the common view and the Holiday List is shown at `/admin/holidays?menuId=NS-HOLIDAYLIST`
- **THEN** only the content area is shown, with no announcement bar, header, sidebar or menu button

#### Scenario: Normal login after the common view
- **WHEN** the user then logs in normally in the same tab
- **THEN** the header and sidebar are shown again

#### Scenario: Application name
- **WHEN** a user of company "CARGOMAR PRIVATE LTD" is logged in and any page inside the shell is displayed
- **THEN** the header's main title at the top left is "CARGOMAR PRIVATE LTD"

#### Scenario: The name opens the Dashboard
- **WHEN** the user clicks the application name in the header while on any page
- **THEN** the Dashboard is shown

#### Scenario: The name with the keyboard
- **WHEN** the user focuses the application name and presses Enter
- **THEN** the Dashboard is shown

#### Scenario: The name looks the same
- **WHEN** the header is displayed
- **THEN** the application name keeps its size and weight, is shown in the same green as the Dashboard title, and shows the hand pointer, with no underline and no change of color on hover

#### Scenario: Notifications unaffected
- **WHEN** an action raises a notification or a confirmation dialog on any page
- **THEN** it is shown over the page as before, independent of the layout

#### Scenario: No user menu
- **WHEN** the header is displayed for a logged-in user
- **THEN** its right side shows, in order, the session details, the Change branch button, the theme switch and the Log out button, and it contains no other user or account menu

#### Scenario: Content fills the available width
- **WHEN** a page is displayed on a wide screen
- **THEN** the content area extends from the sidebar to the right edge of the window, with no maximum width

#### Scenario: Content is left-aligned
- **WHEN** a page is displayed on a wide screen
- **THEN** the page content starts at the left edge of the content area, next to the sidebar, and is not centered

### Requirement: Routing inside the shell
All feature routes SHALL be displayed inside the shell, except the login screen at `/login` and the common view's entry and message page at `/view` (`common-view`), which SHALL each be displayed on their own. The routes inside the shell SHALL require a session (`user-session`). The root route SHALL show the Dashboard, and a path matching no route SHALL redirect to the Dashboard. The Home page and its route SHALL NOT exist.

#### Scenario: Root shows Dashboard
- **WHEN** a logged-in user opens the application root
- **THEN** the Dashboard is shown in the shell

#### Scenario: Unknown path
- **WHEN** a logged-in user opens a path that matches no route
- **THEN** the application redirects to the Dashboard

#### Scenario: Unknown path without a session
- **WHEN** a user without a session opens a path that matches no route
- **THEN** the login screen is shown

#### Scenario: Login outside the shell
- **WHEN** the user opens `/login`
- **THEN** the login screen is shown without the header and sidebar

#### Scenario: Common view outside the shell
- **WHEN** the user opens `/view` with an invalid link
- **THEN** the message is shown without the header and sidebar

#### Scenario: Home removed
- **WHEN** the application is searched for a Home page or Home route
- **THEN** neither exists
