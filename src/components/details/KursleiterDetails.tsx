import type { Kursleiter, Kurse } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';
import {
  RecordSection, RecordField, RecordRelation, RecordAttachments,
} from '@/components/widgets/RecordView';
import { t, appLabel, fieldLabel } from '@/i18n';
import { MediaThumbnail } from '@/components/widgets/MediaViewer';
import { SatelliteSection } from '@/components/SatelliteSection';

export interface KursleiterDetailsProps {
  /** Der Record — enriched oder roh; alle Felder werden hier gerendert. */
  record: Kursleiter;
  /** 1:N „Kurse" (kursleiter): VOLLE Liste — der Block filtert auf diesen Record. */
  kurseList: Kurse[];
  /** Zeilen-Klick → overlay.push auf das Kurse-Detail (nie der Edit-Dialog). */
  onOpenKurse: (record: Kurse) => void;
  /** Kontextuelles „+": öffnet den Kurse-Dialog mit diesem Record vorgesetzt. */
  onAddKurse: () => void;
}

export function KursleiterDetails({
  record,
  kurseList,
  onOpenKurse,
  onAddKurse,
}: KursleiterDetailsProps) {
  return (
    <>
      <RecordSection title={t('details')} cols={2}>
        <RecordField label={fieldLabel('kursleiter', 'kursleiter_firstname')} value={record.fields.kursleiter_firstname} format="text" />
        <RecordField label={fieldLabel('kursleiter', 'kursleiter_lastname')} value={record.fields.kursleiter_lastname} format="text" />
        <RecordField label={fieldLabel('kursleiter', 'email')} value={record.fields.email} format="email" />
        <RecordField label={fieldLabel('kursleiter', 'telefon')} value={record.fields.telefon} format="text" />
        <RecordField label={fieldLabel('kursleiter', 'foto')} className="md:col-span-2">
          {record.fields.foto ? (
            <MediaThumbnail src={record.fields.foto as string} fit="contain" className="max-h-64 w-full rounded-lg" />
          ) : '—'}
        </RecordField>
        <RecordField label={fieldLabel('kursleiter', 'spezialisierungen')} value={Array.isArray(record.fields.spezialisierungen) ? record.fields.spezialisierungen.map((v: unknown) => (v && typeof v === 'object' && 'label' in v) ? (v as {label: unknown}).label : v).join(', ') : null} format="text" />
        <RecordField label={fieldLabel('kursleiter', 'kurzbiografie')} value={record.fields.kurzbiografie} format="longtext" className="md:col-span-2" />
        <RecordField label={fieldLabel('kursleiter', 'status')} value={record.fields.status} format="pill" />
      </RecordSection>

      <SatelliteSection
        title={appLabel('kurse')}
        items={kurseList.filter(r => extractRecordId(r.fields.kursleiter) === record.record_id)}
        map={r => ({ name: r.fields.titel ?? appLabel('kurse'), meta: r.fields.startzeit })}
        onOpen={onOpenKurse}
        onAdd={onAddKurse}
        getKey={r => r.record_id}
      />

      <RecordAttachments appId={APP_IDS.KURSLEITER} recordId={record.record_id} />
    </>
  );
}
