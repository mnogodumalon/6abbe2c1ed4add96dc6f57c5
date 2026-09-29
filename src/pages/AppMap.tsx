import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { IconCheck, IconAlertCircle, IconUpload, IconPlus, IconX, IconChevronDown, IconChevronUp, IconChevronRight, IconClock } from '@tabler/icons-react';
import { PageShell } from '@/components/PageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/i18n';
import {
  acceptProposal, answerLine, answerLineWithFile, confirmLine, getAppMap, jobFor, proposeChange, rejectProposal, undoChange,
  type AppMap as AppMapData, type AppMapState, type FilterCondition, type FilterValue, type LineChannel, type LineJob, type MapLine,
  type PlanChange, type Proposal,
} from '@/lib/appMap';

/**
 * AppMap — „Deine Anwendung“, v5 (team review 29.09.2026, four to nil).
 *
 * The page shows only what the owner can do NOW — the rest lives where it
 * acts, or one click deeper:
 *   three sentences on what the application is
 *   ONE decision card at a time (money and outside effect; minor assumptions
 *     show once where they first act — the flow's review)
 *   what an agent is doing right now, with the remaining minutes, and what
 *     did not work, with „Nochmal“ / „Lassen“
 *   „Was soll anders sein?“ with three chips from the plan, the proposal
 *     right under it
 *   „Zuletzt: … · Zurück“ and two links: „Alles ansehen“ (search, one
 *     sentence per flow and tool, a tool's own page) and „Alle Änderungen“
 *
 * The control tells the speed: a choice acts at once (seconds, undo), a
 * clock button starts agent work (minutes, honest „Zurückbauen“), „Vorschlag
 * holen“ changes nothing yet. `?view=all|history|tool:<id>` are the sub
 * pages, `?line=<id>` a deep link. Nothing here rebuilds the dashboard.
 */

const MAP_PATH = '/verwaltung/anwendung';
const SLOW: LineChannel[] = ['tool', 'page'];
const AGENT_MINUTES = 3;
const JobsContext = createContext<Record<string, LineJob>>({});

type SaveState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; channel: LineChannel } | { kind: 'error'; message: string };
type Toast = { id: number; text: string; bad?: boolean; actions?: { label: string; clock?: boolean; fn: () => void }[] };

