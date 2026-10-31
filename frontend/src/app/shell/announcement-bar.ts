import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ANNOUNCEMENT_ROUTE } from '../core/announcement/announcement.model';

/** What a line break of the banner becomes in the one-line bar: a wide gap (decided by the user). */
export const LINE_BREAK_GAP = '\u2003\u2003\u2003';

/**
 * What the bar adds after the banner (the user's request): part of the bar only, never of the text entered in GENINFO
 * or of the Notification screen.
 */
export const MORE_DETAILS_TEXT = 'Click here for more Details';

/**
 * The scrolling notification bar above the header, after the ICEGATE "latest news" ticker
 * (`kb/ui-templates/admin/scrolling-notify-bar1.JPG`, admin-notify-bar design D4): white with the latest
 * announcement's banner in ICEGATE's navy in the light theme, black with white text in the dark one, with a thin line
 * below it. The text is shown once at a time (decided by the user): it enters at the right end of a text lane inset
 * from both ends of the bar, crosses it from right to left, leaves at its left end and starts again. The banner is
 * shown exactly as entered: its spaces are kept, and each line break becomes a wide gap, so the whole text stays on one
 * line. After it, a little apart and underlined, the bar adds "Click here for more Details", moving with it.
 *
 * The whole bar is one link to the Notification screen, so a click anywhere on it, or Enter, opens it. Screen readers
 * get the text from the link's name, not from the moving copy. The text stops while the pointer is over the bar or it
 * has the focus; with reduced motion it stands still at the left of the lane, cut with an ellipsis.
 */
@Component({
  selector: 'app-announcement-bar',
  imports: [RouterLink],
  host: { class: 'block', 'data-slot': 'announcement-bar' },
  template: `
    <a
      class="group flex h-9 w-full cursor-pointer items-center border-b bg-announcement px-6 text-base text-announcement-foreground shadow-sm focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-announcement-foreground"
      [routerLink]="route"
      [attr.aria-label]="label()"
    >
      <!-- The text lane: inset from both ends of the bar, and the text shows only inside it. -->
      <span data-slot="announcement-lane" class="block min-w-0 flex-1 overflow-hidden">
        <!-- Its left padding is the lane's width, so the text starts at the lane's right end. -->
        <span
          aria-hidden="true"
          data-slot="announcement-heading"
          class="inline-block animate-announcement whitespace-pre pl-[100%] group-hover:[animation-play-state:paused] group-focus-visible:[animation-play-state:paused] motion-reduce:max-w-full motion-reduce:animate-none motion-reduce:overflow-hidden motion-reduce:text-ellipsis motion-reduce:pl-0"
          [style.--announcement-duration]="duration()"
          ><span data-slot="announcement-text">{{ shown() }}</span
          ><span data-slot="announcement-more" class="ms-10 text-sm underline underline-offset-2">{{ moreText }}</span></span
        >
      </span>
    </a>
  `,
})
export class AnnouncementBar {
  /** The banner (or, without one, the heading) exactly as entered. */
  readonly text = input.required<string>();

  protected readonly route = ANNOUNCEMENT_ROUTE;
  protected readonly moreText = MORE_DETAILS_TEXT;
  /** The text on one line: every line break (CR LF, LF or CR) becomes a wide gap; spaces are kept as they are. */
  protected readonly shown = computed(() => this.text().replace(/\r\n|\n|\r/g, LINE_BREAK_GAP));
  protected readonly label = computed(
    () => `Notification: ${this.text().replace(/\s+/g, ' ').trim()}. Open the notification`,
  );
  /**
   * How long one pass takes: the lane's width plus the text's, so a longer text gets more time and moves at about the
   * same speed as a short one.
   */
  protected readonly duration = computed(
    () => `${Math.round(15 + (this.shown().length + MORE_DETAILS_TEXT.length) * 0.12)}s`,
  );
}
