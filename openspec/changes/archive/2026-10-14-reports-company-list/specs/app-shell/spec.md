# Spec Delta

## MODIFIED Requirements

### Requirement: Shell layout on every page
Every page SHALL be displayed inside a layout with a header, a sidebar and a content area. The header SHALL show the application name, "Cargomar Pvt Ltd", which SHALL be a link that opens the Dashboard, and a hamburger button for the navigation. The content area SHALL display the current page, and the layout SHALL supply the page width and padding so feature pages do not provide their own frame. The content area SHALL fill the width that is available beside the sidebar, and the page content SHALL start at the left edge of the content area (with the layout's padding) instead of being centered or limited to a maximum width.

#### Scenario: Page inside shell
- **WHEN** the user opens any page
- **THEN** the header, sidebar and content area are shown and the page appears in the content area

#### Scenario: Application name
- **WHEN** any page is displayed
- **THEN** the header shows "Cargomar Pvt Ltd" as the application name

#### Scenario: The name opens the Dashboard
- **WHEN** the user clicks the application name in the header while on any page
- **THEN** the Dashboard is shown

#### Scenario: The name with the keyboard
- **WHEN** the user focuses the application name and presses Enter
- **THEN** the Dashboard is shown

#### Scenario: The name looks the same
- **WHEN** the header is displayed
- **THEN** the application name keeps its size and weight and shows the hand pointer, with no underline or color change

#### Scenario: Notifications unaffected
- **WHEN** an action raises a notification or a confirmation dialog on any page
- **THEN** it is shown over the page as before, independent of the layout

#### Scenario: No user menu
- **WHEN** the header is displayed
- **THEN** it contains no user or account menu

#### Scenario: Content fills the available width
- **WHEN** a page is displayed on a wide screen
- **THEN** the content area extends from the sidebar to the right edge of the window, with no maximum width

#### Scenario: Content is left-aligned
- **WHEN** a page is displayed on a wide screen
- **THEN** the page content starts at the left edge of the content area, next to the sidebar, and is not centered

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

## ADDED Requirements

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