const SCHEDULE_PRESETS: { value: string; label: () => string }[] = [
  { value: '0 6 * * *', label: () => t('am_daily_at', { time: '06:00' }) },
  { value: '0 8 * * *', label: () => t('am_daily_at', { time: '08:00' }) },
  { value: '0 2 * * *', label: () => t('am_daily_at', { time: '02:00' }) },
  { value: '0 22 * * *', label: () => t('am_daily_at', { time: '22:00' }) },
  { value: '0 8 * * 1', label: () => t('am_weekly') },
  { value: '0 8 1 * *', label: () => t('am_monthly') },
];
const OPS: FilterCondition['op'][] = ['eq', 'ne', 'in', 'not_in', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'];

function isHead(line: MapLine): boolean { return line.id.split(':').length === 2; }
function groupOf(line: MapLine): string { const [k, id] = line.id.split(':'); return `${k}:${id}`; }
function toolName(label: string | undefined, id: string): string {
  const first = (label ?? '').split(/(?<=[.!?])\s/)[0]?.trim() ?? '';
  return first.replace(/\s*\(derived:[^)]*\)\s*/g, ' ').replace(/[.:]$/, '').trim() || id;
}
function plainNote(text: string): string[] {
  return text.replace(/\*\*/g, '').replace(/`/g, '').split(/\s+-\s+(?=[A-ZÄÖÜ])/).map(s => s.trim()).filter(Boolean);
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
function remainingMinutes(job: LineJob): number {
  const elapsed = (Date.now() - new Date(job.started_at).getTime()) / 60000;
  return Math.max(1, Math.ceil(AGENT_MINUTES - elapsed));
}
/** Two sentences on what the application is, from the planner's understanding. */
function firstSentences(text: string, n: number): string {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean).slice(0, n).join(' ');
}

export default function AppMap() {
  const [st, setSt] = useState<AppMapState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [states, setStates] = useState<Record<string, SaveState>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dismissed, setDismissed] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const view = params.get('view') ?? 'main';
  const focus = params.get('line');
  const lastJobs = useRef<Record<string, LineJob['status']>>({});

  const toast = (text: string, actions?: Toast['actions'], bad = false, ms = 9000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, text, bad, actions }]);
    window.setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), ms);
  };
  const dropToast = (id: number) => setToasts(prev => prev.filter(x => x.id !== id));

  const reload = () => getAppMap().then(s => { setSt(s); setLoading(false); }).catch(e => { setError(e instanceof Error ? e.message : String(e)); setLoading(false); });
  useEffect(() => { reload(); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  // jobs: poll while one runs; a job that flips to done / failed gets its toast
  const running = useMemo(() => Object.values(st?.jobs ?? {}).some(j => j.status === 'running'), [st?.jobs]);
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(reload, 8000);
    return () => window.clearInterval(id);
  }, [running]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!st) return;
    for (const j of Object.values(st.jobs)) {
      const before = lastJobs.current[j.id];
      if (before === 'running' && j.status === 'done') {
        toast(t('da_done_job', { text: j.text }), [{ label: t('da_view'), fn: () => openJobTarget(j) }]);
      } else if (before === 'running' && j.status === 'failed') {
        toast(t('da_failed_job', { text: j.text, error: j.error ?? '' }), [{ label: t('da_retry'), clock: true, fn: () => retry(j) }, { label: t('da_leave'), fn: () => setDismissed(d => ({ ...d, [j.id]: true })) }], true, 15000);
      }
      lastJobs.current[j.id] = j.status;
    }
  }, [st?.jobs]);   // eslint-disable-line react-hooks/exhaustive-deps

  const goView = (v: string | null, line?: string) => {
    const q = new URLSearchParams();
    if (v && v !== 'main') q.set('view', v);
    if (line) q.set('line', line);
    navigate(`${MAP_PATH}${q.toString() ? `?${q}` : ''}`);
  };
  const openJobTarget = (j: LineJob) => {
    if (j.kind === 'page' && j.about) navigate(`/intents/${j.about}`);
    else goView(`tool:${j.line_id.split(':')[1]}`, j.line_id);
  };

  const map: AppMapData | null = st?.map ?? null;
  const lines = map?.lines ?? [];
  const decisions = useMemo(() => lines.filter(l => l.section === 'decisions'), [lines]);
  const pending = useMemo(() => decisions.filter(l => !l.answered && l.weight !== 'minor'), [decisions]);
  const minorOpen = useMemo(() => decisions.filter(l => !l.answered && l.weight === 'minor'), [decisions]);
  const limits = useMemo(() => lines.filter(l => l.section === 'limits' || l.section === 'structure'), [lines]);

  const setState = (id: string, s: SaveState) => setStates(prev => ({ ...prev, [id]: s }));
  const run = async (line: MapLine, call: () => ReturnType<typeof answerLine>) => {
    setState(line.id, { kind: 'saving' });
    try {
      const res = await call();
      setSt(prev => prev ? { ...prev, map: res.map, planVersion: res.plan_version ?? prev.planVersion, changes: res.changes ?? prev.changes } : prev);
      setState(line.id, { kind: 'saved', channel: res.action.channel });
      const change = res.changes?.[0];
      if (change?.undo && (res.action.channel === 'policy' || res.action.channel === 'trigger')) {
        toast(t('da_changed', { text: change.text }), [{ label: t('da_undo_short'), fn: () => undo(change) }], false, 10000);
      }
      if (SLOW.includes(res.action.channel)) reload();
    } catch (e) {
      setState(line.id, { kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
  };
  const save = (line: MapLine, value: unknown) => run(line, () => answerLine(line.id, value));
  const upload = (line: MapLine, file: File) => run(line, () => answerLineWithFile(line.id, file));
  const confirm = (line: MapLine) => run(line, () => confirmLine(line.id));
  const undo = async (c: PlanChange) => {
    try {
      const r = await undoChange(c.version);
      setSt(prev => prev ? { ...prev, map: r.map ?? prev.map, planVersion: r.plan_version, changes: r.changes } : prev);
      if (c.rebuild && !c.undo) reload();
    } catch (e) { toast(e instanceof Error ? e.message : String(e), undefined, true); }
  };
  const retry = (j: LineJob) => {
    const line = lines.find(l => l.id === j.line_id);
    if (line && j.value !== undefined) save(line, j.value);
    setDismissed(d => ({ ...d, [j.id]: true }));
  };

  const body = () => {
    if (!map || !st) return null;
    if (view === 'all') return <AllView lines={lines} minor={minorOpen} limits={limits} focus={focus} states={states} onSave={save} onUpload={upload} onFits={confirm} goView={goView} navigate={navigate} />;
    if (view === 'history') return <HistoryView changes={st.changes} onUndo={undo} goView={goView} />;
    if (view.startsWith('tool:')) return <ToolView id={view.slice(5)} lines={lines} changes={st.changes} focus={focus} states={states} onSave={save} onUpload={upload} goView={goView} />;
    return <MainView st={st} lines={lines} pending={pending} focus={focus} decisions={decisions} states={states} dismissed={dismissed}
      onSave={save} onUpload={upload} onFits={confirm} onUndo={undo} onRetry={retry} onLeave={j => setDismissed(d => ({ ...d, [j.id]: true }))}
      onChanged={next => setSt(prev => prev ? { ...prev, ...next } : prev)} reload={reload} goView={goView} toast={toast} />;
  };

  return (
    <PageShell title={t('da_title')} subtitle={view === 'main' ? (pending.length ? t('da_sub_decide') : t('da_sub_ok')) : ''}>
      {loading && <p className="text-sm text-muted-foreground">{t('am_loading')}</p>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!loading && !error && !map && <p className="text-sm text-muted-foreground">{t('am_none')}</p>}
      {map && st && <JobsContext.Provider value={st.jobs}>{body()}</JobsContext.Provider>}
      <div className="fixed bottom-5 left-1/2 z-40 flex w-[min(600px,92vw)] -translate-x-1/2 flex-col gap-2" aria-live="polite">
        {toasts.map(x => (
          <div key={x.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-lg ${x.bad ? 'bg-destructive text-destructive-foreground' : 'bg-foreground text-background'}`}>
            <span>{x.text}</span>
            <span className="flex gap-3">{(x.actions ?? []).map(a => <button key={a.label} type="button" onClick={() => { dropToast(x.id); a.fn(); }} className="underline">{a.clock ? '🕒 ' : ''}{a.label}</button>)}</span>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

/* ── main page ────────────────────────────────────────────────────────── */

function MainView({ st, lines, pending, focus, decisions, states, dismissed, onSave, onUpload, onFits, onUndo, onRetry, onLeave, onChanged, reload, goView, toast }: {
  st: AppMapState; lines: MapLine[]; pending: MapLine[]; focus: string | null; decisions: MapLine[]; states: Record<string, SaveState>; dismissed: Record<string, boolean>;
  onSave: (l: MapLine, v: unknown) => void; onUpload: (l: MapLine, f: File) => void; onFits: (l: MapLine) => void; onUndo: (c: PlanChange) => void;
  onRetry: (j: LineJob) => void; onLeave: (j: LineJob) => void; onChanged: (n: Partial<AppMapState>) => void; reload: () => void; goView: (v: string | null, line?: string) => void; toast: (text: string) => void;
}) {
  const summary = lines.find(l => l.id === 'about:summary');
  const tasks = lines.find(l => l.id === 'about:tasks');
  const focused = focus?.startsWith('question:') ? decisions.find(l => l.id === focus) : undefined;
  const card = focused ?? pending[0];
  const jobs = Object.values(st.jobs).filter(j => j.status === 'running' || (j.status === 'failed' && !dismissed[j.id]));
  const last = st.changes[0];
  return (
    <div className="space-y-6">
      {(summary || tasks) && (
        <p className="max-w-prose text-sm text-muted-foreground">{summary && firstSentences(summary.text, 2)}{tasks && ` ${tasks.text}.`}</p>
      )}
      {card && <DecisionCard line={card} state={states[card.id] ?? { kind: 'idle' }} onFits={() => onFits(card)} onSave={v => onSave(card, v)} onUpload={f => onUpload(card, f)} />}
      {jobs.length > 0 && (
        <div className="rounded-2xl border border-border bg-card px-5 py-3">
          {jobs.map(j => (
            <div key={j.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 text-sm last:border-b-0">
              <span className="min-w-0 flex-1">{j.text}{j.status === 'failed' && <span className="block text-xs text-muted-foreground">{t('da_failed_inline', { error: j.error ?? '' })}</span>}</span>
              {j.status === 'running'
                ? <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-secondary-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden="true" />{t('da_remaining', { n: remainingMinutes(j) })}</span>
                : <span className="flex gap-1">{j.value !== undefined && <Button type="button" size="sm" variant="outline" onClick={() => onRetry(j)} className="gap-1"><IconClock size={14} aria-hidden="true" />{t('da_retry')}</Button>}<Button type="button" size="sm" variant="ghost" onClick={() => onLeave(j)}>{t('da_leave')}</Button></span>}
            </div>
          ))}
          <p className="mt-2 text-xs text-muted-foreground">{t('da_meanwhile')}</p>
        </div>
      )}
      <section className="space-y-2">
        <h2 className="text-base font-semibold">{t('da_tab_change')}</h2>
        <ChangeTab proposal={st.proposal} suggestions={st.map?.suggestions ?? []} onChanged={onChanged} reload={reload} toast={toast} />
      </section>
      <div className="border-t border-border pt-3 text-sm text-muted-foreground">
        {last && <p>{t('da_last')}: {last.text} · {fmtDate(last.at)}{last.undone ? ` · ${t('da_undone')}` : last.undo ? <> · <button type="button" onClick={() => onUndo(last)} className="font-semibold text-primary hover:underline">{t('da_undo_short')}</button></> : last.rebuild ? <> · <button type="button" onClick={() => onUndo(last)} className="font-semibold text-primary hover:underline">🕒 {t('da_rebuild')}</button></> : null}</p>}
        <p className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
          <button type="button" onClick={() => goView('all')} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">{t('da_all_link')}<IconChevronRight size={14} aria-hidden="true" /></button>
          <button type="button" onClick={() => goView('history')} className="inline-flex items-center gap-0.5 font-semibold text-primary hover:underline">{t('da_history_link')}<IconChevronRight size={14} aria-hidden="true" /></button>
        </p>
      </div>
    </div>
  );
}

/* ── the card: question, „Warum?“, Passt / Anders ─────────────────────── */

function DecisionCard({ line, state, onFits, onSave, onUpload }: { line: MapLine; state: SaveState; onFits: () => void; onSave: (v: unknown) => void; onUpload: (f: File) => void }) {
  const [other, setOther] = useState(false);
  const [why, setWhy] = useState(false);
  useEffect(() => { setOther(false); }, [line.id]);
  const busy = state.kind === 'saving';
  const e = line.editable;
  return (
    <div id={`line-${line.id}`} className="rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
      <p className="text-base font-medium">{line.text}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        {t('am_assumed')}: <span className="text-foreground">{line.assumed || '—'}</span>
        {line.about?.label && <> · <button type="button" onClick={() => setWhy(v => !v)} className="text-primary hover:underline">{t('da_why')}</button></>}
      </p>
      {why && line.about?.label && <p className="mt-1 text-sm text-muted-foreground">{line.about.label}</p>}
      {!other && !line.answered && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={onFits} className="gap-1"><IconCheck size={14} aria-hidden="true" />{t('am_fits')}</Button>
          {e && e.ready && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setOther(true)}>{e.file ? t('da_own_template') : t('am_other')}</Button>}
        </div>
      )}
      {line.answered && !other && e && e.ready && <div className="mt-3"><Button type="button" size="sm" variant="ghost" onClick={() => setOther(true)} className="text-primary">{t('am_change')}</Button></div>}
      {other && e && e.ready && (
        <div className="mt-4 space-y-2">
          <LineEditor line={line} state={state} onSave={onSave} onUpload={onUpload} />
          <button type="button" onClick={() => setOther(false)} className="text-xs text-muted-foreground hover:underline">{t('am_back')}</button>
        </div>
      )}
      <JobBadge lineId={line.id} block />
      <StateLine state={state} />
    </div>
  );
}

