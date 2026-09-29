import { lookupLabel } from '@/i18n';

// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Kursleiter {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kursleiter_firstname?: string;
    kursleiter_lastname?: string;
    email?: string;
    telefon?: string;
    foto?: string;
    spezialisierungen?: LookupValue[];
    kurzbiografie?: string;
    status?: LookupValue;
  };
}

export interface Kurse {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    beschreibung?: string;
    yogastil?: LookupValue;
    niveau?: LookupValue;
    kursleiter?: RecordUrl; // applookup -> URL zu 'Kursleiter' Record
    titel?: string;
    startzeit?: string; // Format: YYYY-MM-DD oder ISO String
    dauer_minuten?: number;
    ort?: string;
    max_teilnehmer?: number;
    preis?: number;
    kursstatus?: LookupValue;
  };
}

export interface Anmeldungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kurs?: RecordUrl; // applookup -> URL zu 'Kurse' Record
    teilnehmer_firstname?: string;
    teilnehmer_lastname?: string;
    email?: string;
    telefon?: string;
    erfahrung?: LookupValue;
    gesundheitshinweise?: string;
    bemerkungen?: string;
    teilnahmebedingungen?: boolean;
    anmeldedatum?: string; // Format: YYYY-MM-DD oder ISO String
    anmeldestatus?: LookupValue;
  };
}

export const APP_IDS = {
  KURSLEITER: '6abbe2a74db327cbc4026835',
  KURSE: '6abbe2ac11f65b0219c378b9',
  ANMELDUNGEN: '6abbe2ad88e84aeab4362c8b',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {
  'kursleiter': {
    spezialisierungen: [{ key: "hatha", get label() { return lookupLabel('kursleiter', 'spezialisierungen', "hatha") ?? "Hatha Yoga"; } }, { key: "vinyasa", get label() { return lookupLabel('kursleiter', 'spezialisierungen', "vinyasa") ?? "Vinyasa Yoga"; } }, { key: "ashtanga", get label() { return lookupLabel('kursleiter', 'spezialisierungen', "ashtanga") ?? "Ashtanga Yoga"; } }, { key: "yin", get label() { return lookupLabel('kursleiter', 'spezialisierungen', "yin") ?? "Yin Yoga"; } }, { key: "kundalini", get label() { return lookupLabel('kursleiter', 'spezialisierungen', "kundalini") ?? "Kundalini Yoga"; } }, { key: "pilates", get label() { return lookupLabel('kursleiter', 'spezialisierungen', "pilates") ?? "Pilates"; } }, { key: "meditation", get label() { return lookupLabel('kursleiter', 'spezialisierungen', "meditation") ?? "Meditation"; } }],
    status: [{ key: "aktiv", get label() { return lookupLabel('kursleiter', 'status', "aktiv") ?? "Aktiv"; } }, { key: "inaktiv", get label() { return lookupLabel('kursleiter', 'status', "inaktiv") ?? "Inaktiv"; } }],
  },
  'kurse': {
    yogastil: [{ key: "hatha", get label() { return lookupLabel('kurse', 'yogastil', "hatha") ?? "Hatha Yoga"; } }, { key: "vinyasa", get label() { return lookupLabel('kurse', 'yogastil', "vinyasa") ?? "Vinyasa Yoga"; } }, { key: "ashtanga", get label() { return lookupLabel('kurse', 'yogastil', "ashtanga") ?? "Ashtanga Yoga"; } }, { key: "yin", get label() { return lookupLabel('kurse', 'yogastil', "yin") ?? "Yin Yoga"; } }, { key: "kundalini", get label() { return lookupLabel('kurse', 'yogastil', "kundalini") ?? "Kundalini Yoga"; } }, { key: "pilates", get label() { return lookupLabel('kurse', 'yogastil', "pilates") ?? "Pilates"; } }, { key: "meditation", get label() { return lookupLabel('kurse', 'yogastil', "meditation") ?? "Meditation"; } }],
    niveau: [{ key: "anfaenger", get label() { return lookupLabel('kurse', 'niveau', "anfaenger") ?? "Anfänger"; } }, { key: "fortgeschritten", get label() { return lookupLabel('kurse', 'niveau', "fortgeschritten") ?? "Fortgeschrittene"; } }, { key: "alle", get label() { return lookupLabel('kurse', 'niveau', "alle") ?? "Alle Niveaus"; } }],
    kursstatus: [{ key: "geplant", get label() { return lookupLabel('kurse', 'kursstatus', "geplant") ?? "Geplant"; } }, { key: "offen", get label() { return lookupLabel('kurse', 'kursstatus', "offen") ?? "Anmeldung offen"; } }, { key: "ausgebucht", get label() { return lookupLabel('kurse', 'kursstatus', "ausgebucht") ?? "Ausgebucht"; } }, { key: "abgesagt", get label() { return lookupLabel('kurse', 'kursstatus', "abgesagt") ?? "Abgesagt"; } }],
  },
  'anmeldungen': {
    erfahrung: [{ key: "keine", get label() { return lookupLabel('anmeldungen', 'erfahrung', "keine") ?? "Keine Erfahrung"; } }, { key: "wenig", get label() { return lookupLabel('anmeldungen', 'erfahrung', "wenig") ?? "Wenig Erfahrung"; } }, { key: "erfahren", get label() { return lookupLabel('anmeldungen', 'erfahrung', "erfahren") ?? "Erfahren"; } }],
    anmeldestatus: [{ key: "angemeldet", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "angemeldet") ?? "Angemeldet"; } }, { key: "warteliste", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "warteliste") ?? "Warteliste"; } }, { key: "storniert", get label() { return lookupLabel('anmeldungen', 'anmeldestatus', "storniert") ?? "Storniert"; } }],
  },
};

// Optimistic LookupValue writes: never re-type a label — resolve the schema
// option instead (its label is a locale-aware getter; falls back to the key).
// WRONG: status: { key: 'offen', label: 'Offen' }   (frozen in one language)
// RIGHT: status: lookupOption('<appKey>', 'status', 'offen')
export function lookupOption(app: string, field: string, key: string): LookupValue {
  return LOOKUP_OPTIONS[app]?.[field]?.find(o => o.key === key) ?? { key, label: key };
}

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'kursleiter': {
    'kursleiter_firstname': 'string/text',
    'kursleiter_lastname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'foto': 'file',
    'spezialisierungen': 'multiplelookup/checkbox',
    'kurzbiografie': 'string/textarea',
    'status': 'lookup/radio',
  },
  'kurse': {
    'beschreibung': 'string/textarea',
    'yogastil': 'lookup/select',
    'niveau': 'lookup/radio',
    'kursleiter': 'applookup/select',
    'titel': 'string/text',
    'startzeit': 'date/datetimeminute',
    'dauer_minuten': 'number',
    'ort': 'string/text',
    'max_teilnehmer': 'number',
    'preis': 'number',
    'kursstatus': 'lookup/select',
  },
  'anmeldungen': {
    'kurs': 'applookup/select',
    'teilnehmer_firstname': 'string/text',
    'teilnehmer_lastname': 'string/text',
    'email': 'string/email',
    'telefon': 'string/tel',
    'erfahrung': 'lookup/radio',
    'gesundheitshinweise': 'string/textarea',
    'bemerkungen': 'string/textarea',
    'teilnahmebedingungen': 'bool',
    'anmeldedatum': 'date/date',
    'anmeldestatus': 'lookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateKursleiter = StripLookup<Kursleiter['fields']>;
export type CreateKurse = StripLookup<Kurse['fields']>;
export type CreateAnmeldungen = StripLookup<Anmeldungen['fields']>;