/**
 * A multi-colour calendar icon for ng-icons (`provideIcons({ appCalendarColor })`, `<ng-icon name="appCalendarColor" />`):
 * a rose top bar with rings in the muted text colour, a page in the card colour, and blue, green and amber day dots.
 * All its colours are theme values in `styles.css` (`--icon-<tone>`, `--card`, `--muted-foreground`), so they follow
 * the light and dark themes; an icon tone does not recolour it.
 */
export const appCalendarColor = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" data-icon="calendar-color">
  <path d="M3 7a2.5 2.5 0 0 1 2.5-2.5h13A2.5 2.5 0 0 1 21 7v2.5H3z" fill="var(--icon-rose)"/>
  <path d="M3 9.5h18v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 18.5z" fill="var(--card)"/>
  <rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke="var(--icon-rose)"/>
  <rect x="6.75" y="2.5" width="2" height="4.5" rx="1" fill="var(--muted-foreground)"/>
  <rect x="15.25" y="2.5" width="2" height="4.5" rx="1" fill="var(--muted-foreground)"/>
  <circle cx="8" cy="13.25" r="1.35" fill="var(--icon-blue)"/>
  <circle cx="12" cy="13.25" r="1.35" fill="var(--icon-green)"/>
  <circle cx="16" cy="13.25" r="1.35" fill="var(--icon-amber)"/>
  <circle cx="8" cy="17.25" r="1.35" fill="var(--icon-amber)"/>
  <circle cx="12" cy="17.25" r="1.35" fill="var(--icon-rose)"/>
  <circle cx="16" cy="17.25" r="1.35" fill="var(--icon-blue)"/>
</svg>`;
