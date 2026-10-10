import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { findLookViolations, SourceFile } from './look-guard';

/** Every template and code file of the screens (not their tests), read from disk. */
function featureFiles(): SourceFile[] {
  const root = resolve(process.cwd(), 'src/app/features');
  const files: SourceFile[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (/\.(html|ts)$/.test(name) && !/\.spec\.ts$/.test(name)) files.push({ path: full, text: readFileSync(full, 'utf8') });
    }
  };
  walk(root);
  return files;
}

describe('look guard: screens use the shared look', () => {
  it('finds the screens to check (so the check cannot pass by reading nothing)', () => {
    const paths = featureFiles().map((f) => f.path.split('\\').join('/'));

    expect(paths.some((p) => p.endsWith('features/reports/company-list/company-list.page.html'))).toBe(true);
    expect(paths.some((p) => p.endsWith('features/dashboard/dashboard.html'))).toBe(true);
    expect(paths.length).toBeGreaterThanOrEqual(8);
  });

  it('finds no literal color and no brand or table color class in any screen', () => {
    const violations = findLookViolations(featureFiles());

    expect(violations.map((v) => `${v.path}:${v.line} ${v.found} (${v.why})`)).toEqual([]);
  });
});

describe('look guard: the checker itself', () => {
  const check = (text: string) => findLookViolations([{ path: 'sample.html', text }]).map((v) => v.found);

  it('flags brand and table color classes, with or without a variant', () => {
    expect(check('<h1 class="text-primary">')).toEqual(['text-primary']);
    expect(check('<th class="bg-primary-surface text-primary-foreground">')).toEqual(['bg-primary-surface', 'text-primary-foreground']);
    expect(check('<tr class="hover:bg-muted even:bg-table-stripe">')).toEqual(['bg-muted', 'bg-table-stripe']);
    expect(check('<td class="border-table-line bg-primary/15">')).toEqual(['border-table-line', 'bg-primary/15']);
    expect(check('<div class="bg-accent dark:bg-secondary">')).toEqual(['bg-accent', 'bg-secondary']);
  });

  it('flags literal palette colors', () => {
    expect(check('<p class="text-red-500 bg-white border-gray-200">')).toEqual(['text-red-500', 'bg-white', 'border-gray-200']);
    expect(check('<p class="bg-blue-600/50">')).toEqual(['bg-blue-600/50']);
  });

  it('flags hex colors and color functions', () => {
    expect(check('<p style="color: #ff0000">')).toEqual(['#ff0000']);
    expect(check('<p style="color:#fff;">')).toEqual(['#fff']);
    expect(check('<p style="background: rgb(0, 128, 0)">')).toEqual(['rgb(']);
    expect(check("color: 'oklch(0.5 0.1 150)'")).toEqual(['oklch(']);
  });

  it('reports the file and the line', () => {
    const [violation] = findLookViolations([{ path: 'a/b.html', text: 'ok\n\n<h1 class="text-primary">' }]);

    expect(violation).toMatchObject({ path: 'a/b.html', line: 3, found: 'text-primary' });
  });

  it('allows layout classes, secondary text and the neutral base colors', () => {
    expect(check('<div class="flex flex-wrap items-center gap-4 rounded-md border p-4 text-center">')).toEqual([]);
    expect(check('<p class="text-muted-foreground">')).toEqual([]);
    expect(check('<div class="bg-background text-foreground border-border">')).toEqual([]);
    expect(check('<input #nameInput (input)="x($event)" />')).toEqual([]);
  });

  it('allows the shared pieces by name', () => {
    expect(check('<h1 appPageTitle>Title</h1><th hlmTh></th><tr hlmTr [attr.data-state]="s"></tr><app-table-toolbar></app-table-toolbar>')).toEqual([]);
  });
});
