import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmLabelImports } from '@spartan-ng/helm/label';
import { clickableSelector } from './clickable';

/** The shared checkbox, asserted once here so screens that use it only check their own content. */
@Component({
  imports: [HlmCheckboxImports, HlmLabelImports, ReactiveFormsModule],
  template: `
    <hlm-checkbox inputId="agree" [formControl]="agree" />
    <label hlmLabel for="agree">Agree</label>
  `,
})
class Host {
  readonly agree = new FormControl(false, { nonNullable: true });
}

describe('shared checkbox', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    return fixture;
  }

  afterEach(() => document.body.replaceChildren());

  const box = () => document.getElementById('agree') as HTMLButtonElement;

  it('is a focusable button with role checkbox and aria-checked, so Space toggles it natively', async () => {
    await render();

    expect(box().tagName).toBe('BUTTON');
    expect(box().getAttribute('type')).toBe('button');
    expect(box().getAttribute('role')).toBe('checkbox');
    expect(box().tabIndex).toBe(0);
    expect(box().getAttribute('aria-checked')).toBe('false');
  });

  it('toggles the form control on click and shows the new state', async () => {
    const fixture = await render();

    box().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.agree.value).toBe(true);
    expect(box().getAttribute('aria-checked')).toBe('true');

    box().click();
    fixture.detectChanges();
    expect(fixture.componentInstance.agree.value).toBe(false);
    expect(box().getAttribute('aria-checked')).toBe('false');
  });

  it('toggles when its label is clicked', async () => {
    const fixture = await render();

    (document.querySelector('label[for="agree"]') as HTMLLabelElement).click();
    fixture.detectChanges();

    expect(fixture.componentInstance.agree.value).toBe(true);
  });

  it('shows the form control value it is given', async () => {
    const fixture = await render();

    fixture.componentInstance.agree.setValue(true);
    fixture.detectChanges();

    expect(box().getAttribute('aria-checked')).toBe('true');
  });

  it('gets the hand pointer from the global rule and its own class', async () => {
    await render();

    expect(box().matches(clickableSelector())).toBe(true);
    expect(box().classList).toContain('cursor-pointer');
    expect(box().classList).not.toContain('cursor-default');
  });
});
