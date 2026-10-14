# Spec Delta

## Purpose

Defines one common look and feel for the whole application: the colors and sizes are named once in the theme, and the title, buttons, table header, table rows, filter row and footer come from shared building blocks, so every screen looks the same and a change to the look is made in one place.

## ADDED Requirements

### Requirement: The look is defined once, as named theme values
The theme SHALL define the colors of the common look once, for the light and the dark theme, under names: the brand colors (main color, solid fill, text on the fill), the table header, the table header's column lines, the alternating row, the selected row, the row hover and the table's column lines. Screens SHALL use these names and SHALL NOT use literal colors or set the brand or table colors themselves. A new theme value SHALL be usable as a style name without further setup.

#### Scenario: One place to change
- **WHEN** a developer changes the table header color in the theme
- **THEN** the header of every table changes, in the theme where it was changed, with no change to any screen

#### Scenario: Both themes defined
- **WHEN** the application is shown in the light theme and in the dark theme
- **THEN** every named value of the common look has a color in each theme

### Requirement: Page titles share one style
Every page's main heading SHALL use one shared title style (size, weight and the green main color) defined in one place. A page SHALL NOT restyle its own title.

#### Scenario: Same title everywhere
- **WHEN** the Dashboard and the Company List are displayed
- **THEN** their titles have the same size, weight and color

#### Scenario: One place to change
- **WHEN** the shared title style is changed
- **THEN** the title of every page changes

### Requirement: Buttons share one style
Primary buttons SHALL use the solid fill color and its text color from the theme through the shared button style, in every screen.

#### Scenario: Primary button
- **WHEN** a primary button is displayed on any screen
- **THEN** it has the solid fill color with the fill's text color, and a dimmer fill in the dark theme

### Requirement: Tables share one look
Every table built with the shared table pieces SHALL have the same look without any styling on the screen: a header row with the table header color, its text color and column lines in the header line color; body rows with alternating stripes, a hover color, column lines in the table line color and the selected row color for a row marked selected (by a `data-state="selected"` attribute); no column line after the last column; and 12px text. The selected row SHALL differ from the header and from the stripes.

#### Scenario: A table with no styling of its own
- **WHEN** a screen renders a table with the shared pieces and adds no color or size classes
- **THEN** its header, stripes, hover, selected row, column lines and text size are the common look

#### Scenario: Selected row
- **WHEN** a body row is marked selected
- **THEN** it shows the selected row color instead of its stripe

#### Scenario: Last column
- **WHEN** a table is displayed
- **THEN** no column line is drawn after the last column of a row

### Requirement: Tables can scroll or wrap their content
Every table built with the shared table pieces SHALL support two ways of fitting its content, chosen by a shared "Wrap text" toggle shown directly above the table, left-aligned. With wrapping off, cells keep their text on one line and the table scrolls horizontally inside its own container when it is wider than the screen. With wrapping on (the default), the text in the header and body cells wraps to the available width, long unbroken text such as an email address breaks where needed, and the table does not need a horizontal scrollbar. The toggle SHALL show its state in its label ("Wrap text: off" or "Wrap text: on") and to assistive technology, SHALL be usable by keyboard, and SHALL NOT send a request or change the rows shown.

#### Scenario: Default is wrapping
- **WHEN** a table is displayed for the first time
- **THEN** wrapping is on, the label reads "Wrap text: on", the cells wrap their text to the available width and the table fits the screen without a horizontal scrollbar

#### Scenario: Wrapping off
- **WHEN** the user turns the toggle off
- **THEN** the label reads "Wrap text: off", the cells keep their text on one line and the table scrolls horizontally when it is wider than the screen

#### Scenario: Wrapping on again
- **WHEN** the user turns the toggle back on
- **THEN** the label reads "Wrap text: on" and the cells wrap again

#### Scenario: Long unbroken text
- **WHEN** wrapping is on (the default) and a cell holds a long unbroken value such as an email address
- **THEN** the value breaks where needed instead of widening the table

#### Scenario: Toggle does not reload
- **WHEN** the user turns the toggle on or off
- **THEN** no request is sent and the same rows are shown

#### Scenario: State and keyboard
- **WHEN** the toggle is on and a screen reader reads it, or the user focuses it and presses Enter or Space
- **THEN** it is announced as pressed, and Enter or Space switches it (off is announced as not pressed)

