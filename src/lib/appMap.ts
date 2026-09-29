// Owner-facing client for the application map (same-origin /claude/orchestrate):
// what the built application DOES, line by line, and the one call that
// changes a line on the running application through its channel.

const APPGROUP_ID = '6abbe2c1ed4add96dc6f57c5';
const BASE = '/claude/orchestrate';

export type LineSource = { kind: 'plan' | 'tool_metadata' | 'tool_listing' | 'planner' | 'agent_note'; path: string };
export type LineChannel = 'policy' | 'trigger' | 'tool' | 'page' | 'plan';

export interface FilterCondition {
  field: string;
  op: 'eq' | 'ne' | 'in' | 'not_in' | 'gt' | 'gte' | 'lt' | 'lte' | 'empty' | 'not_empty';
  value?: unknown;
}

export interface FilterValue {
  mode?: 'all' | 'any';
  conditions: FilterCondition[];
}

export interface FilterField {
  key: string;
  label: string;
  type: string;
  options?: { value: string; label: string }[];
}

export interface LineEditable {
  kind: 'option' | 'text' | 'rule' | 'filter' | 'schedule' | 'file';
  /** a template question: the line takes a file as well as (or instead of) an option */
  file?: boolean;
  value: unknown;
  options?: { value: string; label: string }[] | null;
  channel: LineChannel;
  ready: boolean;
  /** filter lines: the entity's fields for the condition editor */
  fields?: FilterField[];
  entity?: string;
}

export interface MapLine {
  id: string;
  section: 'about' | 'intents' | 'tools' | 'decisions' | 'structure' | 'limits' | 'platform' | 'roles';
  about: { kind: string; id: string; label?: string };
  text: string;
  source: LineSource;
  editable: LineEditable | null;
  /** decisions: what the planner assumed */
  assumed?: string;
  topic?: string | null;
  /** decisions: the owner has confirmed or changed it — the stack no longer shows it */
  answered?: boolean;
  /** decisions: important ones are cards on the stack, minor ones a list of assumptions */
  weight?: 'important' | 'minor';
  /** decisions: the owner saw this minor assumption where it first acted */
  seen?: boolean;
  /** the plan fragment this sentence is rendered from (compact JSON) — one plan, two views */
  fragment?: string | null;
}

/** What an owner's change set in motion on a line, and how it ended. */
export interface LineJob {
  id: string;
  line_id: string;
  kind: 'tool' | 'page';
  text: string;
  about?: string | null;
  status: 'running' | 'done' | 'failed';
  /** the value the order carried — „Nochmal“ sends it again */
  value?: unknown;
  started_at: string;
  finished_at?: string | null;
  note?: string | null;
  error?: string | null;
}

/** One line of the plan's story: version, when, the sentence, its effect. */
export interface PlanChange {
  version: number;
  at: string;
  text: string;
  how: string;
  kind: 'build' | 'decision' | 'value' | 'delta' | 'undo';
  /** present when „Zurück auf vorher“ can re-apply it here — instant channels and „Passt“ only */
  undo?: { line_id: string; value?: unknown; unconfirm?: boolean } | null;
  /** present after agent work: „Zurückbauen · einige Minuten“ sends the old value as a new order */
  rebuild?: { line_id: string; value?: unknown } | null;
  undone?: boolean;
}

export interface ProposalItem {
  tag: 'add' | 'change' | 'remove' | 'keep';
  id: string;
  text: string;
  before?: string | null;
  why: string;
}

/** „Was soll anders sein?“ — the planner's answer to the owner's sentence, before anything happens. */
export interface Proposal {
  id: string;
  wish: string;
  status: 'planning' | 'ready' | 'failed';
  created_at: string;
  summary?: string;
  items?: ProposalItem[];
  effect?: string;
  error?: string;
  seconds?: number;
}

export interface AppMap {
  version: number;
  summary: string;
  lines: MapLine[];
  counts: Record<string, number>;
  editable: number;
  /** the chips under „Was soll anders sein?“ — the planner's, else derived from the plan */
  suggestions?: string[];
}

export interface AppMapState {
  map: AppMap | null;
  report: { counts?: Record<string, number>; ok?: boolean; gates_green?: boolean | null } | null;
  createdAt: string | null;
  planVersion: number;
  changes: PlanChange[];
  proposal: Proposal | null;
  jobs: Record<string, LineJob>;
}

