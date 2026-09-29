import type { Anmeldungen, Kurse } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';

export interface AnmeldungenDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Anmeldungen;
  /** N:1-Ziel „Kurse": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kurseList: Kurse[];
  /** Klick auf die Kurse-Relation → overlay.push auf dessen Detail. */
  onOpenKurse?: (record: Kurse) => void;
}

export function AnmeldungenDetails({
  record,
  kurseList,
  onOpenKurse,
}: AnmeldungenDetailsProps) {
  const kursTarget = kurseList.find(r => r.record_id === extractRecordId(record.fields.kurs));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('anmeldungen', 'teilnehmer_firstname')} value={record.fields.teilnehmer_firstname} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'teilnehmer_lastname')} value={record.fields.teilnehmer_lastname} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('anmeldungen', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('anmeldungen', 'erfahrung')} value={record.fields.erfahrung} format="pill" />
        <RecordField label={fieldLabel('anmeldungen', 'gesundheitshinweise')} value={record.fields.gesundheitshinweise} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('anmeldungen', 'bemerkungen')} value={record.fields.bemerkungen} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('anmeldungen', 'teilnahmebedingungen')} value={record.fields.teilnahmebedingungen} format="bool" />
        <RecordField label={fieldLabel('anmeldungen', 'anmeldedatum')} value={record.fields.anmeldedatum} format="date" />
        <RecordField label={fieldLabel('anmeldungen', 'anmeldestatus')} value={record.fields.anmeldestatus} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('anmeldungen', 'kurs')}
          name={kursTarget?.fields.titel ?? '—'}
          meta={[kursTarget?.fields.ort].filter(Boolean).join(' · ') || undefined}
          onClick={kursTarget && onOpenKurse ? () => onOpenKurse!(kursTarget!) : undefined}
        />
      </RecordSection>

      <RecordAttachments appId={APP_IDS.ANMELDUNGEN} recordId={record.record_id} />
    </>
  );
}
