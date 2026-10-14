import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldError } from './field-error';

@Component({
  imports: [FieldError],
  template: '<p appFieldError id="name-error" class="mt-1">Name is required.</p>',
})
class Host {}

describe('FieldError', () => {
  function message(): HTMLElement {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).querySelector('p')!;
  }

  it('gives a validation message the common style: small text in the error color', () => {
    const el = message();

    expect(Array.from(el.classList)).toEqual(expect.arrayContaining(['text-sm', 'text-destructive']));
    expect(el.getAttribute('data-slot')).toBe('field-error');
  });

  it('keeps layout classes that the screen adds', () => {
    expect(message().classList).toContain('mt-1');
  });
});
