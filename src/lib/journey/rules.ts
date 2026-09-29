/**
 * Field rules — GENERATED from the app metadata. Do not edit.
 *
 * The mechanical truth about every field: what kind it is, whether the
 * platform's base view marks it required, which lookup keys exist, where an
 * applookup points, what the label is. `useStepForm` validates against these
 * rules and phrases its messages with the real labels; `toWirePayload` uses
 * them to shape the create payload; `SHAPES` tells a page which input FORM
 * fits the data (a date pair wants a calendar, not two fields) — it is a
 * signal, not a gate.
 */
import { appLabel, fieldLabel, lookupLabel } from '@/i18n';
import { policyLabel } from './policy';
import { LOOKUP_OPTIONS } from '@/types/app';

export type EntityKey = 'kursleiter' | 'kurse' | 'anmeldungen';

/** The text fields of each entity — what a search may run over (generated;
 *  `never` for an entity without text of its own, e.g. a link table). */
export interface StringFields {
  "kursleiter": "kursleiter_firstname" | "kursleiter_lastname" | "email" | "telefon" | "kurzbiografie";
  "kurse": "beschreibung" | "titel" | "ort";
  "anmeldungen": "teilnehmer_firstname" | "teilnehmer_lastname" | "email" | "telefon" | "gesundheitshinweise" | "bemerkungen";
}
export type StringFieldKey<E extends EntityKey> = E extends keyof StringFields ? StringFields[E] : never;

/** The applookup fields of each entity (generated). A pick stored through
 *  `form.set` on one of these must carry its display name — at compile time
 *  (`StepForm.set`), because the review would otherwise show the id. */
export interface RecordFields {
  "kursleiter": never;
  "kurse": "kursleiter";
  "anmeldungen": "kurs";
}
export type RecordFieldKey<E extends EntityKey> = E extends keyof RecordFields ? RecordFields[E] : never;

export type FieldKind =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'url'
  | 'number'
  | 'bool'
  | 'date'
  | 'datetime'
  | 'lookup'
  | 'multilookup'
  | 'record'
  | 'multirecord'
  | 'file'
  | 'geo';

export interface FieldRule {
  key: string;
  fulltype: string;
  kind: FieldKind;
  /** From the app's base view. A public page may override this per field. */
  required: boolean;
  /** Build-time label — `labelOf()` prefers the runtime i18n bundle. */
  label: string;
  /** Whether a journey may write it (`file` is upload-only, never via a journey). */
  writable: boolean;
  maxLength?: number;
  /** lookup / multilookup: the ONLY valid write values. */
  options?: string[];
  /** record / multirecord: the target app (always) and its entity key (when inside this appgroup). */
  targetAppId?: string;
  targetEntity?: EntityKey;
  format?: 'currency';
  /** HTML autocomplete token derived from the field name (given-name, email, tel, …). */
  autoComplete?: string;
}

export interface EntityInfo {
  key: EntityKey;
  appId: string;
  label: string;
  /** PascalCase plural — `get<pascal>()` on the service. */
  pascal: string;
  /** The single-record suffix — `create<single>()` on the service. */
  single: string;
}

/** Input-form signals per entity: which data shape each field (pair) has.
 *  `range`  — two date fields that form a stay/period → AvailabilityRangePicker
 *  `choice` — a lookup with few options → ChoiceGroup pills instead of a select
 *  `record` — an applookup → EntitySelectStep with search, never a raw id field
 *  `stock`  — a quantity that has a stock/capacity counterpart → show it, warn on overshoot */
export type Shape =
  | { kind: 'range'; from: string; to: string }
  | { kind: 'choice'; field: string; count: number }
  | { kind: 'record'; field: string; targetEntity?: EntityKey }
  | { kind: 'stock'; field: string };

export const ENTITIES: Record<EntityKey, EntityInfo> = {
  "kursleiter": {
    "key": "kursleiter",
    "appId": "6abbe2a74db327cbc4026835",
    "label": "Kursleiter",
    "pascal": "Kursleiter",
    "single": "KursleiterEntry"
  },
  "kurse": {
    "key": "kurse",
    "appId": "6abbe2ac11f65b0219c378b9",
    "label": "Kurse",
    "pascal": "Kurse",
    "single": "KurseEntry"
  },
  "anmeldungen": {
    "key": "anmeldungen",
    "appId": "6abbe2ad88e84aeab4362c8b",
    "label": "Anmeldungen",
    "pascal": "Anmeldungen",
    "single": "AnmeldungenEntry"
  }
};

