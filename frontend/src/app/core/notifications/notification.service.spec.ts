import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { vi } from 'vitest';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  afterEach(() => vi.restoreAllMocks());

  function setup() {
    const dismiss = vi.spyOn(toast, 'dismiss');
    const service = TestBed.inject(NotificationService);
    return { service, dismiss };
  }

  it.each([
    ['success', 'success'],
    ['info', 'info'],
    ['warn', 'warning'],
    ['error', 'error'],
  ] as const)('%s shows a %s notification for 5 seconds', (method, kind) => {
    const shown = vi.spyOn(toast, kind);
    const { service } = setup();

    service[method]('Saved.');

    expect(shown).toHaveBeenCalledWith('Saved.', { duration: 5000 });
  });

  it('closes the notifications shown on a click or tap anywhere on the screen', () => {
    const { service, dismiss } = setup();
    service.warn('The requested screen is not available.');
    const somewhere = document.createElement('div');
    document.body.appendChild(somewhere);

    somewhere.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(dismiss).toHaveBeenCalledTimes(1);
    expect(dismiss).toHaveBeenCalledWith();
    somewhere.remove();
  });

  it('closes them before the click goes on, so a notification the click shows stays', () => {
    const { service, dismiss } = setup();
    const shown = vi.spyOn(toast, 'warning');
    const button = document.createElement('button');
    button.addEventListener('click', () => service.warn('Shown by the click.'));
    document.body.appendChild(button);

    button.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    button.click();

    expect(dismiss.mock.invocationCallOrder[0]).toBeLessThan(shown.mock.invocationCallOrder[0]);
    button.remove();
  });

  it('stops listening when the application is destroyed', () => {
    const { dismiss } = setup();

    TestBed.resetTestingModule();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    expect(dismiss).not.toHaveBeenCalled();
  });
});
