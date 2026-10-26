import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { LoadingService } from './loading.service';

@Component({ template: 'page' })
class Page {}

describe('LoadingService', () => {
  function setup() {
    let allow: (ok: boolean) => void = () => undefined;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Page },
          // A page that waits, as one does while its code downloads or its rights are checked.
          { path: 'slow', canActivate: [() => new Promise<boolean>((resolve) => (allow = resolve))], component: Page },
        ]),
      ],
    });
    const loading = TestBed.inject(LoadingService);
    return { loading, router: TestBed.inject(Router), allow: (ok: boolean) => allow(ok) };
  }

  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  it('is busy while a page change is in progress, until it ends', async () => {
    const { loading, router, allow } = setup();
    expect(loading.busy()).toBe(false);

    const navigation = router.navigateByUrl('/slow');
    await settle();
    expect(loading.busy()).toBe(true);

    allow(true);
    await navigation;
    expect(loading.busy()).toBe(false);
  });

  it('ends a page change that is refused', async () => {
    const { loading, router, allow } = setup();

    const navigation = router.navigateByUrl('/slow');
    await settle();
    allow(false);
    await navigation;

    expect(loading.busy()).toBe(false);
  });

  it('is busy while a request runs, even with no page change', () => {
    const { loading } = setup();

    loading.begin();
    expect(loading.busy()).toBe(true);
    loading.end();
    expect(loading.busy()).toBe(false);
  });
});
