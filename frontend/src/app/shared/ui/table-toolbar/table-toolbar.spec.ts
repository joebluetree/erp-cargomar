import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TableToolbar } from './table-toolbar';

@Component({
  imports: [TableToolbar],
  template: `
    <app-table-toolbar>
      <div id="pair-a"><label for="a">A</label><input id="a" /></div>
      <div id="pair-b"><label for="b">B</label><input id="b" /></div>
      <button id="go" type="button">Search</button>
    </app-table-toolbar>
  `,
})
class Host {}

describe('TableToolbar', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    return { el, toolbar: el.querySelector('app-table-toolbar')! };
  }

  it('is a separator, one row and a separator, in this order', () => {
    const { toolbar } = render();

    expect(Array.from(toolbar.children).map((c) => c.tagName)).toEqual(['HR', 'DIV', 'HR']);
  });

  it('puts what the screen projects into the row, in order, with nothing else', () => {
    const { toolbar } = render();

    const row = toolbar.children[1];
    expect(Array.from(row.children).map((c) => c.id)).toEqual(['pair-a', 'pair-b', 'go']);
  });

  it('wraps the row when it is too narrow and spaces its parts', () => {
    const { toolbar } = render();

    const row = toolbar.children[1];
    expect(Array.from(row.classList)).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'items-center', 'gap-x-6', 'gap-y-3']));
  });

  it('draws the separators in the table line color, the lower one with a gap before the table', () => {
    const { toolbar } = render();

    const [above, , below] = Array.from(toolbar.children);
    expect(above.classList).toContain('border-table-line');
    expect(below.classList).toContain('border-table-line');
    expect(below.classList).toContain('mb-4');
  });

  it('is a block element so the separators span the width', () => {
    const { toolbar } = render();

    expect(toolbar.classList).toContain('block');
    expect(toolbar.getAttribute('data-slot')).toBe('table-toolbar');
  });

  it('uses no literal color', () => {
    const { toolbar } = render();

    expect(toolbar.innerHTML).not.toMatch(/#[0-9a-f]{3,8}\b|\b(bg|text|border)-(red|blue|green|gray|slate|white|black)\b/i);
  });
});
