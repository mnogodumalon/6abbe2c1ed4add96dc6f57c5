import { useEffect, useState, useMemo } from 'react';
import { PublicShell } from '@/components/PublicShell';
import {
  loadPublicPagesConfig,
  listPublicRecords,
  PageUnavailableError,
  type PublicPagesConfig,
  type PublicPageConfig,
  type PublicRecordResult,
} from '@/lib/publicClient';
import { tx, dateFnsLocale } from '@/i18n';
import { format, parseISO } from 'date-fns';
import { IconClock, IconMapPin, IconUsers } from '@tabler/icons-react';

interface KursRecord {
  id: string;
  titel: string;
  yogastil: { key: string; label: string } | null;
  niveau: { key: string; label: string } | null;
  startzeit: string | null;
  dauer_minuten: number | null;
  ort: string | null;
  preis: number | null;
  max_teilnehmer: number | null;
}

const NIVEAU_TONE: Record<string, string> = {
  anfaenger: 'bg-emerald-100 text-emerald-800',
  fortgeschritten: 'bg-amber-100 text-amber-800',
  alle: 'bg-sky-100 text-sky-800',
};

function formatStartzeit(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, "EEEE, d. MMMM yyyy 'um' HH:mm 'Uhr'", { locale: dateFnsLocale() });
  } catch {
    return iso;
  }
}