### Requirement: Navigation icons are colored
Every entry of the main navigation SHALL have its own icon color, taken from a small set of named icon colors defined once in the theme for the light and the dark theme (blue, green, amber, violet, rose and teal). The same icon color SHALL be used wherever that entry's icon is shown: the sidebar, the slide-in menu on narrow screens and the Dashboard quick links. Each icon color SHALL be at least 3:1 against the sidebar background and against the hover and active background in both themes. The icon color SHALL NOT change when the entry is hovered or active, and an entry with no icon color SHALL show its icon in the text color.

#### Scenario: Each entry has its own color
- **WHEN** the main menu is displayed
- **THEN** the Dashboard icon is blue and the Company List icon is green

#### Scenario: Same color everywhere
- **WHEN** the Dashboard quick link for the Company List and its sidebar entry are both displayed
- **THEN** their icons have the same color

#### Scenario: Slide-in menu
- **WHEN** the menu is opened on a narrow screen
- **THEN** its entries show the same colored icons as the sidebar

#### Scenario: Both themes
- **WHEN** the user switches between the light and the dark theme
- **THEN** each icon color changes to its value for that theme (lighter in the dark theme) and stays readable against the background

#### Scenario: Hover and active
- **WHEN** an entry is hovered or is the current page
- **THEN** its icon keeps its color

#### Scenario: One place to change
- **WHEN** an icon color is changed in the theme
- **THEN** every place that shows an icon of that color follows it

#### Scenario: No icon color
- **WHEN** a menu entry has no icon color
- **THEN** its icon is shown in the text color

### Requirement: The header hamburger icon is the brand green
The icon of the header hamburger buttons (the wide-screen button that hides and shows the navigation bar and the narrow-screen button that opens the menu) SHALL be the brand green, the same green as the page titles, in both themes, defined through the named icon colors. It SHALL keep that color when the button is hovered or focused, and SHALL be at least 3:1 against the header background in both themes.

#### Scenario: Both buttons
- **WHEN** the header is displayed on a wide screen and on a narrow screen
- **THEN** the visible hamburger icon is the brand green

#### Scenario: Same green as the titles
- **WHEN** a page title and the hamburger icon are displayed together
- **THEN** they are the same green

#### Scenario: Hover keeps the color
- **WHEN** the user hovers or focuses the hamburger button
- **THEN** the icon keeps the brand green

#### Scenario: Both themes
- **WHEN** the user switches between the light and the dark theme
- **THEN** the icon is the brand green in each and stays at least 3:1 against the header

### Requirement: Clickable items show a hand
Everything the user can click SHALL show the hand pointer when the mouse is over it: buttons, links, the page size dropdown, selectable table rows, the sort buttons in table headers, the hamburger and theme buttons, the toggle and the pager buttons. Items that cannot be used at that moment (a disabled button, such as First page on the first page) SHALL NOT show the hand. The hand SHALL be set once for the whole application, so a new clickable item gets it without extra styling.

#### Scenario: Buttons
- **WHEN** the mouse is over an enabled button of any kind
- **THEN** the pointer is a hand

#### Scenario: Links
- **WHEN** the mouse is over a navigation entry or a Dashboard quick link
- **THEN** the pointer is a hand

#### Scenario: Table rows and headers
- **WHEN** the mouse is over a selectable table row or a sort button in a header
- **THEN** the pointer is a hand

#### Scenario: Dropdown
- **WHEN** the mouse is over the page size dropdown
- **THEN** the pointer is a hand

#### Scenario: Disabled
- **WHEN** the mouse is over a disabled button
- **THEN** the pointer is not a hand

#### Scenario: A new clickable item
- **WHEN** a developer adds a button or a link to any screen
- **THEN** it shows the hand with no cursor styling of its own

### Requirement: Filter rows share one layout
Every table with filters SHALL put them in the shared filter toolbar: a thin separator above, one wrapping row holding the filters with their labels beside them and the Search button, and a thin separator below.

#### Scenario: Toolbar
- **WHEN** a screen shows a table with filters
- **THEN** its filters and Search button are in one row between two separators

### Requirement: Table footers share one component
Every table SHALL use the shared table footer described in the `server-side-tables` capability.

#### Scenario: Same footer
- **WHEN** two different tables are displayed
- **THEN** their footers are the same component with the same layout

### Requirement: Screens cannot bypass the common look
An automated check SHALL fail the build when a screen's template or code sets brand or table colors directly (for example a literal color, or the main-color, fill, muted, accent or table-color style names) instead of using the shared pieces.

#### Scenario: Raw color in a screen
- **WHEN** a screen template contains a literal color or sets the brand or table color classes itself
- **THEN** the check fails and names the file

#### Scenario: Shared pieces pass
- **WHEN** screens use only the shared pieces and layout classes
- **THEN** the check passes
