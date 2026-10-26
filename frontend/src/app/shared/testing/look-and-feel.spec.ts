import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { HlmTableImports } from '@spartan-ng/helm/table';
import { TablePager } from '../paging/table-pager';
import { ICON_TONES } from '../ui/icon-tone/icon-tone';
import { PageTitle } from '../ui/page-title/page-title';
import { TableWrapToggle } from '../ui/table-wrap-toggle/table-wrap-toggle';
import { TableToolbar } from '../ui/table-toolbar/table-toolbar';

/**
 * The common look, asserted once on the shared pieces. Screens only use these pieces (the look guard checks that),
 * so their own tests do not repeat any of this. See kb/architecture/frontend.md, "Look and feel".
 */
@Component({
  imports: [HlmButtonImports, HlmLabelImports, HlmTableImports, PageTitle, TableToolbar, TablePager, TableWrapToggle],
  template: `
    <h1 appPageTitle>A title</h1>
    <button hlmBtn type="button">Primary</button>
    <app-table-toolbar>
      <div><label hlmLabel for="x">X</label><input id="x" /></div>
      <button hlmBtn type="button">Search</button>
    </app-table-toolbar>
    <app-table-wrap-toggle />
    <div hlmTableContainer data-wrap="true">
      <table hlmTable aria-label="Sample">
        <thead hlmTHead>
          <tr hlmTr>
            <th hlmTh>A</th>
            <th hlmTh>B</th>
          </tr>
        </thead>
        <tbody hlmTBody>
          <tr hlmTr>
            <td hlmTd>1</td>
            <td hlmTd>2</td>
          </tr>
          <tr hlmTr data-state="selected">
            <td hlmTd>3</td>
            <td hlmTd>4</td>
          </tr>
        </tbody>
      </table>
    </div>
    <app-table-pager [total]="23" [page]="1" [pageSize]="10" />
  `,
})
class Sample {}

describe('common look and feel: the shared pieces', () => {
  let el: HTMLElement;
  const classes = (selector: string) => Array.from(el.querySelector(selector)!.classList);

  beforeEach(() => {
    const fixture = TestBed.createComponent(Sample);
    fixture.detectChanges();
    el = fixture.nativeElement as HTMLElement;
  });

  it('title: one size, weight and the green main color', () => {
    expect(classes('h1')).toEqual(expect.arrayContaining(['text-2xl', 'font-semibold', 'text-primary']));
  });

  it('primary button: the solid fill with its text color and a hover shade', () => {
    expect(classes('button[hlmBtn]')).toEqual(
      expect.arrayContaining(['bg-primary-surface', 'text-primary-foreground', 'hover:bg-primary-surface/80']),
    );
  });

  it('table: 12px text', () => {
    expect(classes('table')).toContain('text-xs');
    expect(classes('table')).not.toContain('text-sm');
  });

  it('header cells: header fill, its text color and column lines, and no line after the last column', () => {
    const header = classes('th');

    expect(header).toEqual(
      expect.arrayContaining(['bg-table-header', 'text-table-header-foreground', 'border-r', 'border-table-header-line', 'last:border-r-0']),
    );
    expect(header).not.toContain('text-foreground');
  });

  it('body cells: padding and column lines in the table line color, none after the last column', () => {
    expect(classes('td')).toEqual(expect.arrayContaining(['p-2', 'border-r', 'border-table-line', 'last:border-r-0']));
  });

  it('wrap mode: the container is a group that scrolls sideways, and body cells wrap when it says data-wrap="true"', () => {
    const container = el.querySelector('[data-slot="table-container"]')!;

    expect(Array.from(container.classList)).toEqual(expect.arrayContaining(['group', 'overflow-x-auto']));
    expect(container.getAttribute('data-wrap')).toBe('true');
    expect(classes('td')).toEqual(
      expect.arrayContaining(['whitespace-nowrap', 'group-data-[wrap=true]:whitespace-normal', 'group-data-[wrap=true]:wrap-anywhere']),
    );
  });

  it('headings never wrap, with wrap text on or off, so each column is at least as wide as its heading', () => {
    expect(classes('th')).toContain('whitespace-nowrap');
    expect(classes('th').filter((c) => c.includes('wrap=true'))).toEqual([]);
  });

  it('wrap toggle: one button above the table, on by default', () => {
    const toggle = el.querySelector('app-table-wrap-toggle')!;

    expect(toggle.textContent?.replace(/\s+/g, ' ').trim()).toContain('Wrap text: on');
    expect(toggle.compareDocumentPosition(el.querySelector('table')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('body rows: stripe on even rows, hover, selected color and focus ring, each excluding the selected row where needed', () => {
    const row = classes('tbody tr');

    expect(row).toEqual(
      expect.arrayContaining([
        'even:not-data-[state=selected]:bg-table-stripe',
        'hover:not-data-[state=selected]:bg-muted',
        'data-[state=selected]:bg-table-selected',
        'focus-visible:ring-2',
        'border-b',
      ]),
    );
  });

  it('a row marked selected is the same directive with data-state, so the look decides what selected means', () => {
    const [plain, selected] = Array.from(el.querySelectorAll('tbody tr'));

    expect(selected.getAttribute('data-state')).toBe('selected');
    expect(plain.getAttribute('data-state')).toBeNull();
    expect(Array.from(selected.classList).sort()).toEqual(Array.from(plain.classList).sort());
  });

  it('filter toolbar: separator, one wrapping row, separator', () => {
    const toolbar = el.querySelector('app-table-toolbar')!;

    expect(Array.from(toolbar.children).map((c) => c.tagName)).toEqual(['HR', 'DIV', 'HR']);
    expect(Array.from(toolbar.children[1].classList)).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'gap-x-6']));
  });

  it('footer: separator, one left-aligned row of range, page buttons and rows per page, separator', () => {
    const pager = el.querySelector('app-table-pager')!;
    const row = pager.querySelector('[data-slot="table-pager"]')!;

    expect(row.previousElementSibling?.tagName).toBe('HR');
    expect(row.nextElementSibling?.tagName).toBe('HR');
    expect(Array.from(row.classList)).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'justify-start']));
    expect(row.textContent).toContain('Rows per page');
  });

  it('uses no literal color anywhere in the rendered pieces', () => {
    expect(el.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|\b(bg|text|border)-(red|blue|green|gray|slate|white|black)\b/i);
  });
});

