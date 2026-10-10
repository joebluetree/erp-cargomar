/**
 * Finds places where a screen sets the brand or table look itself instead of using the shared pieces in
 * `shared/ui` (see kb/architecture/frontend.md, "Look and feel"). Pure text checks, used by `look-guard.spec.ts`.
 */

export interface SourceFile {
  path: string;
  text: string;
}

export interface LookViolation {
  path: string;
  line: number;
  found: string;
  why: string;
}

const PALETTE =
  'slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black';

const RULES: { pattern: RegExp; why: string }[] = [
  {
    pattern: new RegExp(
      String.raw`(?<![\w-])(?:bg|text|border|ring|outline|fill|stroke|from|to|via|divide|shadow|decoration)-(?:${PALETTE})(?:-\d{2,3})?(?:/\d+)?(?![\w-])`,
      'g',
    ),
    why: 'a literal palette color; use the shared pieces or a theme value',
  },
  {
    pattern: /(?<![\w&])#[0-9a-fA-F]{6}\b|(?<![\w&])#[0-9a-fA-F]{3}\b(?=["'\s;)])/g,
    why: 'a literal hex color',
  },
  {
    pattern: /(?<![\w-])(?:bg|text|border|ring)-(?:primary(?:-surface|-foreground)?|table-[a-z-]+|muted|accent|secondary|card|popover|destructive|sidebar[a-z-]*)(?:\/\d+)?(?![\w-])/g,
    why: 'a brand, table or surface color class; the shared title, button, table, toolbar and pager set these',
  },
  {
    pattern: /(?<![\w-])(?:rgb|rgba|hsl|hsla|oklch|oklab)\(/g,
    why: 'a literal color function',
  },
];

/** Secondary text is allowed on screens: it is the one color class screens may use. */
const ALLOWED = ['text-muted-foreground'];

export function findLookViolations(files: readonly SourceFile[]): LookViolation[] {
  const violations: LookViolation[] = [];
  for (const file of files) {
    file.text.split('\n').forEach((rawLine, index) => {
      let line = rawLine;
      for (const allowed of ALLOWED) line = line.split(allowed).join(' '.repeat(allowed.length));
      for (const { pattern, why } of RULES) {
        for (const match of line.matchAll(pattern)) {
          violations.push({ path: file.path, line: index + 1, found: match[0], why });
        }
      }
    });
  }
  return violations;
}
