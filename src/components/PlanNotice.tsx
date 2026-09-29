import { useEffect, useState } from 'react';
import { IconChevronRight } from '@tabler/icons-react';
import { t } from '@/i18n';
import { getAppMap, type AppMapState } from '@/lib/appMap';

/**
 * PlanNotice — the way INTO „Deine Anwendung“ from the overview: while the
 * plan has decisions waiting, a proposal to read or an agent at work, one
 * line above the overview says so and links there. Nothing when there is
 * nothing to do, nothing when the application was never orchestrated.
 */
const MAP_PATH = '#/verwaltung/anwendung';

export function PlanNotice() {
  const [st, setSt] = useState<AppMapState | null>(null);
  useEffect(() => { getAppMap().then(setSt).catch(() => setSt(null)); }, []);
  if (!st?.map) return null;
  const pending = st.map.lines.filter(l => l.section === 'decisions' && !l.answered).length;
  const running = Object.values(st.jobs).filter(j => j.status === 'running').length;
  const proposal = st.proposal?.status === 'ready';
  const parts: string[] = [];
  if (pending) parts.push(t('pn_decisions', { n: pending }));
  if (proposal) parts.push(t('pn_proposal'));
  if (running) parts.push(t('pn_running', { n: running }));
  if (parts.length === 0) return null;
  return (
    <a href={MAP_PATH} className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-2.5 text-sm hover:bg-primary/10" data-plan-notice="">
      <span>{parts.join(' · ')}</span>
      <span className="inline-flex items-center gap-1 font-semibold text-primary">{t('pn_open')}<IconChevronRight size={16} aria-hidden="true" /></span>
    </a>
  );
}
