import { useMemo, useState } from 'react';
import { format, parseISO, isToday, isFuture, startOfDay, endOfDay } from 'date-fns';
import { tx, appLabel, dateFnsLocale } from '@/i18n';
import { IconCalendar, IconUsers, IconAlertCircle, IconPlus, IconCheck } from '@tabler/icons-react';
import type { DashboardData } from '@/hooks/useDashboardData';
import { useEntityCrud } from '@/components/EntityCrud';
import { lookupKey, formatDateTime } from '@/lib/formatters';
import { lookupOption } from '@/types/app';
import { LivingAppsService } from '@/services/livingAppsService';
import { useClock, gruss, namen, undoToast } from '@/lib/polish';
import { DashboardGrid } from '@/components/DashboardGrid';
import { StatStrip, StatStripItem } from '@/components/StatCard';
import { WorkList } from '@/components/WorkList';
import { HeroBanner } from '@/components/HeroBanner';
import { Button } from '@/components/ui/button';
import { CalendarWidget, type CalendarEvent, type CalendarTone } from '@/components/widgets/CalendarWidget';

export default function DashboardOverview({ data }: { data: DashboardData }) {
  const {
    kursleiter, kurse, anmeldungen,
    kurseMap,
    setKurse,
    fetchAll,
  } = data;

  const crud = useEntityCrud(data, {
    footer: (top) => {
      if (top.type === 'kurse') {
        const rec = top.record;
        const status = lookupKey(rec.fields.kursstatus);
        if (status === 'geplant') {
          return {
            label: tx('Anmeldung öffnen'),
            onClick: async () => {
              const prev = [...kurse];
              setKurse(ks => ks.map(k =>
                k.record_id === rec.record_id
                  ? { ...k, fields: { ...k.fields, kursstatus: lookupOption('kurse', 'kursstatus', 'offen') } }
                  : k
              ));
              try {
                await LivingAppsService.updateKurseEntry(rec.record_id, { kursstatus: 'offen' });
                undoToast(tx`${rec.fields.titel ?? ''} — Anmeldung geöffnet`, async () => {
                  setKurse(prev);
                  await LivingAppsService.updateKurseEntry(rec.record_id, { kursstatus: 'geplant' });
                });
              } catch {
                await fetchAll();
              }
            },
          };
        }
      }
      return undefined;
    },
  });

  const enrichedKurse = crud.enriched.kurse;
  const enrichedAnmeldungen = crud.enriched.anmeldungen;

  const clock = useClock();
  const [kpiFilter, setKpiFilter] = useState<'offen' | 'ausgebucht' | 'heute' | null>(null);

  // Derive today's key
  const todayKey = format(clock, 'yyyy-MM-dd');

  // KPI derivations
  const offeneKurse = useMemo(
    () => kurse.filter(k => lookupKey(k.fields.kursstatus) === 'offen'),
    [kurse]
  );
  const ausgebuchtKurse = useMemo(
    () => kurse.filter(k => lookupKey(k.fields.kursstatus) === 'ausgebucht'),
    [kurse]
  );
  const aktiveKursleiter = useMemo(
    () => kursleiter.filter(k => lookupKey(k.fields.status) === 'aktiv'),
    [kursleiter]
  );
  const heutigeAnmeldungen = useMemo(
    () => anmeldungen.filter(a => a.fields.anmeldedatum === todayKey),
    [anmeldungen, todayKey]
  );

  // Geplante Kurse die noch nicht geöffnet sind (Hero-Signal)
  const geplanteKurse = useMemo(
    () => kurse.filter(k => lookupKey(k.fields.kursstatus) === 'geplant' && k.fields.startzeit && isFuture(parseISO(k.fields.startzeit))),
    [kurse]
  );

  // Anmeldungen counts per course
  const anmeldungenProKurs = useMemo(() => {
    const m = new Map<string, number>();
    anmeldungen.forEach(a => {
      const id = a.fields.kurs ? a.fields.kurs.split('/').pop() ?? '' : '';
      if (id) m.set(id, (m.get(id) ?? 0) + 1);
    });
    return m;
  }, [anmeldungen]);

  // Calendar events
  const events = useMemo<CalendarEvent[]>(() => {
    return kurse
      .filter(k => !!k.fields.startzeit)
      .map(k => {
        const status = lookupKey(k.fields.kursstatus);
        let tone: CalendarTone = 'default';
        if (status === 'offen') tone = 'primary';
        else if (status === 'ausgebucht') tone = 'success';
        else if (status === 'abgesagt') tone = 'destructive';
        else if (status === 'geplant') tone = 'warning';

        const start = k.fields.startzeit!;
        const dauer = k.fields.dauer_minuten ?? 60;
        const startDate = parseISO(start);
        const endDate = new Date(startDate.getTime() + dauer * 60000);
        const end = format(endDate, "yyyy-MM-dd'T'HH:mm");

        const anmeldZahl = anmeldungenProKurs.get(k.record_id) ?? 0;
        const maxT = k.fields.max_teilnehmer ?? 0;
        const enriched = enrichedKurse.find(e => e.record_id === k.record_id);

        return {
          id: `kurse:${k.record_id}`,
          start,
          end,
          title: k.fields.titel ?? tx('Kurs'),
          subtitle: enriched?.kursleiterName
            ? `${enriched.kursleiterName} · ${anmeldZahl}/${maxT}`
            : `${anmeldZahl}/${maxT}`,
          tone,
        };
      });
  }, [kurse, anmeldungenProKurs, enrichedKurse]);

  // Open handler für Kurs — setzt Status auf "offen"
  const openKurs = async (kursId: string) => {
    const kurs = kurse.find(k => k.record_id === kursId);
    if (!kurs) return;
    const prev = [...kurse];
    setKurse(ks => ks.map(k =>
      k.record_id === kursId
        ? { ...k, fields: { ...k.fields, kursstatus: lookupOption('kurse', 'kursstatus', 'offen') } }
        : k
    ));
    try {
      await LivingAppsService.updateKurseEntry(kursId, { kursstatus: 'offen' });
      undoToast(tx`${kurs.fields.titel ?? ''} — Anmeldung geöffnet`, async () => {
        setKurse(prev);
        await LivingAppsService.updateKurseEntry(kursId, { kursstatus: 'geplant' });
      });
    } catch {
      await fetchAll();
    }
  };

  // Filter for primary calendar view
  const filteredEvents = useMemo(() => {
    if (!kpiFilter) return events;
    if (kpiFilter === 'offen') return events.filter(e => {
      const id = e.id.split(':')[1];
      return lookupKey(kurseMap.get(id)?.fields.kursstatus) === 'offen';
    });
    if (kpiFilter === 'ausgebucht') return events.filter(e => {
      const id = e.id.split(':')[1];
      return lookupKey(kurseMap.get(id)?.fields.kursstatus) === 'ausgebucht';
    });
    if (kpiFilter === 'heute') return events.filter(e => {
      return isToday(parseISO(e.start));
    });
    return events;
  }, [events, kpiFilter, kurseMap]);

  // Upcoming / today's courses for aside
  const upcomingKurse = useMemo(() => {
    const now = clock;
    return [...kurse]
      .filter(k => {
        if (!k.fields.startzeit) return false;
        const start = parseISO(k.fields.startzeit);
        return start >= startOfDay(now) && start <= endOfDay(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));
      })
      .sort((a, b) => (a.fields.startzeit ?? '').localeCompare(b.fields.startzeit ?? ''))
      .slice(0, 5);
  }, [kurse, clock]);

  // Context line names
  const heutigeKurse = useMemo(() => kurse.filter(k => k.fields.startzeit && isToday(parseISO(k.fields.startzeit))), [kurse, clock]);
  const heutigeLeiterNamen = useMemo(() => {
    return heutigeKurse.map(k => {
      const e = enrichedKurse.find(e => e.record_id === k.record_id);
      return e?.kursleiterName ?? '';
    }).filter(Boolean);
  }, [heutigeKurse, enrichedKurse]);

  const kontextLine = useMemo(() => {
    if (heutigeKurse.length === 0) return tx('Heute keine Kurse geplant.');
    const n = heutigeKurse.length;
    const wer = namen(heutigeLeiterNamen);
    if (n === 1) return tx`${n} Kurs heute — Kursleiter: ${wer}`;
    return tx`${n} Kurse heute — Kursleiter: ${wer}`;
  }, [heutigeKurse, heutigeLeiterNamen]);

  // Hero: geplante Kurse die noch geöffnet werden müssen
  const heroKurs = geplanteKurse[0];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{gruss(clock)}</h1>
          <p className="text-muted-foreground text-sm mt-1">{kontextLine}</p>
        </div>
        <Button
          onClick={() => crud.kurse.openCreate({ kursstatus: 'geplant' })}
          className="shrink-0"
        >
          <IconPlus size={16} className="mr-1.5 shrink-0" />
          {tx('Neuer Kurs')}
        </Button>
      </div>

      <DashboardGrid
        variant="split"
        hero={
          heroKurs ? (
            <HeroBanner
              icon={<IconAlertCircle size={18} />}
              action={{
                label: tx('Anmeldung öffnen'),
                onClick: () => openKurs(heroKurs.record_id),
              }}
            >
              <b>{heroKurs.fields.titel}</b>{' '}
              {tx`startet ${formatDateTime(heroKurs.fields.startzeit)} — Anmeldung noch nicht geöffnet.`}
            </HeroBanner>
          ) : undefined
        }
        kpis={
          <StatStrip>
            <StatStripItem
              title={tx('Offene Kurse')}
              value={offeneKurse.length}
              icon={<IconCalendar size={16} className="shrink-0" />}
              tone={offeneKurse.length > 0 ? 'primary' : 'default'}
              onClick={() => setKpiFilter(f => f === 'offen' ? null : 'offen')}
              active={kpiFilter === 'offen'}
            />
            <StatStripItem
              title={tx('Neue Anmeldungen heute')}
              value={heutigeAnmeldungen.length}
              icon={<IconUsers size={16} className="shrink-0" />}
              tone={heutigeAnmeldungen.length > 0 ? 'success' : 'default'}
              onClick={() => setKpiFilter(f => f === 'heute' ? null : 'heute')}
              active={kpiFilter === 'heute'}
            />
            <StatStripItem
              title={tx('Ausgebucht')}
              value={ausgebuchtKurse.length}
              icon={<IconCheck size={16} className="shrink-0" />}
              tone={ausgebuchtKurse.length > 0 ? 'warning' : 'default'}
              onClick={() => setKpiFilter(f => f === 'ausgebucht' ? null : 'ausgebucht')}
              active={kpiFilter === 'ausgebucht'}
            />
            <StatStripItem
              title={tx('Aktive Kursleiter')}
              value={aktiveKursleiter.length}
              icon={<IconUsers size={16} className="shrink-0" />}
              tone="default"
              onClick={() => crud.kursleiter.openCreate({ status: 'aktiv' })}
            />
          </StatStrip>
        }
        primary={
          <CalendarWidget
            events={filteredEvents}
            defaultView="week"
            locale={dateFnsLocale()}
            dayStartHour={7}
            dayEndHour={22}
            onEventClick={ev => {
              const id = ev.id.split(':')[1];
              const rec = kurse.find(k => k.record_id === id);
              if (rec) crud.kurse.openDetail(rec);
            }}
            onEmptyClick={date => {
              crud.kurse.openCreate({
                startzeit: format(date, "yyyy-MM-dd'T'HH:mm"),
                kursstatus: 'geplant',
              });
            }}
            onEventDrop={async (eventId, newStart) => {
              const id = eventId.split(':')[1];
              if (!id) return;
              const prev = [...kurse];
              setKurse(ks => ks.map(k =>
                k.record_id === id ? { ...k, fields: { ...k.fields, startzeit: newStart } } : k
              ));
              try {
                await LivingAppsService.updateKurseEntry(id, { startzeit: newStart });
                const kurs = kurse.find(k => k.record_id === id);
                undoToast(tx`${kurs?.fields.titel ?? ''} — verschoben`, async () => {
                  setKurse(prev);
                  const orig = prev.find(k => k.record_id === id);
                  if (orig) await LivingAppsService.updateKurseEntry(id, { startzeit: orig.fields.startzeit });
                });
              } catch {
                await fetchAll();
              }
            }}
          />
        }
        aside={
          <>
            <WorkList
              title={tx('Kommende Kurse')}
              items={upcomingKurse.map(k => {
                const status = lookupKey(k.fields.kursstatus);
                const anmeldZahl = anmeldungenProKurs.get(k.record_id) ?? 0;
                const maxT = k.fields.max_teilnehmer ?? 0;
                const enriched = enrichedKurse.find(e => e.record_id === k.record_id);
                const statusColor =
                  status === 'offen' ? 'text-blue-600' :
                  status === 'ausgebucht' ? 'text-emerald-600' :
                  status === 'abgesagt' ? 'text-destructive' :
                  'text-amber-600';
                return {
                  id: k.record_id,
                  title: k.fields.titel ?? tx('Kurs'),
                  secondLine: (
                    <>
                      <span className={`font-medium ${statusColor}`}>
                        {k.fields.kursstatus?.label ?? status}
                      </span>
                      <span className="text-muted-foreground">
                        {' · '}{formatDateTime(k.fields.startzeit)}
                        {enriched?.kursleiterName ? ` · ${enriched.kursleiterName}` : ''}
                        {` · ${anmeldZahl}/${maxT}`}
                      </span>
                    </>
                  ),
                  action: status === 'geplant' ? {
                    label: tx('Öffnen'),
                    onClick: () => openKurs(k.record_id),
                  } : undefined,
                };
              })}
              onItemClick={id => {
                const rec = kurse.find(k => k.record_id === id);
                if (rec) crud.kurse.openDetail(rec);
              }}
              empty={{
                text: tx('Keine Kurse in den nächsten 7 Tagen.'),
                action: { label: tx('Kurs planen'), onClick: () => crud.kurse.openCreate({ kursstatus: 'geplant' }) },
              }}
            />

            <WorkList
              title={tx('Neue Anmeldungen heute')}
              items={heutigeAnmeldungen.slice(0, 5).map(a => {
                const name = [a.fields.teilnehmer_firstname, a.fields.teilnehmer_lastname].filter(Boolean).join(' ');
                const kursName = enrichedAnmeldungen.find(e => e.record_id === a.record_id)?.kursName ?? '';
                const status = lookupKey(a.fields.anmeldestatus);
                const statusColor = status === 'angemeldet' ? 'text-emerald-600' : status === 'warteliste' ? 'text-amber-600' : 'text-muted-foreground';
                return {
                  id: a.record_id,
                  title: name || tx('Unbekannt'),
                  secondLine: (
                    <>
                      <span className={`font-medium ${statusColor}`}>
                        {a.fields.anmeldestatus?.label ?? status ?? tx('Offen')}
                      </span>
                      {kursName && (
                        <span className="text-muted-foreground"> · {kursName}</span>
                      )}
                    </>
                  ),
                };
              })}
              onItemClick={id => {
                const rec = anmeldungen.find(a => a.record_id === id);
                if (rec) crud.anmeldungen.openDetail(rec);
              }}
              empty={{
                text: tx('Heute noch keine Anmeldungen eingegangen.'),
                action: { label: tx('Anmeldung erfassen'), onClick: () => crud.anmeldungen.openCreate({}) },
              }}
            />
          </>
        }
      />

      {crud.surfaces}
    </div>
  );
}
