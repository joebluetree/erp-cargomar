import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * The selector list of the global `clickable-cursor` rule in `styles.css` (everything that gets the hand pointer).
 * The tests check, with the DOM's own `matches`, that what the screens render is covered by it.
 */
export function clickableSelector(): string {
  const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');
  const marker = css.indexOf('clickable-cursor');
  if (marker < 0) throw new Error('styles.css has no clickable-cursor rule');
  const start = css.indexOf('*/', marker) + 2;
  const end = css.indexOf('{', start);
  const body = css.slice(end + 1, css.indexOf('}', end));
  if (!/cursor:\s*pointer/.test(body)) throw new Error('the clickable-cursor rule does not set cursor: pointer');
  return css.slice(start, end).trim();
}

/** The enabled things on screen that a user can click: buttons, links, dropdowns, role=button. */
export function clickableElements(root: ParentNode): Element[] {
  return Array.from(root.querySelectorAll('button, a[href], select, [role="button"], summary')).filter(
    (el) => !(el as HTMLButtonElement).disabled && el.getAttribute('aria-disabled') !== 'true',
  );
}