/* ── „Was soll anders sein?“ ──────────────────────────────────────────── */

function ChangeTab({ proposal, suggestions, onChanged, reload, toast }: { proposal: Proposal | null; suggestions: string[]; onChanged: (next: Partial<AppMapState>) => void; reload: () => void; toast: (text: string) => void }) {
  const [text, setText] = useState(proposal?.status === 'failed' ? proposal.wish : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const area = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (proposal?.status !== 'planning') return;
    const started = new Date(proposal.created_at).getTime();
    const id = window.setInterval(() => { setElapsed(Math.max(0, Math.round((Date.now() - started) / 1000))); reload(); }, 3000);
    return () => window.clearInterval(id);
  }, [proposal?.status, proposal?.created_at, reload]);

  const propose = async (wish: string) => {
    if (!wish.trim()) return;
    setBusy(true); setErr(null); setHint(null); setText(wish);
    try { onChanged({ proposal: await proposeChange(wish.trim()) }); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  const accept = async () => {
    if (!proposal) return;
    setBusy(true); setErr(null);
    try {
      const r = await acceptProposal(proposal.id);
      onChanged({ map: r.map, planVersion: r.plan_version, changes: r.changes, proposal: null });
      toast(r.started.length ? t('da_accepted_work', { effect: proposal.effect ?? '' }) : t('da_accepted_now'));
      setText('');
      reload();
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    setBusy(false);
  };
  const other = async () => {
    if (!proposal) return;
    const wish = proposal.wish;
    try { await rejectProposal(proposal.id); } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    onChanged({ proposal: null });
    setText(wish); setHint(t('da_say_more'));
    window.setTimeout(() => { area.current?.focus(); area.current?.setSelectionRange(wish.length, wish.length); }, 0);
  };
  const tagClass: Record<string, string> = { add: 'bg-primary/10 text-primary', change: 'bg-secondary text-secondary-foreground', remove: 'bg-destructive/10 text-destructive', keep: 'bg-muted text-muted-foreground' };
  const instant = !!proposal?.effect && proposal.effect.startsWith('Nur der Plan');
  const planning = proposal?.status === 'planning';

  return (
    <div className="space-y-3">
      <textarea ref={area} id="am-wish" value={text} onChange={ev => setText(ev.target.value)} rows={3} disabled={busy || planning}
        placeholder={t('da_change_placeholder')} className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm" />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map(s => <button key={s} type="button" disabled={busy || planning} onClick={() => propose(s)} className="rounded-full border border-border bg-card px-3 py-1 text-sm hover:bg-secondary">{s.replace(/\.$/, '')}</button>)}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={busy || !text.trim() || planning} onClick={() => propose(text)}>{t('da_propose')}</Button>
        {planning && <span className="inline-flex items-center gap-2 text-sm text-muted-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden="true" />{t('da_planning', { s: elapsed })}</span>}
      </div>
      {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
      {proposal?.status === 'failed' && <p role="alert" className="text-sm text-destructive">{t('da_failed', { error: proposal.error ?? '' })}</p>}
      {proposal?.status === 'ready' && (
        <div className="rounded-2xl border border-border bg-card px-5 py-4">
          <p className="text-sm text-muted-foreground">„{proposal.wish}“</p>
          <p className="mt-1 text-sm font-semibold">{t('da_proposal_title')} <span className="font-normal text-muted-foreground">{proposal.summary}</span></p>
          <ul className="mt-2 divide-y divide-border">
            {(proposal.items ?? []).map((it, i) => (
              <li key={i} className="py-2 text-sm">
                <span className={`mr-2 inline-block rounded-md px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${tagClass[it.tag] ?? ''}`}>{t(`da_tag_${it.tag}`)}</span>
                {it.text}
                {it.before && <span className="block text-xs text-muted-foreground">{t('da_before')}: {it.before}</span>}
                {it.why && <span className="block text-xs text-muted-foreground">{it.why}</span>}
              </li>
            ))}
          </ul>
          {proposal.effect && <p className="mt-2 text-xs text-muted-foreground">{proposal.effect}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={accept} className="gap-1">{instant ? <IconCheck size={14} aria-hidden="true" /> : <IconClock size={14} aria-hidden="true" />}{instant ? t('am_fits') : t('da_fits_minutes')}</Button>
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={other}>{t('am_other')}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── „Alles ansehen“ ──────────────────────────────────────────────────── */

function AllView({ lines, minor, limits, focus, states, onSave, onUpload, onFits, goView, navigate }: {
  lines: MapLine[]; minor: MapLine[]; limits: MapLine[]; focus: string | null; states: Record<string, SaveState>;
  onSave: (l: MapLine, v: unknown) => void; onUpload: (l: MapLine, f: File) => void; onFits: (l: MapLine) => void; goView: (v: string | null, line?: string) => void; navigate: (to: string) => void;
}) {
  const [q, setQ] = useState('');
  const [rest, setRest] = useState(false);
  const groups = useMemo(() => {
    const out = new Map<string, MapLine[]>();
    for (const l of lines) { if (l.section !== 'intents' && l.section !== 'tools') continue; const k = groupOf(l); out.set(k, [...(out.get(k) ?? []), l]); }
    return out;
  }, [lines]);
  useEffect(() => {
    if (!focus) return;
    const id = window.setTimeout(() => document.getElementById(`line-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
    return () => window.clearTimeout(id);
  }, [focus]);
  const sentence = (k: string, ls: MapLine[]): string => {
    const head = ls.find(isHead) ?? ls[0];
    const parts = [head.text];
    if (k.startsWith('intent:')) for (const l of ls) { const e = l.editable; if (e && (e.kind === 'option' || (e.kind === 'filter' && e.value))) parts.push(l.text); }
    else { const n = ls.find(l => l.id.endsWith(':next_run')); if (n) parts.push(n.text); }
    return parts.join(' · ');
  };
  const hit = (k: string, ls: MapLine[]) => {
    if (!q.trim()) return true;
    const head = ls.find(isHead) ?? ls[0];
    const title = k.startsWith('tool:') ? toolName(head.about.label, head.about.id) : (head.about.label ?? head.about.id);
    return (title + ' ' + ls.map(l => l.text).join(' ')).toLowerCase().includes(q.toLowerCase());
  };
  const flows = [...groups.entries()].filter(([k]) => k.startsWith('intent:')).filter(([k, ls]) => hit(k, ls));
  const tools = [...groups.entries()].filter(([k]) => k.startsWith('tool:')).filter(([k, ls]) => hit(k, ls));
  const tail = (['platform', 'roles'] as const).map(s => [s, lines.filter(l => l.section === s)] as const).filter(([, ls]) => ls.length > 0);
  return (
    <div className="space-y-5">
      <button type="button" onClick={() => goView(null)} className="text-sm text-muted-foreground hover:underline">‹ {t('da_title')}</button>
      <h2 className="text-lg font-semibold">{t('da_all_title')}</h2>
      <Input type="search" value={q} onChange={ev => setQ(ev.target.value)} placeholder={t('da_search')} aria-label={t('da_search')} />
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('am_section_intents')}</h3>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {flows.map(([k, ls]) => { const head = ls.find(isHead) ?? ls[0]; return (
            <li key={k} id={`line-${head.id}`} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 ${focus && ls.some(l => l.id === focus) ? 'ring-2 ring-primary/40' : ''}`}>
              <span className="min-w-0 flex-1"><b className="font-medium">{head.about.label ?? head.about.id}</b><br /><span className="text-sm text-muted-foreground">{sentence(k, ls)}</span></span>
              <button type="button" onClick={() => navigate(`/intents/${head.about.id}`)} className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline">{t('da_open')}<IconChevronRight size={14} aria-hidden="true" /></button>
            </li>); })}
          {flows.length === 0 && <li className="px-5 py-3 text-sm text-muted-foreground">{t('da_nothing')}</li>}
        </ul>
      </section>
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('am_section_tools')} <span className="font-normal normal-case tracking-normal">· {t('da_tools_hint')}</span></h3>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {tools.map(([k, ls]) => { const head = ls.find(isHead) ?? ls[0]; const status = ls.find(l => l.id.endsWith(':status')); return (
            <li key={k} id={`line-${head.id}`} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-5 py-3 ${focus && ls.some(l => l.id === focus) ? 'ring-2 ring-primary/40' : ''}`}>
              <span className="min-w-0 flex-1"><b className="font-medium">{toolName(head.about.label, head.about.id)}</b>{status && status.text !== 'gebaut' && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">{status.text}</span>} <JobBadge lineId={head.id} /><br /><span className="text-sm text-muted-foreground">{sentence(k, ls)}</span></span>
              <button type="button" onClick={() => goView(`tool:${head.about.id}`)} className="text-sm font-semibold text-primary hover:underline" aria-label={t('da_open')}><IconChevronRight size={16} aria-hidden="true" /></button>
            </li>); })}
          {tools.length === 0 && <li className="px-5 py-3 text-sm text-muted-foreground">{t('da_nothing')}</li>}
        </ul>
      </section>
      {minor.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('da_minor_title')}</h3>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {minor.map(line => <li key={line.id} id={`line-${line.id}`} className="px-5 py-3"><DecisionRow line={line} state={states[line.id] ?? { kind: 'idle' }} onSave={v => onSave(line, v)} onUpload={f => onUpload(line, f)} onFits={() => onFits(line)} /></li>)}
          </ul>
        </section>
      )}
      {limits.length > 0 && (
        <div className="rounded-2xl border border-dashed border-border px-5 py-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('am_limits_title')}</p>
          <ul className="mt-1 space-y-1">{limits.map(l => <li key={l.id} className="text-sm text-muted-foreground">{l.text}</li>)}</ul>
        </div>
      )}
      {tail.length > 0 && (
        <div className="space-y-3">
          <button type="button" onClick={() => setRest(v => !v)} className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            {rest ? <IconChevronUp size={14} aria-hidden="true" /> : <IconChevronDown size={14} aria-hidden="true" />}{rest ? t('da_hide_rest') : t('da_show_rest')}
          </button>
          {rest && tail.map(([k, ls]) => (
            <section key={k}><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t(`am_section_${k}`)}</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm">{ls.map(l => <li key={l.id}>{l.text}</li>)}</ul></section>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── a tool's own page ────────────────────────────────────────────────── */

function ToolView({ id, lines, changes, focus, states, onSave, onUpload, goView }: {
  id: string; lines: MapLine[]; changes: PlanChange[]; focus: string | null; states: Record<string, SaveState>;
  onSave: (l: MapLine, v: unknown) => void; onUpload: (l: MapLine, f: File) => void; goView: (v: string | null, line?: string) => void;
}) {
  const ls = lines.filter(l => groupOf(l) === `tool:${id}`);
  const head = ls.find(isHead) ?? ls[0];
  useEffect(() => {
    if (!focus) return;
    const h = window.setTimeout(() => document.getElementById(`line-${focus}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 80);
    return () => window.clearTimeout(h);
  }, [focus]);
  if (!head) return <p className="text-sm text-muted-foreground">{t('da_nothing')}</p>;
  const editable = ls.filter(l => l.editable);
  const facts = ls.filter(l => !l.editable && l !== head && !l.id.endsWith(':note'));
  const note = ls.find(l => l.id.endsWith(':note'));
  const mine = changes.filter(c => (c.undo?.line_id ?? c.rebuild?.line_id ?? '').startsWith(`tool:${id}`)).slice(0, 3);
  return (
    <div className="space-y-5">
      <button type="button" onClick={() => goView('all')} className="text-sm text-muted-foreground hover:underline">‹ {t('da_all_title')}</button>
      <div>
        <h2 className="text-lg font-semibold">{toolName(head.about.label, head.about.id)}</h2>
        <p className="text-sm text-muted-foreground">{head.text} <JobBadge lineId={head.id} /></p>
      </div>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
        {editable.map(line => (
          <li key={line.id} id={`line-${line.id}`} className={`px-5 py-3 ${focus === line.id ? 'ring-2 ring-primary/40' : ''}`}>
            <p className="mb-2 text-sm font-medium">{line.text}</p>
            <LineEditor line={line} state={states[line.id] ?? { kind: 'idle' }} onSave={v => onSave(line, v)} onUpload={f => onUpload(line, f)} />
            <StateLine state={states[line.id] ?? { kind: 'idle' }} />
          </li>
        ))}
        {facts.map(line => <li key={line.id} className="px-5 py-2.5 text-sm text-muted-foreground">{line.text}</li>)}
        {note && (
          <li className="px-5 py-2.5"><details className="text-sm"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('am_agent_says')}</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{plainNote(note.text).map((s, i) => <li key={i}>{s}</li>)}</ul></details></li>
        )}
      </ul>
      {mine.length > 0 && (
        <section><h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('da_last_here')}</h3>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">{mine.map(c => <li key={c.version} className="px-5 py-2.5 text-sm">{c.text}<span className="block text-xs text-muted-foreground">{fmtDate(c.at)} · {c.how}</span></li>)}</ul></section>
      )}
    </div>
  );
}

/* ── history ──────────────────────────────────────────────────────────── */

function HistoryView({ changes, onUndo, goView }: { changes: PlanChange[]; onUndo: (c: PlanChange) => void; goView: (v: string | null) => void }) {
  return (
    <div className="space-y-4">
      <button type="button" onClick={() => goView(null)} className="text-sm text-muted-foreground hover:underline">‹ {t('da_title')}</button>
      <h2 className="text-lg font-semibold">{t('da_history_title')}</h2>
      <p className="text-sm text-muted-foreground">{t('da_history_help')}</p>
      <ol className="divide-y divide-border rounded-2xl border border-border bg-card">
        {changes.map(c => (
          <li key={c.version} className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-0.5 px-5 py-3 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
            <span className="text-xs text-muted-foreground">{fmtDate(c.at)}</span>
            <span className={`text-sm ${c.undone ? 'line-through text-muted-foreground' : ''}`}>{c.text}{c.how && <span className="block text-xs text-muted-foreground">{c.how}</span>}</span>
            <span className="justify-self-end">
              {c.undone ? <span className="text-xs text-muted-foreground">{t('da_undone')}</span>
                : c.undo ? <Button type="button" size="sm" variant="ghost" onClick={() => onUndo(c)} className="text-primary">{t('da_undo')}</Button>
                : c.rebuild ? <Button type="button" size="sm" variant="outline" onClick={() => onUndo(c)} className="gap-1"><IconClock size={14} aria-hidden="true" />{t('da_rebuild')}</Button>
                : null}
            </span>
          </li>
        ))}
        {changes.length === 0 && <li className="px-5 py-3 text-sm text-muted-foreground">—</li>}
      </ol>
    </div>
  );
}

/* ── shared pieces ────────────────────────────────────────────────────── */

function StateLine({ state }: { state: SaveState }) {
  if (state.kind === 'saving') return <p className="text-xs text-muted-foreground">{t('am_saving')}</p>;
  if (state.kind === 'error') return <p role="alert" className="flex items-center gap-1 text-xs text-destructive"><IconAlertCircle size={14} aria-hidden="true" />{state.message}</p>;
  return null;
}

function JobBadge({ lineId, block }: { lineId: string; block?: boolean }) {
  const jobs = useContext(JobsContext);
  const job = jobFor(jobs, lineId);
  if (!job || job.status === 'done') return null;
  const running = job.status === 'running';
  return (
    <span className={`${block ? 'mt-2 block' : 'ml-1 inline-flex'} items-center gap-1 text-xs`}>
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold ${running ? 'bg-secondary text-secondary-foreground' : 'bg-destructive/10 text-destructive'}`}>
        {running && <span className="h-2 w-2 animate-pulse rounded-full bg-current" aria-hidden="true" />}{running ? t('da_remaining', { n: remainingMinutes(job) }) : t('am_job_failed')}
      </span>
      {!running && job.error && <span className="ml-1 text-muted-foreground">{String(job.error).slice(0, 160)}</span>}
    </span>
  );
}

function DecisionRow({ line, state, onSave, onUpload, onFits }: { line: MapLine; state: SaveState; onSave: (v: unknown) => void; onUpload: (f: File) => void; onFits: () => void }) {
  const [edit, setEdit] = useState(false);
  const busy = state.kind === 'saving';
  const e = line.editable;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1"><p className="text-sm font-medium">{line.text}</p><p className="text-sm text-muted-foreground">{line.assumed || '—'}</p></div>
        {e && e.ready && !edit && (
          <div className="flex gap-1">
            {!line.answered && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={onFits}>{t('am_fits')}</Button>}
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setEdit(true)}>{t('am_change')}</Button>
          </div>
        )}
      </div>
      {edit && e && e.ready && <LineEditor line={line} state={state} onSave={v => { onSave(v); setEdit(false); }} onUpload={f => { onUpload(f); setEdit(false); }} />}
      <JobBadge lineId={line.id} block />
      <StateLine state={state} />
    </div>
  );
}

/** The editor plus the rule that protects the owner: a slow channel asks „Umbauen lassen · ca. 3 Min.“ first, a file is chosen before anything starts, a running job blocks a second order. */
function LineEditor({ line, state, onSave, onUpload }: { line: MapLine; state: SaveState; onSave: (v: unknown) => void; onUpload: (f: File) => void }) {
  const e = line.editable!;
  const jobs = useContext(JobsContext);
  const [pending, setPending] = useState<unknown>(undefined);
  const [file, setFile] = useState<File | null>(null);
  useEffect(() => { setPending(undefined); setFile(null); }, [line.id, e.value]);
  const slow = SLOW.includes(e.channel);
  const job = jobFor(jobs, line.id);
  const blocked = job?.status === 'running';
  const busy = state.kind === 'saving' || blocked;
  const name = line.about?.label ? toolName(line.about.label, line.about.id) : line.about?.id ?? '';
  const armed = pending !== undefined || file !== null;
  const go = () => { if (file) { onUpload(file); setFile(null); } else if (pending !== undefined) { onSave(pending); setPending(undefined); } };
  return (
    <div className="space-y-2">
      <Editor line={line} onSave={v => (slow ? setPending(v) : onSave(v))} onPickFile={f => (slow ? setFile(f) : onUpload(f))} pickedFile={file} busy={busy} pending={pending} />
      {slow && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t(e.channel === 'tool' ? 'am_confirm_tool' : 'am_confirm_page', { name })}</p>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy || !armed} onClick={go} className="gap-1"><IconClock size={14} aria-hidden="true" />{t('am_confirm_go')}</Button>
            {armed && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => { setPending(undefined); setFile(null); }}>{t('am_confirm_cancel')}</Button>}
          </div>
        </div>
      )}
      {!slow && <p className="text-xs text-muted-foreground">{t('da_instant_hint')}</p>}
      {blocked && <p className="text-xs text-muted-foreground">{t('am_job_blocked')}</p>}
    </div>
  );
}

function UploadControl({ busy, picked, onPick }: { busy: boolean; picked: File | null; onPick: (f: File) => void }) {
  if (picked) return <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">📎 {picked.name}</span>;
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground">
      <IconUpload size={16} aria-hidden="true" />{t('am_upload')}
      <input type="file" className="sr-only" disabled={busy} onChange={ev => { const f = ev.target.files?.[0]; if (f) onPick(f); ev.target.value = ''; }} />
    </label>
  );
}

function Editor({ line, onSave, onPickFile, pickedFile, busy, pending }: { line: MapLine; onSave: (v: unknown) => void; onPickFile: (f: File) => void; pickedFile: File | null; busy: boolean; pending?: unknown }) {
  const e = line.editable!;
  if (e.kind === 'option' && e.options) {
    const current = pending !== undefined ? String(pending) : String(e.value);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={line.text}>
          {e.options.map(o => {
            const active = current === o.value;
            return (
              <label key={o.value} className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${active ? 'border-primary bg-primary/10' : 'border-border'}`}>
                <input type="radio" name={line.id} value={o.value} checked={active} disabled={busy} onChange={() => onSave(o.value)} className="accent-primary" />{o.label}
              </label>
            );
          })}
        </div>
        {e.file && <UploadControl busy={busy} picked={pickedFile} onPick={onPickFile} />}
      </div>
    );
  }
  if (e.kind === 'option' || e.kind === 'text' || e.kind === 'rule') return <TextEditor id={line.id} initial={String(e.value ?? '')} multiline={e.kind === 'rule'} busy={busy} onSave={onSave} />;
  if (e.kind === 'schedule') return <ScheduleEditor id={line.id} value={String(e.value ?? '')} busy={busy} onSave={onSave} />;
  if (e.kind === 'filter') return <FilterEditor line={line} busy={busy} onSave={onSave} />;
  if (e.kind === 'file') return <UploadControl busy={busy} picked={pickedFile} onPick={onPickFile} />;
  return null;
}