/** The newest job on a line, running first. */
export function jobFor(jobs: Record<string, LineJob>, lineId: string): LineJob | undefined {
  const mine = Object.values(jobs).filter(j => j.line_id === lineId);
  mine.sort((a, b) => (a.status === 'running' ? -1 : 0) - (b.status === 'running' ? -1 : 0) || b.started_at.localeCompare(a.started_at));
  return mine[0];
}

function stateOf(data: Record<string, unknown>): AppMapState {
  return {
    map: (data.map as AppMap | undefined) ?? null,
    report: (data.report as AppMapState['report']) ?? null,
    createdAt: (data.created_at as string | undefined) ?? null,
    planVersion: Number(data.plan_version ?? 1),
    changes: (data.changes as PlanChange[] | undefined) ?? [],
    proposal: (data.proposal as Proposal | null | undefined) ?? null,
    jobs: (data.jobs as Record<string, LineJob> | undefined) ?? {},
  };
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    const d = body?.detail;
    if (typeof d === 'string') return d;
    if (d && typeof d === 'object') return d.message ?? JSON.stringify(d);
  } catch { /* not JSON */ }
  return `${res.status} ${res.statusText}`;
}

let cached: Promise<AppMapState> | null = null;
/** The map once per page load — for blocks that only need to know a line's state (the review's notices). */
export function getAppMapCached(): Promise<AppMapState> {
  if (!cached) cached = getAppMap().catch(e => { cached = null; throw e; });
  return cached;
}

/** The owner saw a minor assumption where it first acted — not shown there again. */
export async function markSeen(lineId: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}/lines/${encodeURIComponent(lineId)}`, {
    method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ seen: true }),
  });
  if (!res.ok) throw new Error(await readError(res));
  cached = null;
}

/** The current map — null when the application was never orchestrated. */
export async function getAppMap(): Promise<AppMapState> {
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}`, { credentials: 'include' });
  if (res.status === 404) return { map: null, report: null, createdAt: null, planVersion: 0, changes: [], proposal: null, jobs: {} };
  if (!res.ok) throw new Error(await readError(res));
  return stateOf(await res.json());
}

export interface AnswerResult {
  line: MapLine | null;
  action: Record<string, unknown> & { channel: LineChannel };
  map: AppMap;
  plan_version?: number;
  changes?: PlanChange[];
}

/** „Was soll anders sein?“: the sentence goes to the planner; the proposal arrives on the next reads. */
export async function proposeChange(text: string): Promise<Proposal> {
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}/changes`, {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()).proposal as Proposal;
}

export interface AcceptResult {
  map: AppMap;
  plan_version: number;
  changes: PlanChange[];
  started: { what: string; id: string; how: string }[];
}

/** „Passt“ on a proposal: the plan grows, only the touched parts are built. */
export async function acceptProposal(id: string): Promise<AcceptResult> {
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}/changes/${encodeURIComponent(id)}/accept`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** „Zurück auf vorher“ on a history entry. */
export async function undoChange(version: number): Promise<AcceptResult> {
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}/changes/undo/${version}`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

export async function rejectProposal(id: string): Promise<void> {
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}/changes/${encodeURIComponent(id)}/reject`, { method: 'POST', credentials: 'include' });
  if (!res.ok) throw new Error(await readError(res));
}

/** Change one line: the plan is updated, the change goes through the line's channel. */
export async function answerLine(lineId: string, value: unknown): Promise<AnswerResult> {
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}/lines/${encodeURIComponent(lineId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** "Passt": the owner keeps the planner's assumption — recorded in the plan, nothing changes on the application. */
export async function confirmLine(lineId: string): Promise<AnswerResult> {
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}/lines/${encodeURIComponent(lineId)}`, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: true }),
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}

/** A template for a tool: the file travels to the actions agent with an order on the existing tool. */
export async function answerLineWithFile(lineId: string, file: File): Promise<AnswerResult> {
  const form = new FormData();
  form.append('file', file, file.name);
  const res = await fetch(`${BASE}/${encodeURIComponent(APPGROUP_ID)}/lines/${encodeURIComponent(lineId)}/file`, {
    method: 'POST',
    credentials: 'include',
    body: form,
  });
  if (!res.ok) throw new Error(await readError(res));
  return res.json();
}
