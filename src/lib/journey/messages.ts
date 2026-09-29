/**
 * Required-field messages — WRITTEN BY THE BUILD AGENT, never by a heuristic.
 *
 * The layer knows two things about an empty required field: that it is
 * required and what its label is. Out of that it can only say „„Anreise" ist
 * ein Pflichtfeld". What the person should do instead („Bitte einen Gast
 * auswählen.") is meaning, and meaning is the agent's: the Phase-2 orchestrator
 * writes one short instruction per required field — what is needed, not why — to
 * `.intents-staging/messages.json`, the integration step validates it against
 * the app metadata and renders it into the block below. Scaffold updates keep
 * the block. Do not edit outside the markers.
 *
 * Every door reads this and nothing else: `useStepForm` (flows and public
 * pages), the generated {Entity}Dialog and the public form's server-error line.
 * A field without a sentence falls back to the label sentence — never to a
 * bare „Dieses Feld ist erforderlich".
 *
 * Required fields per entity (from the base view):
 *   - kursleiter: kursleiter_firstname (Vorname), kursleiter_lastname (Nachname), email (E-Mail), status (Status)
 *   - kurse: yogastil (Yoga-Stil), niveau (Niveau), kursleiter (Kursleiter), titel (Kurstitel), startzeit (Beginn), dauer_minuten (Dauer in Minuten), max_teilnehmer (Maximale Teilnehmerzahl), kursstatus (Kursstatus)
 *   - anmeldungen: kurs (Kurs), teilnehmer_firstname (Vorname), teilnehmer_lastname (Nachname), email (E-Mail), teilnahmebedingungen (Ich akzeptiere die Teilnahmebedingungen), anmeldedatum (Anmeldedatum)
 */
import { t, tx } from '@/i18n';
import { labelOf, type EntityKey } from './rules';

/** The writable fields of each entity — the keys a message may address (generated). */
export interface MessageFields {
  "kursleiter": "kursleiter_firstname" | "kursleiter_lastname" | "email" | "telefon" | "spezialisierungen" | "kurzbiografie" | "status";
  "kurse": "beschreibung" | "yogastil" | "niveau" | "kursleiter" | "titel" | "startzeit" | "dauer_minuten" | "ort" | "max_teilnehmer" | "preis" | "kursstatus";
  "anmeldungen": "kurs" | "teilnehmer_firstname" | "teilnehmer_lastname" | "email" | "telefon" | "erfahrung" | "gesundheitshinweise" | "bemerkungen" | "teilnahmebedingungen" | "anmeldedatum" | "anmeldestatus";
}
export type MessageFieldKey<E extends EntityKey> = E extends keyof MessageFields ? MessageFields[E] : never;

export const REQUIRED_MESSAGES: { [E in EntityKey]?: Partial<Record<MessageFieldKey<E>, string>> } = {
  // <custom:messages>
  kursleiter: { kursleiter_firstname: "Bitte den Vornamen eingeben.", kursleiter_lastname: "Bitte den Nachnamen eingeben.", email: "Bitte eine gültige E-Mail-Adresse eingeben.", status: "Bitte einen Status auswählen." },
  kurse: { yogastil: "Bitte einen Yoga-Stil auswählen.", niveau: "Bitte das Niveau auswählen.", kursleiter: "Bitte einen Kursleiter auswählen.", titel: "Bitte einen Kurstitel eingeben.", startzeit: "Bitte Datum und Uhrzeit des Kurses angeben.", dauer_minuten: "Bitte die Dauer in Minuten eingeben.", max_teilnehmer: "Bitte die maximale Teilnehmerzahl angeben.", kursstatus: "Bitte einen Status auswählen." },
  anmeldungen: { kurs: "Bitte einen Kurs auswählen.", teilnehmer_firstname: "Bitte den Vornamen eingeben.", teilnehmer_lastname: "Bitte den Nachnamen eingeben.", email: "Bitte eine gültige E-Mail-Adresse eingeben.", teilnahmebedingungen: "Bitte die Teilnahmebedingungen bestätigen.", anmeldedatum: "Bitte das Anmeldedatum angeben." },
  // </custom:messages>
};

/** The sentence shown when `key` of `entity` is required and empty — the
 *  agent's own text (translated at runtime like every page string), else the
 *  label sentence. Call it while rendering, not at module scope. */
export function requiredMessage(entity: EntityKey, key: string): string {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  if (own && own.trim()) return tx(own);
  return t('v_required', { label: labelOf(entity, key) });
}

/** True when the agent wrote a sentence for the field. */
export function hasOwnMessage(entity: EntityKey, key: string): boolean {
  const own = (REQUIRED_MESSAGES as Record<string, Record<string, string | undefined> | undefined>)[entity]?.[key];
  return Boolean(own && own.trim());
}
