import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { finalize } from 'rxjs';
import { LoadingService } from './loading.service';

/** Set on a request that should not show the loading bar or freeze the screen (for example a background poll). */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

/**
 * Counts every backend request in `LoadingService` while it runs, so the shell can show its loading bar and freeze
 * the screen. A request counts until it answers, fails or is cancelled.
 */
export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.context.get(SKIP_LOADING)) return next(req);
  const loading = inject(LoadingService);
  loading.begin();
  return next(req).pipe(finalize(() => loading.end()));
};