describe('common look and feel: the named values in the theme', () => {
  const css = readFileSync(resolve(process.cwd(), 'src/styles.css'), 'utf8');

  /** The declarations of the first block with the given selector, as name -> value. */
  const block = (selector: string): Record<string, string> => {
    const match = new RegExp(selector + String.raw`\s*\{([^}]*)\}`).exec(css);
    expect(match, `${selector} block`).not.toBeNull();
    const values: Record<string, string> = {};
    for (const decl of match![1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) values[decl[1]] = decl[2].trim();
    return values;
  };

  const light = block(String.raw`:root`);
  const dark = block(String.raw`:root\.dark`);
  const tableValues = ['--table-header-bg', '--table-header-fg', '--table-header-line', '--table-stripe', '--table-selected', '--table-line'];

  it('defines every table value once, in the light block, as a reference that the dark theme changes by itself', () => {
    for (const name of tableValues) {
      expect(light[name], name).toBeDefined();
      expect(dark[name], `${name} is not repeated in the dark block`).toBeUndefined();
    }
  });

  it('defines every icon color in both themes, lighter in the dark theme', () => {
    const lightness = (value: string) => Number(/oklch\(([\d.]+)/.exec(value)![1]);
    for (const tone of ICON_TONES.filter((t) => t !== 'brand')) {
      const name = `--icon-${tone}`;
      expect(light[name], `${name} in the light block`).toBeDefined();
      expect(dark[name], `${name} in the dark block`).toBeDefined();
      expect(dark[name], `${name} differs between themes`).not.toBe(light[name]);
      expect(lightness(dark[name]), `${name} is lighter in the dark theme`).toBeGreaterThan(lightness(light[name]));
    }
  });

  it('keeps the palette icon colors different from each other', () => {
    const palette = ICON_TONES.filter((t) => t !== 'brand');
    const values = palette.map((tone) => light[`--icon-${tone}`]);

    expect(new Set(values).size).toBe(palette.length);
  });

  it('makes the brand icon color follow the main green in both themes, without repeating it', () => {
    expect(light['--icon-brand']).toBe('var(--primary)');
    expect(dark['--icon-brand']).toBeUndefined();
    expect(dark['--primary']).toBe(light['--primary']);
  });

  it('maps every table value to a Tailwind color name', () => {
    for (const name of ['table-header', 'table-header-foreground', 'table-header-line', 'table-stripe', 'table-selected', 'table-line']) {
      expect(css).toContain(`--color-${name}:`);
    }
    expect(css).toContain('--color-primary-surface:');
  });

  it('makes the header, the stripes and the selected row three different values', () => {
    const values = [light['--table-header-bg'], light['--table-stripe'], light['--table-selected']];

    expect(new Set(values).size).toBe(3);
  });

  it('keeps the main green for titles, and gives the fill its own darker value in each theme, darkest in the dark theme', () => {
    expect(light['--primary']).toBe('oklch(0.48 0.11 150)');
    expect(dark['--primary']).toBe(light['--primary']);
    // oklch(L C H): the fill is darker (lower L) than the main green in both themes, and darker still in the dark theme.
    const lightness = (value: string) => Number(/oklch\(([\d.]+)/.exec(value)![1]);
    expect(lightness(light['--primary-surface'])).toBeLessThan(lightness(light['--primary']));
    expect(lightness(dark['--primary-surface'])).toBeLessThan(lightness(light['--primary-surface']));
    expect(light['--primary-surface']).toBe('oklch(0.42 0.09 150)');
    expect(dark['--primary-surface']).toBe('oklch(0.36 0.07 150)');
  });
});
