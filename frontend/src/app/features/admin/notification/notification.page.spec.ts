import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideLocationMocks } from '@angular/common/testing';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { routes } from '../../../app.routes';
import { Announcement } from '../../../core/announcement/announcement.model';
import { NotificationService } from '../../../core/notifications/notification.service';
import { NotificationPage } from './notification.page';
import { NotificationScreenService } from './notification.service';

const ANNOUNCEMENT: Announcement = {
  id: 7,
  banner: 'Festival bonus announced',
  heading: 'Office closed on Friday',
  content: 'The office is closed on Friday.\nPlease plan your work.',
  createdDate: '2026-10-28T10:15:00',
};

@Component({ template: 'stub' })
class Stub {}

describe('NotificationPage', () => {
  let http: HttpTestingController;
  const notifications = { error: vi.fn() };

  async function open(...urls: string[]) {
    notifications.error.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', component: Stub },
          { path: 'admin/holidays', component: Stub },
          { path: 'admin/notification', providers: [NotificationScreenService], component: NotificationPage },
        ]),
        provideLocationMocks(),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: notifications },
      ],
    });
    TestBed.inject(Router).setUpLocationChangeListener();
    const harness = await RouterTestingHarness.create();
    for (const url of urls) await harness.navigateByUrl(url);
    http = TestBed.inject(HttpTestingController);
    const el = () => harness.routeNativeElement as HTMLElement;
    return { harness, el, router: TestBed.inject(Router) };
  }

  function answer(harness: RouterTestingHarness, body: Announcement | { status: number }) {
    const req = http.expectOne('admin/notification');
    if ('status' in body) req.flush({ status: body.status }, { status: body.status, statusText: 'x' });
    else req.flush(body);
    harness.detectChanges();
  }

  const text = (node: Element | null | undefined) => node?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  const box = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-slot="notification-box"]');

  async function settle(fixture: ComponentFixture<unknown>) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await fixture.whenStable();
  }

  it('shows Back, the title Notification and the box, in that order, the heading heading the box', async () => {
    const { harness, el } = await open('/admin/notification');
    expect(box(el())).toBeNull(); // nothing of its own while it loads: the shell shows the spinner
    answer(harness, ANNOUNCEMENT);

    const back = el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!;
    const title = el().querySelector('h1')!;
    expect(text(title)).toBe('Notification');
    expect(title.getAttribute('data-slot')).toBe('page-title');
    expect(back.compareDocumentPosition(title) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(title.compareDocumentPosition(box(el())!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    const heading = box(el())!.querySelector('[data-slot="notification-heading"]')!;
    expect(text(heading)).toBe('Office closed on Friday');
    expect(box(el())!.querySelector('[data-slot="notification-content"]')!.previousElementSibling).toBe(heading);
  });

  it('shows the heading and the content exactly as entered: spaces and line breaks kept, no line wrapped', async () => {
    const { harness, el } = await open('/admin/notification');
    answer(harness, {
      ...ANNOUNCEMENT,
      heading: '  Office   closed\non Friday ',
      content: ' The office is closed on Friday.\n\n   Please plan   your work.  ',
    });

    const heading = el().querySelector<HTMLElement>('[data-slot="notification-heading"]')!;
    const content = el().querySelector<HTMLElement>('[data-slot="notification-content"]')!;
    expect(heading.textContent).toBe('  Office   closed\non Friday ');
    expect(content.textContent).toBe(' The office is closed on Friday.\n\n   Please plan   your work.  ');
    for (const node of [heading, content]) {
      expect(node.classList).toContain('whitespace-pre');
      expect([...node.classList].filter((c) => /pre-wrap|pre-line|overflow-wrap|break-/.test(c))).toEqual([]);
    }
  });

  it('uses the banner as the heading when there is no heading', async () => {
    const { harness, el } = await open('/admin/notification');
    answer(harness, { ...ANNOUNCEMENT, heading: null });

    expect(el().querySelector('[data-slot="notification-heading"]')!.textContent).toBe('Festival bonus announced');
  });

  it("has the Holiday List box's look and fits its text: as wide as the longest line, as high as the lines", async () => {
    const { harness, el } = await open('/admin/notification');
    answer(harness, ANNOUNCEMENT);

    const classes = box(el())!.classList;
    for (const c of ['rounded-2xl', 'bg-profile-box', 'shadow-md', 'w-fit', 'h-fit', 'max-w-full']) expect(classes).toContain(c);
    // No fixed width or height.
    expect([...classes].filter((c) => /^(md:|lg:)?(min-)?[wh]-(\[|screen|full|\d)/.test(c))).toEqual([]);
  });

  it('scrolls a line wider than the screen sideways instead of breaking it', async () => {
    const { harness, el } = await open('/admin/notification');
    answer(harness, { ...ANNOUNCEMENT, content: 'A very long line '.repeat(30) });

    const body = el().querySelector('[data-slot="notification-content"]')!.parentElement!;
    expect(body.classList).toContain('overflow-x-auto');
    expect(box(el())!.classList).toContain('max-w-full');
  });

  it('shows only the heading when there is no content', async () => {
    const { harness, el } = await open('/admin/notification');
    answer(harness, { ...ANNOUNCEMENT, content: null });

    expect(text(box(el()))).toBe('Office closed on Friday');
    expect(el().querySelector('[data-slot="notification-content"]')).toBeNull();
  });

  it('is view only: no inputs and no buttons but Back', async () => {
    const { harness, el } = await open('/admin/notification');
    answer(harness, ANNOUNCEMENT);

    expect(el().querySelectorAll('input, textarea, select')).toHaveLength(0);
    expect(Array.from(el().querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual(['Back']);
  });

  it('says there is no notification on 404, without an error notification', async () => {
    const { harness, el } = await open('/admin/notification');
    answer(harness, { status: 404 });

    expect(text(el().querySelector('[data-slot="not-found"]'))).toBe('There is no notification.');
    expect(box(el())).toBeNull();
    expect(notifications.error).not.toHaveBeenCalled();
  });

  it('shows an alert with Retry on another failure, and Retry asks again', async () => {
    const { harness, el } = await open('/admin/notification');
    answer(harness, { status: 500 });

    const alert = el().querySelector('[role="alert"]')!;
    expect(text(alert)).toContain('The notification could not be loaded.');
    Array.from(alert.querySelectorAll('button')).find((b) => text(b) === 'Retry')!.click();
    harness.detectChanges();
    answer(harness, ANNOUNCEMENT);

    expect(box(el())).not.toBeNull();
  });

  it('returns to the page the user came from', async () => {
    const { harness, el, router } = await open('/admin/holidays', '/admin/notification');
    answer(harness, ANNOUNCEMENT);

    el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/admin/holidays');
  });

  it('goes to the Dashboard when it was opened directly', async () => {
    const { harness, el, router } = await open('/admin/notification');
    answer(harness, ANNOUNCEMENT);

    el().querySelector<HTMLButtonElement>('button[aria-label="Back"]')!.click();
    await settle(harness.fixture);

    expect(router.url).toBe('/');
  });

  it('is routed inside the shell with no menu guard and no menu code, so it opens without menu rights', () => {
    const shell = routes.find((r) => r.path === '' && r.children)!;
    const route = shell.children!.find((r) => r.path === 'admin/notification')!;

    expect(route).toBeDefined();
    expect(route.canActivateChild).toBeUndefined();
    expect(route.canActivate).toBeUndefined();
    expect(route.data).toBeUndefined();
  });
});
