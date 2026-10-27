# app-shell Specification

## Purpose
Defines the frame around every frontend screen: header, sidebar navigation menu and content area, and how they behave on small and large screens.

## Requirements

### Requirement: Shell layout on every page
Every page except the login screen SHALL be displayed inside a layout with a header, a sidebar and a content area. The header SHALL show, as its main title at the top left, the name of the logged-in company ("Cargomar Pvt Ltd" when there is no session), shown in the brand green of the page titles (the Dashboard title's colour), which SHALL be a link that opens the Dashboard, and a hamburger button for the navigation. At its right it SHALL show the logged-in session details, the Change branch button (`user-branch-change`), the theme switch and the Logout button, as defined by the `user-session` capability. The content area SHALL display the current page, and the layout SHALL supply the page width and padding so feature pages do not provide their own frame. The content area SHALL fill the width that is available beside the sidebar, and the page content SHALL start at the left edge of the content area (with the layout's padding) instead of being centered or limited to a maximum width.

#### Scenario: Page inside shell
- **WHEN** the user opens any page other than the login screen
- **THEN** the header, sidebar and content area are shown and the page appears in the content area

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

### Requirement: Navigation menu
The sidebar SHALL list Dashboard first, then the user's menu from the backend (`user-menu-api`). Each module SHALL appear as a heading with its name, followed by its menu entries. Each entry SHALL have a label (the menu name), an icon and a destination (the menu's route with its `menuId`). The menu SHALL vary by the user's rights in the session branch, and SHALL be loaded again after login and after a branch switch. The entry matching the current page SHALL be visibly highlighted, and choosing an entry SHALL navigate to its destination. While the menu loads, or when it cannot be loaded, only Dashboard SHALL be listed.

#### Scenario: Initial entries
- **WHEN** the menu is displayed
- **THEN** it lists Dashboard with an icon first

#### Scenario: Modules and entries
- **WHEN** the user's menu is module "Hr" with "Company List" and "Profile"
- **THEN** the sidebar shows Dashboard, the heading "Hr", then "Company List" and "Profile", each with an icon

#### Scenario: No rights
- **WHEN** the user's menu is empty
- **THEN** the sidebar lists only Dashboard

#### Scenario: Navigate
- **WHEN** the user chooses an entry
- **THEN** its destination is shown in the content area

#### Scenario: Highlight current entry
- **WHEN** the user is on a page beneath an entry's destination
- **THEN** that entry is highlighted and Dashboard is not

#### Scenario: Dashboard highlight is exact
- **WHEN** the user is on any page other than the application root
- **THEN** the Dashboard entry is not highlighted

#### Scenario: Branch switched
- **WHEN** the user switches the branch
- **THEN** the sidebar shows the menu of the new branch

#### Scenario: Adding an entry
- **WHEN** a menu is marked for the new software in `MENUM` with a route of the application, and a user is given rights on it
- **THEN** the entry appears in that user's menu without changes to the shell

### Requirement: Responsive sidebar
At a width of 768 pixels or more the sidebar SHALL be visible beside the content, and the header hamburger button SHALL hide it and show it again; while it is hidden the content SHALL use the full width, and the choice SHALL be kept while the application stays open, including when the user moves between screens, and SHALL start as shown after a browser reload. Below 768 pixels the sidebar SHALL be hidden and the header hamburger button SHALL open it as an overlay over the content. Choosing an entry in the overlay SHALL close it, and the overlay SHALL also be closable without choosing an entry.

#### Scenario: Wide screen
- **WHEN** the window is 768 pixels wide or more
- **THEN** the sidebar is displayed next to the content and the header hamburger button is shown

#### Scenario: Hide the sidebar
- **WHEN** the window is 768 pixels wide or more and the user activates the hamburger button
- **THEN** the sidebar is hidden and the content uses the full width

#### Scenario: Show the sidebar again
- **WHEN** the sidebar is hidden and the user activates the hamburger button
- **THEN** the sidebar is shown beside the content again

#### Scenario: Kept while navigating
- **WHEN** the user hides the sidebar and opens another screen from the Dashboard
- **THEN** the sidebar is still hidden

#### Scenario: Shown after a reload
- **WHEN** the user hides the sidebar and reloads the browser page
- **THEN** the sidebar is shown

#### Scenario: Open overlay
- **WHEN** the window is narrower than 768 pixels and the user activates the header hamburger button
- **THEN** the menu opens as an overlay

#### Scenario: Close after choosing
- **WHEN** the user chooses an entry in the overlay
- **THEN** the overlay closes and the chosen page is shown

#### Scenario: Close without choosing
- **WHEN** the overlay is open and the user dismisses it
- **THEN** it closes and the current page stays shown

### Requirement: Keyboard and screen reader access
The menu entries and the header hamburger button SHALL be operable with the keyboard and SHALL have accessible names. On a wide screen the button's name SHALL describe what it will do ("Hide navigation bar" or "Show navigation bar") and it SHALL tell assistive technology whether the sidebar is expanded; on a narrow screen its name SHALL describe opening the menu.

#### Scenario: Keyboard navigation
- **WHEN** the user tabs to a menu entry and presses Enter
- **THEN** the destination is opened