export const FIELD_RULES: Record<EntityKey, Record<string, FieldRule>> = {
  "kursleiter": {
    "kursleiter_firstname": {
      "key": "kursleiter_firstname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "kursleiter_lastname": {
      "key": "kursleiter_lastname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "foto": {
      "key": "foto",
      "fulltype": "file",
      "kind": "file",
      "required": false,
      "label": "Foto",
      "writable": false
    },
    "spezialisierungen": {
      "key": "spezialisierungen",
      "fulltype": "multiplelookup/checkbox",
      "kind": "multilookup",
      "required": false,
      "label": "Spezialisierungen",
      "writable": true,
      "options": [
        "hatha",
        "vinyasa",
        "ashtanga",
        "yin",
        "kundalini",
        "pilates",
        "meditation"
      ]
    },
    "kurzbiografie": {
      "key": "kurzbiografie",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Kurzbiografie",
      "writable": true
    },
    "status": {
      "key": "status",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Status",
      "writable": true,
      "options": [
        "aktiv",
        "inaktiv"
      ]
    }
  },
  "kurse": {
    "beschreibung": {
      "key": "beschreibung",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Beschreibung",
      "writable": true
    },
    "yogastil": {
      "key": "yogastil",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Yoga-Stil",
      "writable": true,
      "options": [
        "hatha",
        "vinyasa",
        "ashtanga",
        "yin",
        "kundalini",
        "pilates",
        "meditation"
      ]
    },
    "niveau": {
      "key": "niveau",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": true,
      "label": "Niveau",
      "writable": true,
      "options": [
        "anfaenger",
        "fortgeschritten",
        "alle"
      ]
    },
    "kursleiter": {
      "key": "kursleiter",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Kursleiter",
      "writable": true,
      "targetAppId": "6abbe2a74db327cbc4026835",
      "targetEntity": "kursleiter"
    },
    "titel": {
      "key": "titel",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Kurstitel",
      "writable": true,
      "maxLength": 4000
    },
    "startzeit": {
      "key": "startzeit",
      "fulltype": "date/datetimeminute",
      "kind": "datetime",
      "required": true,
      "label": "Beginn",
      "writable": true
    },
    "dauer_minuten": {
      "key": "dauer_minuten",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Dauer in Minuten",
      "writable": true
    },
    "ort": {
      "key": "ort",
      "fulltype": "string/text",
      "kind": "text",
      "required": false,
      "label": "Ort oder Raum",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "address-level2"
    },
    "max_teilnehmer": {
      "key": "max_teilnehmer",
      "fulltype": "number",
      "kind": "number",
      "required": true,
      "label": "Maximale Teilnehmerzahl",
      "writable": true
    },
    "preis": {
      "key": "preis",
      "fulltype": "number",
      "kind": "number",
      "required": false,
      "label": "Preis in Euro",
      "writable": true,
      "format": "currency"
    },
    "kursstatus": {
      "key": "kursstatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": true,
      "label": "Kursstatus",
      "writable": true,
      "options": [
        "geplant",
        "offen",
        "ausgebucht",
        "abgesagt"
      ]
    }
  },
  "anmeldungen": {
    "kurs": {
      "key": "kurs",
      "fulltype": "applookup/select",
      "kind": "record",
      "required": true,
      "label": "Kurs",
      "writable": true,
      "targetAppId": "6abbe2ac11f65b0219c378b9",
      "targetEntity": "kurse"
    },
    "teilnehmer_firstname": {
      "key": "teilnehmer_firstname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Vorname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "given-name"
    },
    "teilnehmer_lastname": {
      "key": "teilnehmer_lastname",
      "fulltype": "string/text",
      "kind": "text",
      "required": true,
      "label": "Nachname",
      "writable": true,
      "maxLength": 4000,
      "autoComplete": "family-name"
    },
    "email": {
      "key": "email",
      "fulltype": "string/email",
      "kind": "email",
      "required": true,
      "label": "E-Mail",
      "writable": true,
      "autoComplete": "email"
    },
    "telefon": {
      "key": "telefon",
      "fulltype": "string/tel",
      "kind": "tel",
      "required": false,
      "label": "Telefon",
      "writable": true,
      "autoComplete": "tel"
    },
    "erfahrung": {
      "key": "erfahrung",
      "fulltype": "lookup/radio",
      "kind": "lookup",
      "required": false,
      "label": "Yoga-Erfahrung",
      "writable": true,
      "options": [
        "keine",
        "wenig",
        "erfahren"
      ]
    },
    "gesundheitshinweise": {
      "key": "gesundheitshinweise",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Gesundheitliche Hinweise",
      "writable": true
    },
    "bemerkungen": {
      "key": "bemerkungen",
      "fulltype": "string/textarea",
      "kind": "textarea",
      "required": false,
      "label": "Bemerkungen",
      "writable": true
    },
    "teilnahmebedingungen": {
      "key": "teilnahmebedingungen",
      "fulltype": "bool",
      "kind": "bool",
      "required": true,
      "label": "Ich akzeptiere die Teilnahmebedingungen",
      "writable": true
    },
    "anmeldedatum": {
      "key": "anmeldedatum",
      "fulltype": "date/date",
      "kind": "date",
      "required": true,
      "label": "Anmeldedatum",
      "writable": true
    },
    "anmeldestatus": {
      "key": "anmeldestatus",
      "fulltype": "lookup/select",
      "kind": "lookup",
      "required": false,
      "label": "Anmeldestatus",
      "writable": true,
      "options": [
        "angemeldet",
        "warteliste",
        "storniert"
      ]
    }
  }
};

