import type { Kurse, Kursleiter, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KurseDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kurse;
  /** N:1-Ziel „Kursleiter": volle Liste (Hook-Array) — der Block löst Name + Schlüsselfelder selbst auf. */
  kursleiterList: Kursleiter[];
  /** Klick auf die Kursleiter-Relation → overlay.push auf dessen Detail. */
  onOpenKursleiter?: (record: Kursleiter) => void;
  /** 1:N „Anmeldungen" (kurs): VOLLE Liste — der Block filtert auf diesen Record. */
  anmeldungenList: Anmeldungen[];
  /** Zeilen-Klick → overlay.push auf das Anmeldungen-Detail (nie der Edit-Dialog). */
  onOpenAnmeldungen: (record: Anmeldungen) => void;
  /** Kontextuelles „+": öffnet den Anmeldungen-Dialog mit diesem Record vorgesetzt. */
  onAddAnmeldungen: () => void;
}

export function KurseDetails({
  record,
  kursleiterList,
  onOpenKursleiter,
  anmeldungenList,
  onOpenAnmeldungen,
  onAddAnmeldungen,
}: KurseDetailsProps) {
  const kursleiterTarget = kursleiterList.find(r => r.record_id === extractRecordId(record.fields.kursleiter));
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kurse', 'beschreibung')} value={record.fields.beschreibung} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kurse', 'yogastil')} value={record.fields.yogastil} format="pill" />
        <RecordField label={fieldLabel('kurse', 'niveau')} value={record.fields.niveau} format="pill" />
        <RecordField label={fieldLabel('kurse', 'titel')} value={record.fields.titel} format="text" />
        <RecordField label={fieldLabel('kurse', 'startzeit')} value={record.fields.startzeit} format="datetime" />
        <RecordField label={fieldLabel('kurse', 'dauer_minuten')} value={record.fields.dauer_minuten} format="text" />
        <RecordField label={fieldLabel('kurse', 'ort')} value={record.fields.ort} format="text" />
        <RecordField label={fieldLabel('kurse', 'max_teilnehmer')} value={record.fields.max_teilnehmer} format="text" />
        <RecordField label={fieldLabel('kurse', 'preis')} value={record.fields.preis} format="text" />
        <RecordField label={fieldLabel('kurse', 'kursstatus')} value={record.fields.kursstatus} format="pill" />
      </RecordSection>

      {/* N:1 — verknüpfte Records: IMMER klickbar, nie eine Text-Sackgasse. */}
      <RecordSection title={t('relations')} cols={1}>
        <RecordRelation
          label={fieldLabel('kurse', 'kursleiter')}
          name={kursleiterTarget?.fields.kursleiter_firstname ?? '—'}
          meta={[kursleiterTarget?.fields.email, kursleiterTarget?.fields.telefon].filter(Boolean).join(' · ') || undefined}
          onClick={kursleiterTarget && onOpenKursleiter ? () => onOpenKursleiter!(kursleiterTarget!) : undefined}
        />
      </RecordSection>

      <SatelliteSection
        title={appLabel('anmeldungen')}
        items={anmeldungenList.filter(r => extractRecordId(r.fields.kurs) === record.record_id)}
        map={r => ({ name: r.fields.teilnehmer_firstname ?? appLabel('anmeldungen'), meta: r.fields.anmeldedatum })}
        onOpen={onOpenAnmeldungen}
        onAdd={onAddAnmeldungen}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSE} recordId={record.record_id} />
    </>
  );
}
