/**
 * The latest announcement (`GENINFO`), as `GET /api/admin/notification` returns it, every text exactly as entered:
 * its banner scrolls in the bar above the header, and the Notification screen shows its heading and content. Called an
 * announcement in the code, so it is not mistaken for the toasts of `NotificationService`.
 */
export interface Announcement {
  /** `GENINFO.ID`; the table has no key, so it may be missing. */
  id: number | null;
  /** The text of the bar; null when empty. */
  banner: string | null;
  /** The heading of the Notification screen; null when empty. */
  heading: string | null;
  /** The body of the Notification screen; null when empty. */
  content: string | null;
  /** When it was entered (ISO 8601, without a time zone). */
  createdDate: string | null;
}

/** The endpoint, relative to the API base URL. */
export const ANNOUNCEMENT_URL = 'admin/notification';

/** The Notification screen the bar opens. */
export const ANNOUNCEMENT_ROUTE = '/admin/notification';

/** Whether a text has anything but spaces and line breaks. */
const hasText = (text: string | null | undefined): text is string => !!text && text.trim() !== '';

/** The bar's text: the banner exactly as entered, or the heading when there is no banner (decided by the user). */
export function bannerText(announcement: Announcement): string | null {
  return hasText(announcement.banner) ? announcement.banner : hasText(announcement.heading) ? announcement.heading : null;
}

/** The Notification screen's heading: the heading exactly as entered, or the banner when there is no heading. */
export function headingText(announcement: Announcement): string | null {
  return hasText(announcement.heading) ? announcement.heading : hasText(announcement.banner) ? announcement.banner : null;
}
