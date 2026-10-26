import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { SKIP_LOADING, loadingInterceptor } from './loading.interceptor';
import { LoadingService } from './loading.service';

describe('loadingInterceptor', () => {
  function setup() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([loadingInterceptor])), provideHttpClientTesting()],
    });
    return { http: TestBed.inject(HttpClient), backend: TestBed.inject(HttpTestingController), loading: TestBed.inject(LoadingService) };
  }

  it('is busy while a request runs, and not once it answers', () => {
    const { http, backend, loading } = setup();
    expect(loading.busy()).toBe(false);

    http.get('a').subscribe();
    expect(loading.busy()).toBe(true);

    backend.expectOne('a').flush({});
    expect(loading.busy()).toBe(false);
  });

  it('stays busy until the last of several requests has finished', () => {
    const { http, backend, loading } = setup();
    http.get('a').subscribe();
    http.get('b').subscribe();

    backend.expectOne('a').flush({});
    expect(loading.busy()).toBe(true);
    backend.expectOne('b').flush({});
    expect(loading.busy()).toBe(false);
  });

  it('ends on a failure and on a cancelled request', () => {
    const { http, backend, loading } = setup();
    http.get('a').subscribe({ error: () => undefined });
    backend.expectOne('a').flush(null, { status: 500, statusText: 'Server Error' });
    expect(loading.busy()).toBe(false);

    const subscription = http.get('b').subscribe();
    expect(loading.busy()).toBe(true);
    subscription.unsubscribe();
    expect(loading.busy()).toBe(false);
  });

  it('leaves out a request marked SKIP_LOADING', () => {
    const { http, loading } = setup();

    http.get('a', { context: new HttpContext().set(SKIP_LOADING, true) }).subscribe();

    expect(loading.busy()).toBe(false);
  });
});
