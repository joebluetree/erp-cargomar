# Spec Delta

## MODIFIED Requirements

### Requirement: Session details in the header
While a session exists, the header SHALL show, at its right, before the theme switch: the user name, then the branch name, then the financial year name, for example `ADMIN   Kochi   2025-2026` (the company is the header's main title, see `app-shell`). The user name SHALL be shown in bold blue, the branch name in dark yellow, and the financial year in bold in the theme's text color (black in the light theme); each color SHALL stay readable in both the light and the dark theme. On narrow screens the text SHALL shorten without pushing the header buttons out of view, and the full text SHALL remain available on hover and to screen readers.

#### Scenario: Details shown
- **WHEN** user "ADMIN" of company "Cargomar Pvt Ltd" with branch "Kochi" and year "2025-2026" is logged in
- **THEN** the header shows `ADMIN` (bold blue), `Kochi` (dark yellow) and `2025-2026` (bold, the text color) in that order, before the theme switch, and "Cargomar Pvt Ltd" as its main title at the top left

#### Scenario: Narrow screen
- **WHEN** the window is 360 pixels wide
- **THEN** the theme switch and the Logout button stay visible and the details are shortened