export const SHAPES: Record<EntityKey, Shape[]> = {
  "kursleiter": [
    {
      "kind": "choice",
      "field": "status",
      "count": 2
    }
  ],
  "kurse": [
    {
      "kind": "choice",
      "field": "niveau",
      "count": 3
    },
    {
      "kind": "choice",
      "field": "kursstatus",
      "count": 4
    },
    {
      "kind": "record",
      "field": "kursleiter",
      "targetEntity": "kursleiter"
    }
  ],
  "anmeldungen": [
    {
      "kind": "choice",
      "field": "erfahrung",
      "count": 3
    },
    {
      "kind": "choice",
      "field": "anmeldestatus",
      "count": 3
    },
    {
      "kind": "record",
      "field": "kurs",
      "targetEntity": "kurse"
    }
  ]
};

/** The fields a record of this entity is recognised by (a person: first and
 *  last name; else its title-like text field) — the same choice the dashboard's
 *  enrichment makes for `<key>Name`. `useRecordSearch` resolves an applookup to
 *  this name (`ctx.ref('gast')` in `toItem`). */
export const DISPLAY_FIELDS: Record<EntityKey, string[]> = {
  "kursleiter": [
    "kursleiter_firstname"
  ],
  "kurse": [
    "titel"
  ],
  "anmeldungen": [
    "teilnehmer_firstname"
  ]
};

/** The display name of a record: its display fields joined, else the first
 *  non-empty text value, else ''. */
/** A display-field value as text: strings as they are, a lookup `{ key, label }`
 *  (either door hydrates lookups to objects) by its label — an entity whose
 *  only title-like field is a lookup/select otherwise had no name at all. */
function displayPart(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object' && 'label' in v) {
    const l = (v as { label?: unknown }).label;
    return l === null || l === undefined ? '' : String(l).trim();
  }
  return '';
}

export function displayNameOf(entity: EntityKey, fields: Record<string, unknown>): string {
  const parts = (DISPLAY_FIELDS[entity] ?? [])
    .map(k => displayPart(fields[k]))
    .filter(v => v !== '');
  if (parts.length > 0) return parts.join(' ');
  for (const [k, rule] of Object.entries(FIELD_RULES[entity] ?? {})) {
    if (rule.kind !== 'text' && rule.kind !== 'email') continue;
    const v = fields[k];
    if (typeof v === 'string' && v.trim() !== '') return v.trim();
  }
  return '';
}

export function ruleOf(entity: EntityKey, key: string): FieldRule | undefined {
  return FIELD_RULES[entity]?.[key];
}

/** The field label as the user sees it — the owner's policy label first (a
 *  public page's "Felder anpassen"), runtime bundle second, generated label last. */
export function labelOf(entity: EntityKey, key: string): string {
  const own = policyLabel(entity, key);
  if (own) return own;
  const fromBundle = fieldLabel(entity, key);
  if (fromBundle !== key) return fromBundle;
  return ruleOf(entity, key)?.label ?? key;
}

export function entityLabel(entity: EntityKey): string {
  const fromBundle = appLabel(entity);
  if (fromBundle !== entity) return fromBundle;
  return ENTITIES[entity]?.label ?? entity;
}

/** Lookup options with runtime labels — the only legitimate source of `{key,label}` pairs. */
export function optionsOf(entity: EntityKey, key: string): Array<{ key: string; label: string }> {
  const generated = (LOOKUP_OPTIONS as Record<string, Record<string, Array<{ key: string; label: string }>>>)[entity]?.[key];
  if (generated && generated.length) return generated.map(o => ({ key: o.key, label: o.label }));
  const keys = ruleOf(entity, key)?.options ?? [];
  return keys.map(k => ({ key: k, label: lookupLabel(entity, key, k) ?? k }));
}

export function isEmptyValue(v: unknown): boolean {
  if (v === undefined || v === null) return true;
  if (typeof v === 'string') return v.trim() === '';
  if (Array.isArray(v)) return v.length === 0;
  if (typeof v === 'object' && 'from' in (v as object) && 'to' in (v as object)) {
    const r = v as { from: unknown; to: unknown };
    return isEmptyValue(r.from) && isEmptyValue(r.to);
  }
  return false;
}
