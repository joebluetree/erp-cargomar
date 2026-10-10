// Minimal typings for the look-and-feel tests, which read source files with Node (the project has no @types/node).
// This folder is excluded from the application build.
declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
  export function readdirSync(path: string): string[];
  export function statSync(path: string): { isDirectory(): boolean };
}
declare module 'node:path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
}
declare const process: { cwd(): string };