export default function Kursangebot() {
  const [cfg, setCfg] = useState<PublicPagesConfig | null>(null);
  const [page, setPage] = useState<PublicPageConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [kurseRaw, setKurseRaw] = useState<Record<string, PublicRecordResult>>({});
  const [dataLoading, setDataLoading] = useState(false);
  const [niveauFilter, setNiveauFilter] = useState<string | null>(null);
  const [stilFilter, setStilFilter] = useState<string | null>(null);

  useEffect(() => {
    loadPublicPagesConfig('kursangebot').then(c => {
      setCfg(c);
      setPage(c?.pages['kursangebot'] ?? null);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!cfg || !page) return;
    const kurseEp = page.endpoints?.find(e => e.op === 'list' && e.entity === 'kurse');
    if (!kurseEp) return;
    setDataLoading(true);
    listPublicRecords(cfg, page, { appId: kurseEp.app_id, limit: 500 }).then(k => {
      setKurseRaw(k);
      setDataLoading(false);
    });
  }, [cfg, page]);

  const kurse = useMemo<KursRecord[]>(() => {
    return Object.values(kurseRaw).map(r => ({
      id: r.id,
      titel: (r.fields.titel as string) ?? '—',
      yogastil: r.fields.yogastil
        ? { key: (r.fields.yogastil as { key: string; label: string }).key, label: (r.fields.yogastil as { key: string; label: string }).label }
        : null,
      niveau: r.fields.niveau
        ? { key: (r.fields.niveau as { key: string; label: string }).key, label: (r.fields.niveau as { key: string; label: string }).label }
        : null,
      startzeit: (r.fields.startzeit as string) ?? null,
      dauer_minuten: (r.fields.dauer_minuten as number) ?? null,
      ort: (r.fields.ort as string) ?? null,
      preis: (r.fields.preis as number) ?? null,
      max_teilnehmer: (r.fields.max_teilnehmer as number) ?? null,
    }));
  }, [kurseRaw]);

  const stilOptionen = useMemo(() => {
    const seen = new Map<string, string>();
    for (const k of kurse) {
      if (k.yogastil) seen.set(k.yogastil.key, k.yogastil.label);
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }, [kurse]);

  const niveauOptionen = useMemo(() => {
    const seen = new Map<string, string>();
    for (const k of kurse) {
      if (k.niveau) seen.set(k.niveau.key, k.niveau.label);
    }
    return Array.from(seen.entries()).map(([key, label]) => ({ key, label }));
  }, [kurse]);

  const filtered = useMemo(() => {
    return kurse.filter(k => {
      if (niveauFilter && k.niveau?.key !== niveauFilter) return false;
      if (stilFilter && k.yogastil?.key !== stilFilter) return false;
      return true;
    });
  }, [kurse, niveauFilter, stilFilter]);

  if (loading || (!loading && !cfg)) {
    return <PublicShell loading={loading} unavailable={!loading} />;
  }
  if (!page) {
    return <PublicShell unavailable />;
  }

  const anyFilter = niveauFilter || stilFilter;

  return (
    <PublicShell title={page.title || tx('Kursangebot')} description={page.description} fullBleed>
      {/* Hero band */}
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
          <p className="text-base text-muted-foreground max-w-xl">
            {tx('Entdecke unsere offenen Yoga-Kurse und melde dich an.')}
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap gap-2 items-center">
          <span className="text-sm font-medium text-muted-foreground mr-1">{tx('Filtern:')}</span>

          {/* Stil filter */}
          {stilOptionen.map(o => (
            <button
              key={o.key}
              onClick={() => setStilFilter(f => f === o.key ? null : o.key)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                stilFilter === o.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              {o.label}
            </button>
          ))}

          {/* Niveau filter */}
          {niveauOptionen.map(o => (
            <button
              key={o.key}
              onClick={() => setNiveauFilter(f => f === o.key ? null : o.key)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                niveauFilter === o.key
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card border-border hover:border-primary/50'
              }`}
            >
              {o.label}
            </button>
          ))}

          {anyFilter && (
            <button
              onClick={() => { setNiveauFilter(null); setStilFilter(null); }}
              className="px-3 py-1 rounded-full text-sm border border-border hover:border-destructive hover:text-destructive transition-colors ml-auto"
            >
              {tx('Filter zurücksetzen')}
            </button>
          )}
        </div>
      </div>

      {/* Course grid */}
      <div className="max-w-5xl mx-auto px-4 py-8">
        {dataLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-5 animate-pulse space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-4 bg-muted rounded w-full" />
                <div className="h-4 bg-muted rounded w-2/3" />
              </div>
            ))}
          </div>
        )}

        {!dataLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">{tx('Keine Kurse gefunden')}</p>
            {anyFilter && (
              <p className="text-sm mt-1">{tx('Versuche einen anderen Filter.')}</p>
            )}
          </div>
        )}

        {!dataLoading && filtered.length > 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-5">
              {filtered.length === 1
                ? tx('1 Kurs gefunden')
                : `${filtered.length} ${tx('Kurse gefunden')}`}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map(kurs => {
                const niveauClass = kurs.niveau ? (NIVEAU_TONE[kurs.niveau.key] ?? 'bg-muted text-muted-foreground') : '';

                return (
                  <div key={kurs.id} className="rounded-xl border border-border bg-card overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                    {/* Card header */}
                    <div className="p-5 pb-3 flex-1 flex flex-col gap-3">
                      <div className="flex flex-wrap gap-2 items-start justify-between">
                        <div className="flex flex-wrap gap-1.5">
                          {kurs.yogastil && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                              {kurs.yogastil.label}
                            </span>
                          )}
                          {kurs.niveau && (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${niveauClass}`}>
                              {kurs.niveau.label}
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="text-base font-semibold leading-snug">{kurs.titel}</h3>

                      <ul className="space-y-1.5 text-sm text-muted-foreground">
                        <li className="flex items-start gap-2">
                          <IconClock size={15} className="shrink-0 mt-0.5" />
                          <span>
                            {formatStartzeit(kurs.startzeit)}
                            {kurs.dauer_minuten != null && (
                              <span className="ml-1 text-xs">({kurs.dauer_minuten} {tx('Min.')})</span>
                            )}
                          </span>
                        </li>
                        {kurs.ort && (
                          <li className="flex items-center gap-2">
                            <IconMapPin size={15} className="shrink-0" />
                            <span className="truncate">{kurs.ort}</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Card footer */}
                    <div className="px-5 py-3 border-t border-border bg-muted/30 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <IconUsers size={14} className="shrink-0" />
                        <span>
                          {kurs.max_teilnehmer != null
                            ? `${tx('Max.')} ${kurs.max_teilnehmer} ${tx('Plätze')}`
                            : tx('Unbegrenzte Plätze')}
                        </span>
                      </div>
                      {kurs.preis != null && (
                        <div className="flex items-center gap-0.5 font-semibold text-foreground">
                          <span>
                            {new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(kurs.preis)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </PublicShell>
  );
}
