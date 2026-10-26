/**
 * A two-tone profile icon for ng-icons (`provideIcons({ appProfileColor })`, `<ng-icon name="appProfileColor" />`):
 * a violet head and blue shoulders on a soft violet circle. All its colours are theme values in `styles.css`
 * (`--icon-<tone>`), so they follow the light and dark themes; an icon tone does not recolour it.
 */
export const appProfileColor = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" data-icon="profile-color">
  <circle cx="12" cy="12" r="10.5" style="fill: var(--icon-violet); fill-opacity: 0.18"/>
  <circle cx="12" cy="9" r="3.8" fill="var(--icon-violet)"/>
  <path d="M4.9 19.2a8 8 0 0 1 14.2 0A10.4 10.4 0 0 1 12 22.5a10.4 10.4 0 0 1-7.1-3.3z" fill="var(--icon-blue)"/>
</svg>`;
