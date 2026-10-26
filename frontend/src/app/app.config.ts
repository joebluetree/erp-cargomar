import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { apiBaseUrlInterceptor } from './core/api/api-base-url.interceptor';
import { authTokenInterceptor, sessionExpiryInterceptor } from './core/auth/auth.interceptors';
import { httpErrorInterceptor } from './core/errors/http-error.interceptor';
import { loadingInterceptor } from './core/loading/loading.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Requests pass through in this order and responses in the reverse order, so the session-expiry interceptor
    // sees a 401 before the error interceptor would report it.
    provideHttpClient(
      withInterceptors([loadingInterceptor, apiBaseUrlInterceptor, authTokenInterceptor, httpErrorInterceptor, sessionExpiryInterceptor]),
    ),
  ],
};
