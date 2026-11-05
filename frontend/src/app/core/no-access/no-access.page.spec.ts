import { TestBed } from '@angular/core/testing';
import { NoAccessPage } from './no-access.page';

describe('NoAccessPage', () => {
  it('says the user has no access, under the page title', () => {
    const fixture = TestBed.createComponent(NoAccessPage);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;

    expect(el.querySelector('h1')!.getAttribute('data-slot')).toBe('page-title');
    expect(el.querySelector('h1')!.textContent?.trim()).toBe('No access');
    expect(el.querySelector('[data-slot="no-access"]')!.textContent?.trim()).toBe('You do not have access to this screen.');
    expect(el.querySelectorAll('button, input')).toHaveLength(0);
  });
});
