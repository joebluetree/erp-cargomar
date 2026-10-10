import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHouse } from '@ng-icons/lucide';
import { AppIconTone, ICON_TONES, IconToneName } from './icon-tone';

@Component({
  imports: [NgIcon, AppIconTone],
  providers: [provideIcons({ lucideHouse })],
  template: '<ng-icon name="lucideHouse" [appIconTone]="tone()" />',
})
class Host {
  readonly tone = signal<IconToneName | undefined>('blue');
}

describe('AppIconTone', () => {
  function render() {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const icon = (fixture.nativeElement as HTMLElement).querySelector('ng-icon') as HTMLElement;
    const color = () => icon.style.getPropertyValue('--ng-icon__color');
    const setTone = (tone: IconToneName | undefined) => {
      fixture.componentInstance.tone.set(tone);
      fixture.detectChanges();
    };
    return { icon, color, setTone };
  }

  it('sets the icon color to the theme value of its tone', () => {
    const { icon, color } = render();

    expect(color()).toBe('var(--icon-blue)');
    expect(icon.getAttribute('data-icon-tone')).toBe('blue');
  });

  it('offers exactly the named tones the theme defines', () => {
    expect([...ICON_TONES]).toEqual(['blue', 'green', 'amber', 'violet', 'rose', 'teal', 'brand']);
  });

  it('maps every tone to its own theme value', () => {
    const { color, setTone } = render();

    for (const tone of ICON_TONES) {
      setTone(tone);
      expect(color()).toBe(`var(--icon-${tone})`);
    }
  });

  it('follows a changed tone', () => {
    const { icon, color, setTone } = render();

    setTone('green');

    expect(color()).toBe('var(--icon-green)');
    expect(icon.getAttribute('data-icon-tone')).toBe('green');
  });

  it('leaves the icon in the text color when there is no tone', () => {
    const { icon, color, setTone } = render();

    setTone(undefined);

    expect(color()).toBe('');
    expect(icon.hasAttribute('data-icon-tone')).toBe(false);
  });

  it('uses no literal color and adds no color class', () => {
    const { icon } = render();

    expect(icon.className).not.toMatch(/text-|bg-/);
    expect(icon.getAttribute('style')).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|oklch\(/i);
  });
});
