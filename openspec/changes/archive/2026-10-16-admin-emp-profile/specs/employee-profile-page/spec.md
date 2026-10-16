# Spec Delta

## Purpose

Provides the Profile screen: a view-only page, opened from the main menu, that shows the logged-in user their own employee details in separate boxes.

## ADDED Requirements

### Requirement: Profile menu entry
The main navigation SHALL have a **Profile** entry with its own icon and icon color that opens the Profile screen at `/admin/profile` inside the shell. Choosing it SHALL show the logged-in user's own profile directly, without a list or a search step. Like every menu entry, it SHALL also appear as a Dashboard quick link.

#### Scenario: Open from the menu
- **WHEN** a logged-in user chooses Profile in the sidebar
- **THEN** the Profile screen shows that user's own employee profile, and the Profile entry is highlighted

#### Scenario: Slide-in menu
- **WHEN** the user chooses Profile in the menu on a narrow screen
- **THEN** the menu closes and the Profile screen is shown

#### Scenario: Quick link
- **WHEN** the Dashboard is shown
- **THEN** it has a Profile quick link with the same icon and color as the menu entry

#### Scenario: Without a session
- **WHEN** a user without a session opens `/admin/profile`
- **THEN** the login screen is shown

### Requirement: Profile layout
When the content area is at least as wide as the boxes at their natural width, the boxes SHALL be in rows, as in the reference `profile.JPG`. The first row holds the basic box, Contact Details and Bank Details, all as tall as the tallest of them. Below are Address (under the basic box, the same width) and ID and Documents (under Contact and Bank, spanning both, as tall as Address). Otherwise the five boxes SHALL stack at full width.

#### Scenario: Fits
- **WHEN** the profile is shown at 1920px wide and the boxes fit
- **THEN** the basic box, Contact Details and Bank Details are on the first row, left to right, and Address and ID and Documents are on the second row

#### Scenario: Order
- **WHEN** the profile is shown, in rows or stacked
- **THEN** Contact Details comes before Bank Details, and the stacked order is basic, Address, Contact Details, Bank Details, ID and Documents

#### Scenario: Too narrow
- **WHEN** the browser window is made narrower than the boxes' natural total width in a row
- **THEN** all five boxes are shown one below the other at full width; and when the window is widened again so that they fit, the rows come back

#### Scenario: Same height
- **WHEN** the boxes are in rows
- **THEN** Contact Details and Bank Details are exactly as tall as the basic box, and ID and Documents is exactly as tall as Address

#### Scenario: Equal width
- **WHEN** the boxes are in rows
- **THEN** the basic box and the Address box have the same width

#### Scenario: Not stretched
- **WHEN** the boxes are in rows on a 1920px wide screen
- **THEN** the columns are sized to their content and are not stretched to the content width

#### Scenario: Long values wrap
- **WHEN** a value is long, such as an address line
- **THEN** it wraps inside its box, which stays at most about 48rem wide

#### Scenario: Basic rows
- **WHEN** the profile is loaded
- **THEN** the first box shows the image area (about 190px across) on the left and, on its right, the name followed by Employee Code, Father's Name, Spouse Name, Marital Status and Date of Birth, one per row, each label on the left with its value on its right

#### Scenario: Initials
- **WHEN** the employee's name is "Asha Nair"
- **THEN** the image area shows "AN"

#### Scenario: Narrow screen
- **WHEN** the screen is phone-width
- **THEN** the boxes are stacked in the order basic, Address, Contact Details, Bank Details, ID and Documents, the image area is above the basic rows, and the page does not scroll sideways

### Requirement: Photo in the image area
When the profile says a photo is available, the basic box's round image area SHALL show the employee's photo, filling the circle. Otherwise, or when the photo cannot be loaded, it SHALL show the initials, with no error notification. The photo SHALL be requested with the user's session, and only when the profile says one is available.

#### Scenario: Photo shown
- **WHEN** the profile has `hasPhoto` true and the photo loads
- **THEN** the image area shows the photo instead of the initials

#### Scenario: No photo
- **WHEN** the profile has `hasPhoto` false
- **THEN** no photo is requested and the image area shows the initials

#### Scenario: Photo fails to load
- **WHEN** the photo request fails
- **THEN** the image area shows the initials and no error notification is shown

### Requirement: Address box
One box headed "Address" SHALL show the current address on the left and the permanent address on the right, each under its own sub-heading (Current, Permanent). Each side SHALL start with one Address row: Address 1, Address 2, Address 3 and "P.O. <value>" one per line under a single label, empty lines left out, and a dash when all four are empty. City, State, PIN Code and Country rows SHALL follow. On phones Permanent SHALL be below Current.

