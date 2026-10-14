import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { HlmToaster } from '@spartan-ng/helm/sonner';
import { App } from './app';

describe('App', () => {
  it('shows every notification at the top right of the window', () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const toasters = fixture.debugElement.queryAll(By.directive(HlmToaster));
    expect(toasters).toHaveLength(1);
    expect((toasters[0].componentInstance as HlmToaster).position()).toBe('top-right');
  });
});
