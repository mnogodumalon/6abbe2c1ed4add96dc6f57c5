/**
 * EntityCrud — pre-generated CRUD + overlay plumbing for the dashboard.
 * Compose it; NEVER re-roll dialog state, submit handlers, an overlay stack
 * or a RecordOverlayHost in the page — this file owns all of it.
 *
 * API at a glance:
 *   const data = useDashboardData();
 *   const crud = useEntityCrud(data, {
 *     // optional — the ONE semantic slot on the overlay: the record's next
 *     // workflow step. Return undefined for types without one.
 *     footer: (top) => top.type === 'kursleiter'
 *       ? { label: …, onClick: () => … }
 *       : undefined,
 *   });
 *
 *   `top.type` is the SAME camelCase key as `crud.<entity>` — one spelling
 *   per entity, everywhere in this API.
 *   …
 *   crud.kursleiter.openCreate({ …defaults })   // create dialog, prefilled — defaults are
 *                                       // shape-tolerant: bare lookup keys / record ids are fine
 *   crud.kursleiter.openEdit(record)            // edit dialog (recordId + defaults wired)
 *   crud.kursleiter.openDetail(record)          // record overlay — pass the RAW record,
 *                                       // enrichment is resolved inside
 *   crud.overlay                         // RecordOverlayStack<OverlayItem> for drills:
 *                                       // push / pop / replace / close
 *   crud.enriched.kursleiter              // the display-ready array for EVERY entity —
 *                                       // Enriched* where relations exist, the raw array
 *                                       // otherwise. Reuse these; never call enrich*()
 *                                       // in the page, and never guess which entity has
 *                                       // one: they all do.
 *   {crud.surfaces}                      // render ONCE at the end of the page JSX:
 *                                       // all entity dialogs + the overlay host
 *
 * Built in (do NOT re-implement): optimistic update + Rückgängig counter-write
 * on edit, fetchAll-on-error, edit-from-overlay, and per-entity overlay bodies
 * (RecordHeader + <{Entity}Details> with every relation reachable and the
 * contextual "+" prefilled; list-field back-references additionally get a
 * "choose existing" picker that links an EXISTING record — built in, do not
 * re-roll). Drag writes (onEventDrop/onCardMove) stay YOURS:
 * optimistic setter first, PATCH in background, undoToast with counter-write.
 *
 * Overlay content per entity (the host renders these — you never compose
 * Details blocks yourself):
 *   kursleiter: kursleiter_firstname, kursleiter_lastname, email, telefon, foto, spezialisierungen, kurzbiografie, status  ·  ← kurse (list + contextual +)
 *   kurse: beschreibung, yogastil, niveau, kursleiter, titel, startzeit, dauer_minuten, ort, …  ·  → kursleiter · ← anmeldungen (list + contextual +)
 *   anmeldungen: kurs, teilnehmer_firstname, teilnehmer_lastname, email, telefon, erfahrung, gesundheitshinweise, bemerkungen, …  ·  → kurse
 */