#### Scenario: Side by side
- **WHEN** the profile is shown on a wide screen
- **THEN** the Address box shows Current on the left and Permanent on the right

#### Scenario: Address lines merged
- **WHEN** the current address has Address 1 "House 1", Address 2 "Road 2", Address 3 "Area 3" and P.O. "PO 1"
- **THEN** the Current side shows one Address label with "House 1", "Road 2", "Area 3" and "P.O. PO 1" on separate lines

#### Scenario: Empty lines skipped
- **WHEN** Address 3 and P.O. are empty
- **THEN** the Address value shows only Address 1 and Address 2, with no blank lines; and when all four are empty it shows "—"

#### Scenario: Phone
- **WHEN** the screen is phone-width
- **THEN** the Permanent side is below the Current side

### Requirement: Profile fields shown
Every field of the BRS data model SHALL be shown as a row, with its label on the left and its value on the right: the name as the basic box's title; Employee Code, Father's Name, Spouse Name, Marital Status and Date of Birth (basic box); Bank A/C No, Bank Name, Branch and IFSC Code (Bank Details); the Address row, City, State, PIN Code and Country (each side of the Address box); Mobile and Email (Contact Details); Aadhaar, PAN, PF, ESI No and UAN (ID and Documents). The date of birth SHALL be shown as `05-03-1990` and the email in lower case. A field without a value SHALL show a dash.

#### Scenario: Values
- **WHEN** the employee's PAN is "ABCDE1234F" and the date of birth is 1990-03-05
- **THEN** the ID and Documents box shows PAN "ABCDE1234F" and the first box shows Date of Birth "05-03-1990"

#### Scenario: Email in lower case
- **WHEN** the employee's email is stored as "VSPRADEEP1973@GMAIL.COM"
- **THEN** Contact Details shows Email "vspradeep1973@gmail.com"

#### Scenario: Empty value
- **WHEN** the employee has no spouse name
- **THEN** Spouse Name shows "—"

#### Scenario: State and country names
- **WHEN** the current address is in "KERALA", "INDIA"
- **THEN** the Current side of the Address box shows State "KERALA" and Country "INDIA", not internal ids

### Requirement: Profile colours
Box headings SHALL use the dark slate and all field labels, including the basic box's rows, the light blue of the reference UI template. Each is a named theme value with a light and a dark value, at least 4.5:1 against the tinted box in both themes. Field values SHALL keep the normal text color, and the page title SHALL keep the shared green title style.

#### Scenario: Reference colours
- **WHEN** the profile is shown in the light theme
- **THEN** each box heading is dark slate and every field label, including the basic box's rows, is blue

#### Scenario: Both themes
- **WHEN** the user switches to the dark theme
- **THEN** the headings and labels change to their dark-theme values and stay readable against the box background

#### Scenario: Title unchanged
- **WHEN** the profile is shown
- **THEN** the page title "Profile" has the same style and green color as every other page title

### Requirement: Reference box style
The page SHALL keep the application's own background (white in the light theme, the normal dark background in the dark theme), with no backdrop behind the boxes. The boxes SHALL be filled with a pale blue-grey tint, a named theme value with a light and a dark value, and SHALL have large rounded corners, a soft shadow and no outline.

#### Scenario: Light
- **WHEN** the profile is shown in the light theme
- **THEN** pale blue-grey rounded boxes with a soft shadow sit directly on the white page

#### Scenario: Dark
- **WHEN** the user switches to the dark theme
- **THEN** the page keeps its dark background, the boxes change to their dark tint and the text stays readable

### Requirement: View only
The Profile screen SHALL be view only: it SHALL show no input fields and no edit, save or delete actions, and it SHALL NOT send any request that changes data.

#### Scenario: No edit actions
- **WHEN** the profile is shown
- **THEN** there are no input fields and no edit, save or delete buttons

### Requirement: Profile states
While the profile loads the screen SHALL show a loading message. When the user has no employee profile the screen SHALL say so, without an error notification. When the load fails for another reason the screen SHALL show an alert with a Retry button that repeats the request.

#### Scenario: Loading
- **WHEN** the request has not been answered
- **THEN** a loading message is shown and no boxes are shown

#### Scenario: No employee profile
- **WHEN** the backend answers 404
- **THEN** the screen says no employee profile is linked to the user, and no error notification is shown

#### Scenario: Load fails
- **WHEN** the backend answers 500 or cannot be reached
- **THEN** the screen shows an alert with a Retry button, and Retry sends the request again