#### Scenario: Button name
- **WHEN** a screen reader reads the header hamburger button
- **THEN** it announces a name that describes what the button does: opening the menu on a narrow screen, hiding or showing the navigation bar on a wide screen

#### Scenario: Button name on a wide screen
- **WHEN** a screen reader reads the hamburger button while the sidebar is shown
- **THEN** it announces "Hide navigation bar", and "Show navigation bar" once the sidebar is hidden, and whether the sidebar is expanded

#### Scenario: Button name on a narrow screen
- **WHEN** a screen reader reads the hamburger button on a narrow screen
- **THEN** it announces a name that describes opening the menu

#### Scenario: Keyboard toggle
- **WHEN** the user focuses the hamburger button and presses Enter or Space
- **THEN** it hides or shows the sidebar (wide) or opens the overlay (narrow)

### Requirement: Routing inside the shell
All feature routes SHALL be displayed inside the shell, except the login screen at `/login`, which SHALL be displayed on its own. The routes inside the shell SHALL require a session (`user-session`). The root route SHALL show the Dashboard, and a path matching no route SHALL redirect to the Dashboard. The Home page and its route SHALL NOT exist.

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

#### Scenario: Home removed
- **WHEN** the application is searched for a Home page or Home route
- **THEN** neither exists

### Requirement: Light and dark theme
The application SHALL provide a light theme and a dark theme, and the header SHALL contain an icon button that switches between them. The button SHALL show the theme the user will switch to, SHALL have an accessible name that states the action, and SHALL be operable with the keyboard. All screens and components SHALL follow the selected theme. The theme SHALL NOT depend on a backend call.

#### Scenario: Switch to dark
- **WHEN** the application is in light mode and the user activates the theme button
- **THEN** every screen and component is shown in the dark theme, the button now shows a sun, and its accessible name is "Switch to light theme"

#### Scenario: Switch back to light
- **WHEN** the application is in dark mode and the user activates the theme button
- **THEN** the light theme is shown, the button shows a moon, and its accessible name is "Switch to dark theme"

#### Scenario: Choice remembered
- **WHEN** the user chooses dark and later reloads the application or opens it again in the same browser
- **THEN** the dark theme is shown

#### Scenario: First visit follows the system
- **WHEN** the user opens the application for the first time and the operating system prefers a dark color scheme
- **THEN** the dark theme is shown

#### Scenario: First visit with no preference
- **WHEN** the user opens the application for the first time and the operating system has no dark preference
- **THEN** the light theme is shown

#### Scenario: No flash
- **WHEN** the application loads with dark chosen
- **THEN** the page is never shown in the light theme before the dark theme is applied

#### Scenario: Storage unavailable
- **WHEN** the browser does not allow storing the choice
- **THEN** the switch still changes the theme for the current visit and nothing fails

#### Scenario: Overlays follow the theme
- **WHEN** the dark theme is active and the user opens a dialog, the mobile menu or triggers a notification
- **THEN** each is shown in the dark theme

### Requirement: Comfortable dark-mode text
In the dark theme, normal text SHALL be a softened light gray rather than near-white, SHALL keep a contrast ratio of at least 4.5:1 against the dark backgrounds, and secondary text SHALL remain dimmer than normal text. Light-mode colors SHALL be unchanged.

#### Scenario: Softened text
- **WHEN** the dark theme is active
- **THEN** body, card, dialog, menu and table text uses a light gray that is visibly dimmer than white

#### Scenario: Still readable
- **WHEN** the dark theme is active
- **THEN** normal text against the page background has a contrast ratio of at least 4.5:1

#### Scenario: Light mode unchanged
- **WHEN** the light theme is active
- **THEN** its text and background colors are the same as before this requirement

### Requirement: Shell stays out of feature lazy loading
The shell and menu SHALL be part of the initial download, and feature code SHALL remain loaded on demand.

#### Scenario: Feature code not in initial download
- **WHEN** the application first loads
- **THEN** the code of lazy-loaded features is not part of the initial download

### Requirement: Brand color
The application's main color SHALL be green, defined once in the theme. Primary buttons, page titles (the main heading of a page) and table header rows SHALL use it, with white text where text sits on it. The solid green behind primary buttons and table header rows (the fill) SHALL be a darker, less bright green than the main color used for page titles, in both themes, and darker still in the dark theme, so that it is not glaring, while page titles keep the green main color. The color SHALL keep its text readable in both the light and the dark theme (white text on a fill at least 4.5:1, and a page title in the main green at least 3:1 on the page background).

#### Scenario: Primary button
- **WHEN** a primary (default) button such as Search is displayed
- **THEN** its background is the green main color and its text is white

#### Scenario: Page title
- **WHEN** a page is displayed
- **THEN** its main heading is in the green main color

#### Scenario: Dimmer fills in both themes
- **WHEN** either theme is active
- **THEN** the Search button and the table header are a darker, less bright green than the page title, with white text on them, and in the dark theme they are darker than in the light theme

#### Scenario: One definition
- **WHEN** the main color is changed in the theme
- **THEN** every primary button, page title and table header follows it without further edits

#### Scenario: Both themes
- **WHEN** the user switches between the light and the dark theme
- **THEN** the green main color, and the text on and in it, stay readable in each
