import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router, Routes, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from '../../app.routes';
import { AuthSession } from './auth-session';
import { testSession } from './auth-session.testing';
import { authGuard, guestGuard } from './auth.guards';

@Component({ template: '<p>stub</p>' })
class Stub {}

describe('auth guards', () => {
  beforeEach(() => sessionStorage.clear());

  async function navigate(url: string, appRoutes: Routes = routes): Promise<Router> {
    TestBed.configureTestingModule({ providers: [provideRouter(appRoutes)] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router);
  }

  const logIn = () => TestBed.inject(AuthSession).start(testSession());

  describe('with the application routes', () => {
    it('shows the login screen for the Dashboard without a session', async () => {
      const router = await navigate('/');

      expect(router.url).toBe('/login');
    });

    it('shows the login screen for a feature without a session', async () => {
      const router = await navigate('/reports/companies');

      expect(router.url).toBe('/login');
    });

    it('shows the login screen for an unknown path without a session', async () => {
      const router = await navigate('/no/such/page');

      expect(router.url).toBe('/login');
    });

    it('opens the Dashboard and features with a session', async () => {
      TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
      logIn();
      const harness = await RouterTestingHarness.create();
      const router = TestBed.inject(Router);

      await harness.navigateByUrl('/');
      expect(router.url).toBe('/');

      await harness.navigateByUrl('/no/such/page');
      expect(router.url).toBe('/');
    });

    it('sends a logged-in user from the login screen to the Dashboard', async () => {
      TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
      logIn();
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/login');

      expect(TestBed.inject(Router).url).toBe('/');
    });

    it('ends the session for an automatic-login link, so the link decides who is logged in', async () => {
      TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
      logIn();
      const harness = await RouterTestingHarness.create();
      const auth = TestBed.inject(AuthSession);

      // The link's own login runs next (autoLoginGuard); here only the old session must be gone.
      void harness.navigateByUrl('/login?appid=app-1');
      await new Promise((resolve) => setTimeout(resolve));

      expect(auth.isActive()).toBe(false);
    });

    it('shows the login screen once the session has expired', async () => {
      TestBed.configureTestingModule({ providers: [provideRouter(routes)] });
      TestBed.inject(AuthSession).start(testSession({ expiresAt: new Date(Date.now() + 1000).toISOString() }));
      vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 5000);
      const harness = await RouterTestingHarness.create();

      await harness.navigateByUrl('/');

      expect(TestBed.inject(Router).url).toBe('/login');
      vi.restoreAllMocks();
    });
  });

  it('does not download a guarded lazy feature without a session', async () => {
    const loadFeature = vi.fn(() => Promise.resolve([{ path: '', component: Stub }]));
    const router = await navigate('/feature', [
      { path: 'login', canMatch: [guestGuard], component: Stub },
      { path: '', canMatch: [authGuard], children: [{ path: 'feature', loadChildren: loadFeature }] },
    ]);

    expect(router.url).toBe('/login');
    expect(loadFeature).not.toHaveBeenCalled();
  });
});