function TextEditor({ id, initial, multiline, busy, onSave }: { id: string; initial: string; multiline: boolean; busy: boolean; onSave: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  useEffect(() => { setValue(initial); }, [initial]);
  const changed = value.trim() !== initial.trim();
  return (
    <form className="flex flex-wrap items-start gap-2" onSubmit={ev => { ev.preventDefault(); if (changed) onSave(value.trim()); }}>
      {multiline ? <textarea id={`${id}-input`} value={value} onChange={ev => setValue(ev.target.value)} rows={3} disabled={busy} className="min-w-[16rem] flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        : <Input id={`${id}-input`} value={value} onChange={ev => setValue(ev.target.value)} disabled={busy} className="min-w-[12rem] flex-1" />}
      <Button type="submit" size="sm" variant="outline" disabled={!changed || busy}>{t('da_take')}</Button>
    </form>
  );
}

function ScheduleEditor({ id, value, busy, onSave }: { id: string; value: string; busy: boolean; onSave: (v: string) => void }) {
  const known = SCHEDULE_PRESETS.some(p => p.value === value);
  const [custom, setCustom] = useState(value);
  useEffect(() => { setCustom(value); }, [value]);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select id={`${id}-preset`} value={known ? value : 'custom'} disabled={busy} onChange={ev => { if (ev.target.value !== 'custom') onSave(ev.target.value); }} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
        {SCHEDULE_PRESETS.map(p => <option key={p.value} value={p.value}>{p.label()}</option>)}<option value="custom">{t('am_custom')}</option>
      </select>
      <form className="flex items-center gap-2" onSubmit={ev => { ev.preventDefault(); if (custom.trim() && custom.trim() !== value) onSave(custom.trim()); }}>
        <Input id={`${id}-cron`} value={custom} onChange={ev => setCustom(ev.target.value)} disabled={busy} className="w-40 font-mono" aria-label="crontab" />
        <Button type="submit" size="sm" variant="outline" disabled={busy || !custom.trim() || custom.trim() === value}>{t('da_take')}</Button>
      </form>
    </div>
  );
}

function FilterEditor({ line, busy, onSave }: { line: MapLine; busy: boolean; onSave: (v: FilterValue) => void }) {
  const e = line.editable!;
  const fields = e.fields ?? [];
  const initial = (e.value as FilterValue | null) ?? { mode: 'all', conditions: [] };
  const [mode, setMode] = useState<'all' | 'any'>(initial.mode === 'any' ? 'any' : 'all');
  const [conds, setConds] = useState<FilterCondition[]>(initial.conditions ?? []);
  useEffect(() => { setMode(initial.mode === 'any' ? 'any' : 'all'); setConds(initial.conditions ?? []); }, [e.value]);  // eslint-disable-line react-hooks/exhaustive-deps
  const fieldOf = (key: string) => fields.find(f => f.key === key);
  const update = (i: number, patch: Partial<FilterCondition>) => setConds(cs => cs.map((c, k) => (k === i ? { ...c, ...patch } : c)));
  const remove = (i: number) => setConds(cs => cs.filter((_, k) => k !== i));
  const add = () => setConds(cs => [...cs, { field: fields[0]?.key ?? '', op: 'eq', value: fields[0]?.options?.[0]?.value ?? '' }]);
  const dirty = JSON.stringify({ mode, conditions: conds }) !== JSON.stringify({ mode: initial.mode ?? 'all', conditions: initial.conditions ?? [] });
  return (
    <div className="space-y-2">
      {conds.length > 1 && (
        <select value={mode} disabled={busy} onChange={ev => setMode(ev.target.value as 'all' | 'any')} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
          <option value="all">{t('am_mode_all')}</option><option value="any">{t('am_mode_any')}</option>
        </select>
      )}
      {conds.map((c, i) => {
        const f = fieldOf(c.field);
        const needsValue = c.op !== 'empty' && c.op !== 'not_empty';
        return (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select value={c.field} disabled={busy} onChange={ev => update(i, { field: ev.target.value, value: fieldOf(ev.target.value)?.options?.[0]?.value ?? '' })} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
              {fields.map(fl => <option key={fl.key} value={fl.key}>{fl.label}</option>)}
            </select>
            <select value={c.op} disabled={busy} onChange={ev => update(i, { op: ev.target.value as FilterCondition['op'] })} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
              {OPS.map(op => <option key={op} value={op}>{t(`am_op_${op}`)}</option>)}
            </select>
            {needsValue && f?.options ? (
              <select value={String(c.value ?? '')} disabled={busy} onChange={ev => update(i, { value: ev.target.value })} className="rounded-md border border-input bg-background px-2 py-1 text-sm">
                {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : needsValue ? <Input value={String(c.value ?? '')} disabled={busy} onChange={ev => update(i, { value: f?.type === 'number' ? Number(ev.target.value) : ev.target.value })} className="w-40" /> : null}
            <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => remove(i)} aria-label={t('am_remove')}><IconX size={14} aria-hidden="true" /></Button>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy || fields.length === 0} onClick={add} className="gap-1"><IconPlus size={14} aria-hidden="true" />{t('am_add_condition')}</Button>
        {conds.length > 0 && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setConds([])}>{t('am_all')}</Button>}
        <Button type="button" size="sm" variant="outline" disabled={!dirty || busy} onClick={() => onSave({ mode, conditions: conds })}>{t('da_take')}</Button>
      </div>
    </div>
  );
}
