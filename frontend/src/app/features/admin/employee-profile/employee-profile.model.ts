/** One address of the profile. State and country arrive as names, never as ids. */
export interface ProfileAddress {
  address1: string | null;
  address2: string | null;
  address3: string | null;
  city: string | null;
  state: string | null;
  pin: string | null;
  poBox: string | null;
  country: string | null;
}

/**
 * The logged-in user's own employee profile as returned by `GET /api/admin/profile`. An empty value arrives as
 * `null`; `dateOfBirth` is a date without time (`yyyy-MM-dd`).
 */
export interface EmployeeProfile {
  code: string | null;
  name: string | null;
  fatherName: string | null;
  spouseName: string | null;
  maritalStatus: string | null;
  dateOfBirth: string | null;
  bank: { accountNo: string | null; name: string | null; branch: string | null; ifsc: string | null };
  currentAddress: ProfileAddress;
  permanentAddress: ProfileAddress;
  mobile: string | null;
  email: string | null;
  ids: { aadhaar: string | null; pan: string | null; pf: string | null; esi: string | null; uan: string | null };
  /** True when the photo can be fetched from `GET /api/admin/profile/photo`. */
  hasPhoto: boolean;
}

/** What a field without a value shows. */
export const EMPTY_VALUE = '—';

/** One labelled value in a box of the profile. */
export interface ProfileField {
  label: string;
  value: string;
}

/** A titled group of fields inside a box, such as the Current side of the Address box. */
export interface ProfilePart {
  title: string;
  fields: ProfileField[];
}

/**
 * One box of the profile: a heading (empty for the first box, which has none) and its fields, in screen order. The
 * Address box has no fields of its own but two parts, Current and Permanent.
 */
export interface ProfileSection {
  title: string;
  fields: ProfileField[];
  parts?: ProfilePart[];
}

/** A `yyyy-MM-dd` date as `dd-MM-yyyy`. Split as text, not parsed into a `Date`, so no time zone can shift the day. */
export function formatDate(date: string | null): string | null {
  const match = date ? /^(\d{4})-(\d{2})-(\d{2})/.exec(date) : null;
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

/** The first letters of the first and last words of the name, upper-case ("Asha Nair" → "AN"); "?" without a name. */
export function initialsOf(name: string | null): string {
  const words = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return '?';
  }
  const first = words[0].charAt(0);
  const last = words.length > 1 ? words[words.length - 1].charAt(0) : '';
  return (first + last).toUpperCase();
}

function field(label: string, value: string | null): ProfileField {
  return { label, value: value?.trim() ? value : EMPTY_VALUE };
}

/**
 * Address 1, 2, 3 and "P.O. <value>", one per line, with empty ones left out; "—" when all four are empty. Shown under
 * one Address label.
 */
export function addressLines(address: ProfileAddress): string {
  const lines = [address.address1, address.address2, address.address3]
    .map((line) => line?.trim() ?? '')
    .filter(Boolean);
  const poBox = address.poBox?.trim();
  if (poBox) {
    lines.push(`P.O. ${poBox}`);
  }
  return lines.length > 0 ? lines.join('\n') : EMPTY_VALUE;
}

function addressFields(address: ProfileAddress): ProfileField[] {
  return [
    { label: 'Address', value: addressLines(address) },
    field('City', address.city),
    field('State', address.state),
    field('PIN Code', address.pin),
    field('Country', address.country),
  ];
}

/**
 * The five boxes of the profile with every field of the BRS data model, in the order they are stacked in: the basic box,
 * Address, Contact Details, Bank Details, ID and Documents. In rows each box is placed explicitly (see the page). The first box has no heading: the name is its
 * title (so it is not a field), shown beside the avatar above the basic rows. The Address box holds the Current and
 * Permanent parts.
 */
export function profileSections(profile: EmployeeProfile): ProfileSection[] {
  return [
    {
      title: '',
      fields: [
        field('Employee Code', profile.code),
        field("Father's Name", profile.fatherName),
        field('Spouse Name', profile.spouseName),
        field('Marital Status', profile.maritalStatus),
        field('Date of Birth', formatDate(profile.dateOfBirth)),
      ],
    },
    {
      title: 'Address',
      fields: [],
      parts: [
        { title: 'Current', fields: addressFields(profile.currentAddress) },
        { title: 'Permanent', fields: addressFields(profile.permanentAddress) },
      ],
    },
    // The email is shown in lower case (the stored value is often upper case).
    { title: 'Contact Details', fields: [field('Mobile', profile.mobile), field('Email', profile.email?.toLowerCase() ?? null)] },
    {
      title: 'Bank Details',
      fields: [
        field('Bank A/C No', profile.bank.accountNo),
        field('Bank Name', profile.bank.name),
        field('Branch', profile.bank.branch),
        field('IFSC Code', profile.bank.ifsc),
      ],
    },
    {
      title: 'ID and Documents',
      fields: [
        field('Aadhaar', profile.ids.aadhaar),
        field('PAN', profile.ids.pan),
        field('PF', profile.ids.pf),
        field('ESI No', profile.ids.esi),
        field('UAN', profile.ids.uan),
      ],
    },
  ];
}
