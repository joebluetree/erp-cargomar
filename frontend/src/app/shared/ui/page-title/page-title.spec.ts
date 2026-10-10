import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PageTitle } from './page-title';

@Component({
  imports: [PageTitle],
  template: '<h1 appPageTitle class="mb-4">A title</h1><h1 appPageTitle>Another</h1>',
})
class Host {}

describe('PageTitle', () => {
  function titles() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('h1'));
  }

  it('gives a heading the common title style: size, weight and the green main color', () => {
    const [title] = titles();

    expect(Array.from(title.classList)).toEqual(expect.arrayContaining(['text-2xl', 'font-semibold', 'text-primary']));
    expect(title.getAttribute('data-slot')).toBe('page-title');
  });

  it('keeps layout classes that the page adds, such as a margin', () => {
    const [title] = titles();

    expect(title.classList).toContain('mb-4');
  });

  it('gives every title the same style', () => {
    const [first, second] = titles();

    const style = (el: Element) => ['text-2xl', 'font-semibold', 'text-primary'].filter((c) => el.classList.contains(c));
    expect(style(first)).toEqual(style(second));
    expect(style(first)).toHaveLength(3);
  });

  it('does not use capitals or a literal color', () => {
    const [title] = titles();

    expect(title.classList).not.toContain('uppercase');
    expect(title.className).not.toMatch(/#[0-9a-f]{3,8}|\b(bg|text)-(red|blue|green|gray|slate|white|black)\b/i);
  });
});
