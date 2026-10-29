import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, inject } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

const DURATION_MS = 5000;

/**
 * The one way features give the user feedback. Rendered by the root `hlm-toaster`. A click or tap anywhere on the
 * screen closes the notifications shown, so the user never has to aim for one or wait for it to go.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  constructor() {
    const doc = inject(DOCUMENT);
    // Pointer down, in the capture phase: it comes before the click it starts, so a click that shows a new notification
    // closes the old ones first and keeps the new one.
    const close = () => toast.dismiss();
    doc.addEventListener('pointerdown', close, { capture: true });
    inject(DestroyRef).onDestroy(() => doc.removeEventListener('pointerdown', close, { capture: true }));
  }

  success(message: string): void {
    toast.success(message, { duration: DURATION_MS });
  }

  info(message: string): void {
    toast.info(message, { duration: DURATION_MS });
  }

  warn(message: string): void {
    toast.warning(message, { duration: DURATION_MS });
  }

  error(message: string): void {
    toast.error(message, { duration: DURATION_MS });
  }
}