import { useState, useMemo, type ReactNode } from 'react';
import type { Kursleiter, Kurse, Anmeldungen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { enrichKurse, enrichAnmeldungen } from '@/lib/enrich';
import type { EnrichedKurse, EnrichedAnmeldungen } from '@/types/enriched';
import { useDashboardData } from '@/hooks/useDashboardData';
import {
  useRecordOverlayStack, RecordOverlayHost, RecordHeader,
  type RecordOverlayStack,
} from '@/components/widgets/RecordView';
import { KursleiterDialog, type KursleiterDialogDefaults } from '@/components/dialogs/KursleiterDialog';
import { KursleiterDetails } from '@/components/details/KursleiterDetails';
import { KurseDialog, type KurseDialogDefaults } from '@/components/dialogs/KurseDialog';
import { KurseDetails } from '@/components/details/KurseDetails';
import { AnmeldungenDialog, type AnmeldungenDialogDefaults } from '@/components/dialogs/AnmeldungenDialog';
import { AnmeldungenDetails } from '@/components/details/AnmeldungenDetails';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { t, appLabel } from '@/i18n';
import { undoToast } from '@/lib/polish';
import { formatDate } from '@/lib/formatters';

// The overlay union — one branch per entity, `record` typed the way the data
// flows: Enriched* where enrichment exists, the raw record type otherwise.
// The host resolves enrichment itself; pages pass raw records everywhere.
export type OverlayItem =
  | { type: 'kursleiter'; record: Kursleiter }
  | { type: 'kurse'; record: EnrichedKurse }
  | { type: 'anmeldungen'; record: EnrichedAnmeldungen };

/** The useDashboardData() return — pass it in, never re-fetch inside. */
export type EntityCrudData = ReturnType<typeof useDashboardData>;

export interface EntityCrudOptions {
  /** Per-type overlay footer — the record's next workflow step. */
  footer?: (top: OverlayItem) => ReactNode | { label: ReactNode; onClick: () => void } | undefined;
  placement?: 'side' | 'center';
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface EntityCrudApi<TRecord, TDefaults> {
  /** Open the create dialog, optionally prefilled (shape-tolerant defaults). */
  openCreate: (defaults?: TDefaults) => void;
  /** Open the edit dialog for a record (recordId + defaults are wired). */
  openEdit: (record: TRecord) => void;
  /** Open the record overlay (raw record is fine — enrichment resolved inside). */
  openDetail: (record: TRecord) => void;
}

export interface EntityCrud {
  /** The overlay stack for drills: push / pop / replace / close. */
  overlay: RecordOverlayStack<OverlayItem>;
  /** Render ONCE at the end of the page JSX — all dialogs + the overlay host. */
  surfaces: ReactNode;
  kursleiter: EntityCrudApi<Kursleiter, KursleiterDialogDefaults>;
  kurse: EntityCrudApi<Kurse, KurseDialogDefaults>;
  anmeldungen: EntityCrudApi<Anmeldungen, AnmeldungenDialogDefaults>;
  /** The display-ready array per entity: Enriched* where an enrich function
   *  exists, the raw array otherwise. One key per entity so no page has to
   *  know which is which. Reuse these; never re-enrich in the page. */
  enriched: { kursleiter: Kursleiter[]; kurse: EnrichedKurse[]; anmeldungen: EnrichedAnmeldungen[] };
}

export function useEntityCrud(data: EntityCrudData, options?: EntityCrudOptions): EntityCrud {
  const overlay = useRecordOverlayStack<OverlayItem>();
  const [kursleiterDialog, setKursleiterDialog] = useState<{ defaults?: KursleiterDialogDefaults; editing?: Kursleiter } | null>(null);
  const [kurseDialog, setKurseDialog] = useState<{ defaults?: KurseDialogDefaults; editing?: Kurse } | null>(null);
  const [anmeldungenDialog, setAnmeldungenDialog] = useState<{ defaults?: AnmeldungenDialogDefaults; editing?: Anmeldungen } | null>(null);
  const enrichedKurse = useMemo(() => enrichKurse(data.kurse, { kursleiterMap: data.kursleiterMap }), [data.kurse, data.kursleiterMap]);
  const enrichedAnmeldungen = useMemo(() => enrichAnmeldungen(data.anmeldungen, { kurseMap: data.kurseMap }), [data.anmeldungen, data.kurseMap]);

  function detailKursleiter(record: Kursleiter, push = false) {
    const item: OverlayItem = { type: 'kursleiter', record };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKursleiter(fields: Kursleiter['fields']) {
    const editing = kursleiterDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKursleiter(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKursleiterEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kursleiter')} — ${t('crud_updated')}`, async () => {
        data.setKursleiter(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKursleiterEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKursleiterEntry(fields);
      undoToast(`${appLabel('kursleiter')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailKurse(record: Kurse, push = false) {
    const rec = enrichedKurse.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'kurse', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitKurse(fields: Kurse['fields']) {
    const editing = kurseDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setKurse(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateKurseEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('kurse')} — ${t('crud_updated')}`, async () => {
        data.setKurse(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateKurseEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createKurseEntry(fields);
      undoToast(`${appLabel('kurse')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  function detailAnmeldungen(record: Anmeldungen, push = false) {
    const rec = enrichedAnmeldungen.find(r => r.record_id === record.record_id);
    if (!rec) return;
    const item: OverlayItem = { type: 'anmeldungen', record: rec };
    if (push) overlay.push(item); else overlay.replace(item);
  }

  async function submitAnmeldungen(fields: Anmeldungen['fields']) {
    const editing = anmeldungenDialog?.editing;
    if (editing) {
      const prev = editing;
      data.setAnmeldungen(list => list.map(r => (r.record_id === editing.record_id ? { ...r, fields } : r)));
      try {
        await LivingAppsService.updateAnmeldungenEntry(editing.record_id, fields);
      } catch (err) {
        data.fetchAll();
        throw err;
      }
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_updated')}`, async () => {
        data.setAnmeldungen(list => list.map(r => (r.record_id === prev.record_id ? prev : r)));
        try { await LivingAppsService.updateAnmeldungenEntry(prev.record_id, prev.fields); } catch { data.fetchAll(); }
      });
    } else {
      await LivingAppsService.createAnmeldungenEntry(fields);
      undoToast(`${appLabel('anmeldungen')} — ${t('crud_created')}`);
      data.fetchAll();
    }
  }

  const surfaces = (
    <>
      <KursleiterDialog
        open={kursleiterDialog !== null}
        onClose={() => setKursleiterDialog(null)}
        onSubmit={submitKursleiter}
        defaultValues={kursleiterDialog?.defaults}
        recordId={kursleiterDialog?.editing?.record_id}
        enablePhotoScan={AI_PHOTO_SCAN['Kursleiter']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kursleiter']}
      />
      <KurseDialog
        open={kurseDialog !== null}
        onClose={() => setKurseDialog(null)}
        onSubmit={submitKurse}
        defaultValues={kurseDialog?.defaults}
        recordId={kurseDialog?.editing?.record_id}
        kursleiterList={data.kursleiter}
        enablePhotoScan={AI_PHOTO_SCAN['Kurse']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kurse']}
      />
      <AnmeldungenDialog
        open={anmeldungenDialog !== null}
        onClose={() => setAnmeldungenDialog(null)}
        onSubmit={submitAnmeldungen}
        defaultValues={anmeldungenDialog?.defaults}
        recordId={anmeldungenDialog?.editing?.record_id}
        kurseList={data.kurse}
        enablePhotoScan={AI_PHOTO_SCAN['Anmeldungen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Anmeldungen']}
      />
      <RecordOverlayHost
        overlay={overlay}
        placement={options?.placement}
        size={options?.size}
        footer={options?.footer}
        render={(top) => {
          if (top.type === 'kursleiter') {
            return (
              <>
                <RecordHeader title={top.record.fields.kursleiter_firstname ?? appLabel('kursleiter')} subtitle={undefined} />
                <KursleiterDetails
                  record={top.record}
                  kurseList={data.kurse}
                  onOpenKurse={(r) => detailKurse(r, true)}
                  onAddKurse={() => setKurseDialog({ defaults: { kursleiter: createRecordUrl(APP_IDS.KURSLEITER, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'kurse') {
            return (
              <>
                <RecordHeader title={top.record.fields.titel ?? appLabel('kurse')} subtitle={top.record.fields.startzeit ? formatDate(top.record.fields.startzeit) : undefined} />
                <KurseDetails
                  record={top.record}
                  kursleiterList={data.kursleiter}
                  onOpenKursleiter={(r) => detailKursleiter(r, true)}
                  anmeldungenList={data.anmeldungen}
                  onOpenAnmeldungen={(r) => detailAnmeldungen(r, true)}
                  onAddAnmeldungen={() => setAnmeldungenDialog({ defaults: { kurs: createRecordUrl(APP_IDS.KURSE, top.record.record_id) } })}
                />
              </>
            );
          }
          if (top.type === 'anmeldungen') {
            return (
              <>
                <RecordHeader title={top.record.fields.teilnehmer_firstname ?? appLabel('anmeldungen')} subtitle={top.record.fields.anmeldedatum ? formatDate(top.record.fields.anmeldedatum) : undefined} />
                <AnmeldungenDetails
                  record={top.record}
                  kurseList={data.kurse}
                  onOpenKurse={(r) => detailKurse(r, true)}
                />
              </>
            );
          }
          return null;
        }}
        onEdit={(top) => {
          overlay.close();
          if (top.type === 'kursleiter') setKursleiterDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'kurse') setKurseDialog({ editing: top.record, defaults: top.record.fields });
          if (top.type === 'anmeldungen') setAnmeldungenDialog({ editing: top.record, defaults: top.record.fields });
        }}
      />
    </>
  );

  return {
    overlay,
    surfaces,
    kursleiter: {
      openCreate: (defaults?: KursleiterDialogDefaults) => setKursleiterDialog({ defaults }),
      openEdit: (record: Kursleiter) => setKursleiterDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Kursleiter) => detailKursleiter(record, false),
    },
    kurse: {
      openCreate: (defaults?: KurseDialogDefaults) => setKurseDialog({ defaults }),
      openEdit: (record: Kurse) => setKurseDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Kurse) => detailKurse(record, false),
    },
    anmeldungen: {
      openCreate: (defaults?: AnmeldungenDialogDefaults) => setAnmeldungenDialog({ defaults }),
      openEdit: (record: Anmeldungen) => setAnmeldungenDialog({ editing: record, defaults: record.fields }),
      openDetail: (record: Anmeldungen) => detailAnmeldungen(record, false),
    },
    enriched: { kursleiter: data.kursleiter, kurse: enrichedKurse, anmeldungen: enrichedAnmeldungen },
  };
}
