# Spec Delta

## Purpose

Provides the scrolling notification bar shown above the header, and the Notification screen it opens with the full content of the latest announcement.

## ADDED Requirements

### Requirement: Scrolling notification bar
For a logged-in user, the shell SHALL show a bar that looks like the ICEGATE portal's "latest news" ticker (`kb/ui-templates/admin/scrolling-notify-bar1.JPG`): one flat color with the latest notification's banner text on one line, in normal-weight 16 px text: white with ICEGATE's navbar navy (`#183473`) text in the light theme, and black with white text in the dark theme (decided by the user), with a thin line below it that sets it off from the header. The banner text SHALL be the notification's banner, or its heading when it has no banner (decided by the user). It SHALL be shown exactly as entered: its spaces SHALL be kept, and each line break SHALL show as a wide gap, so the whole text stays on one line. After the text, the bar SHALL add "Click here for more Details", a little apart, smaller than the text and underlined, moving with it; it SHALL belong to the bar only, never to the text in `GENINFO` or to the Notification screen (decided by the user). The text SHALL be shown once at a time (decided by the user): it SHALL move from right to left inside a lane inset a little from both ends of the bar, entering at the lane's right end and leaving at its left end, then start again, without end. Only the latest notification SHALL be shown. The bar SHALL be on every screen inside the shell, so it does not depend on the screen opened, and it SHALL be the same for every user.

#### Scenario: Heading scrolls
- **WHEN** a user logs in and the latest notification's banner is "Office closed on Friday"
- **THEN** the white bar shows "Office closed on Friday" in navy, once, moving from right to left, over and over

#### Scenario: Colors follow the theme
- **WHEN** the user switches from the light to the dark theme
- **THEN** the bar turns black and its text white

#### Scenario: More details prompt
- **WHEN** the bar shows the banner "Office closed on Friday"
- **THEN** "Click here for more Details" follows it on the same moving line, a little apart and underlined, while the banner in `GENINFO` and the Notification screen do not contain it

#### Scenario: Heading when there is no banner
- **WHEN** the latest notification has no banner and its heading is "Revised PF rules"
- **THEN** the bar shows "Revised PF rules"

#### Scenario: Banner exactly as entered
- **WHEN** the banner is "Festival   bonus" followed by a line break and "for all staff"
- **THEN** the bar shows "Festival   bonus" with its three spaces, then a wide gap, then "for all staff", all on one line

#### Scenario: Space at both ends
- **WHEN** the text moves across the bar
- **THEN** it appears a little inside the bar's right end and disappears a little inside its left end, never touching the window's edges

#### Scenario: Shown once
- **WHEN** the text is short
- **THEN** it crosses the bar alone, with no repeat following it, and appears again at the right end after it has left on the left

#### Scenario: On every screen
- **WHEN** the user opens the Employee List, then the Holiday List
- **THEN** the bar is shown above the header on both, with the same heading

### Requirement: Bar only when there is a notification
The bar SHALL be shown only when the backend returns a notification. When the backend answers that there is none, or the request fails, the bar SHALL NOT be shown, the header SHALL stay at the top, and no error notification SHALL be shown for it.

#### Scenario: No notification
- **WHEN** there is no notification
- **THEN** no bar is shown and the header is at the top of the window

#### Scenario: Every notification hidden
- **WHEN** every `GENINFO` row has `VISIBLE` 'N'
- **THEN** no bar is shown, and the Notification screen says "There is no notification."

#### Scenario: Request fails
- **WHEN** the notification request fails
- **THEN** no bar and no error notification are shown, and the screen works as usual

### Requirement: When the bar is loaded
The bar SHALL ask for the latest notification once when a session starts: after a login, and when the application opens with a kept session, such as after a browser reload. A branch or year switch SHALL NOT ask again, as the notification is the same in every branch. After a logout the bar SHALL NOT be shown.

#### Scenario: Reload
- **WHEN** a new notification is added and the user reloads the browser
- **THEN** the bar shows the new notification's heading

#### Scenario: Logout
- **WHEN** the user logs out
- **THEN** the login screen shows no bar

### Requirement: The bar opens the Notification screen
A click anywhere on the bar SHALL open the Notification screen in the content area. The bar SHALL be a single control that the keyboard can reach and open with Enter, and its accessible name SHALL state the heading and that it opens the notification. It SHALL show the hand pointer.

#### Scenario: Click on the bar
- **WHEN** the user clicks anywhere on the bar, on the heading or beside it
- **THEN** the Notification screen opens in the content area

#### Scenario: Keyboard
- **WHEN** the user tabs to the bar and presses Enter
- **THEN** the Notification screen opens

### Requirement: Reading the moving heading
The heading SHALL stop moving while the pointer is over the bar or the bar has the keyboard focus, and it SHALL move again afterwards. When the user's system asks for reduced motion, the text SHALL NOT move: it SHALL stand still at the left of the lane, cut with an ellipsis when it is too long.

#### Scenario: Pause on hover
- **WHEN** the pointer is over the bar
- **THEN** the heading stops where it is until the pointer leaves

#### Scenario: Reduced motion
- **WHEN** the system asks for reduced motion
- **THEN** the heading stands still at the left of the bar, with an ellipsis when it does not fit

### Requirement: Notification screen
The Notification screen SHALL be at `/admin/notification` and SHALL open for any logged-in user, with no menu right. It SHALL show a back button and the title "Notification". Below them it SHALL show one box in the style of the Holiday List's box that fits its text (decided by the user): as wide as the longest line and as high as the lines. In the box the heading SHALL be on top, as the box's header (the banner when there is no heading), and the content below it. Both SHALL be shown exactly as entered: every space and line break SHALL be kept, and no line SHALL be wrapped. A line wider than the screen SHALL NOT break: the box SHALL stop at the screen's width and scroll sideways. The screen SHALL be view only.

#### Scenario: Notification shown
- **WHEN** the user opens the screen and the latest notification has heading "Office closed on Friday" and content "The office is closed on Friday.\nPlease plan your work."
- **THEN** the title is "Notification", the box shows "Office closed on Friday" at its top and the two lines of content below it

#### Scenario: Spaces and line breaks kept
- **WHEN** the content is "  The office is closed.", a blank line, then "   Please plan   your work."
- **THEN** the box shows the two leading spaces, the blank line, the three leading spaces and the three spaces between "plan" and "your", exactly as entered

#### Scenario: Box fits the text
- **WHEN** the content is a single short line
- **THEN** the box is only as wide as its longest line and only as high as the heading and that line

#### Scenario: Lines as entered
- **WHEN** the content's lines break where the user pressed Enter
- **THEN** the box shows the lines breaking at exactly those places, and the box grows to the longest of them

#### Scenario: Line wider than the screen
- **WHEN** a line is wider than the screen
- **THEN** the line stays whole, and the box scrolls sideways to show it

#### Scenario: View only
- **WHEN** the Notification screen is shown
- **THEN** it has no inputs and no edit, save or delete buttons

#### Scenario: Opened by address
- **WHEN** a logged-in user opens `/admin/notification` directly
- **THEN** the latest notification is shown

### Requirement: Notification screen states
While the notification loads, the screen SHALL show nothing of its own, as other screens do. When there is no notification, it SHALL show "There is no notification." with no error notification. Any other failure SHALL show an alert with Retry, as other screens do.

#### Scenario: No notification
- **WHEN** the screen is opened and there is no notification
- **THEN** it shows "There is no notification." and no error notification

#### Scenario: Failure
- **WHEN** the request fails for another reason
- **THEN** the screen shows an alert with Retry, and Retry asks again
