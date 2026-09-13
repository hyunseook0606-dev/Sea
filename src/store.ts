import { create } from 'zustand'
import { clock, DEFAULT_POLICY, duplicateKey, normalizePolicy, nowStamp, processInboxItem } from './engine'
import { filledCount, scoreGold } from './extract'
import { readLlmConfig, resolveExtraction, type LlmConfig } from './llm'
import {
  CONFIRMED,
  DATA_SOURCES,
  INITIAL_INBOX,
  MEMORY_DRAFTS,
  MEMORY_EXCEPTION,
  OPERATOR,
  OPERATORS,
  PARTIES,
  TERMINALS,
  VESSELS,
  VOYAGES,
  initialConfirmedHistory,
} from './seed'
import type {
  AgentEvent,
  AuditEvent,
  DataSource,
  ExceptionRecord,
  InboxItem,
  NotificationDraft,
  Operator,
  PartyMaster,
  ProcessKind,
  ProcessRun,
  PolicyParams,
  ScheduleFields,
  ScheduleVersion,
  TerminalMaster,
  VesselMaster,
  VoyageRecord,
} from './types'

const CHANNEL_KO: Record<string, string> = { shipper: '화주', inland: '내륙', internal: '내부' }

function eid(): string {
  return Math.random().toString(36).slice(2, 9)
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export type Favorite = { path: string; title: string }

const DEFAULT_FAVORITES: Favorite[] = [{ path: '/app', title: '현황' }]

function readFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem('sea-favorites')
    if (!raw) return DEFAULT_FAVORITES
    const parsed = JSON.parse(raw) as Favorite[]
    if (!Array.isArray(parsed)) return DEFAULT_FAVORITES
    return parsed.filter((f) => f && typeof f.path === 'string' && typeof f.title === 'string')
  } catch {
    return DEFAULT_FAVORITES
  }
}

function writeFavorites(items: Favorite[]) {
  try {
    localStorage.setItem('sea-favorites', JSON.stringify(items))
  } catch {
    /* ignore */
  }
}

const DEFAULT_PINS = ['EX-260828-0001']

function readPins(): string[] {
  try {
    const raw = localStorage.getItem('sea-pinned-exceptions')
    if (!raw) return DEFAULT_PINS
    const parsed = JSON.parse(raw) as string[]
    if (!Array.isArray(parsed)) return DEFAULT_PINS
    return parsed.filter((id) => typeof id === 'string')
  } catch {
    return DEFAULT_PINS
  }
}

function writePins(ids: string[]) {
  try {
    localStorage.setItem('sea-pinned-exceptions', JSON.stringify(ids))
  } catch {
    /* ignore */
  }
}

function readPolicy(): PolicyParams {
  try {
    const raw = localStorage.getItem('sea-policy-v2') || localStorage.getItem('sea-policy')
    if (!raw) return DEFAULT_POLICY
    return normalizePolicy(JSON.parse(raw) as Partial<PolicyParams>)
  } catch {
    return DEFAULT_POLICY
  }
}

function writePolicy(policy: PolicyParams) {
  try {
    localStorage.setItem('sea-policy-v2', JSON.stringify(policy))
  } catch {
    /* ignore */
  }
}

interface SeaState {
  operator: Operator
  operators: Operator[]
  voyages: VoyageRecord[]
  vessels: VesselMaster[]
  parties: PartyMaster[]
  terminals: TerminalMaster[]
  confirmed: Record<string, ScheduleFields>
  confirmedHistory: ScheduleVersion[]
  inbox: InboxItem[]
  exceptions: ExceptionRecord[]
  drafts: NotificationDraft[]
  audit: AuditEvent[]
  agentEvents: AgentEvent[]
  dataSources: DataSource[]
  processingInboxId: string | null
  selectedExceptionId: string | null
  seq: number
  processedKeys: string[]
  keyToException: Record<string, string>
  introDone: boolean
  favorites: Favorite[]
  pinnedExceptionIds: string[]
  runs: ProcessRun[]
  llmConfig: LlmConfig
  lastExtractError?: string
  policy: PolicyParams
  toggleFavorite: (item: Favorite) => void
  togglePinException: (id: string) => void
  setIntroDone: () => void
  selectException: (id: string | null) => void
  editDraft: (id: string, body: string) => void
  toggleTask: (exceptionId: string, taskId: string) => void
  approveDraft: (id: string) => void
  rejectDraft: (id: string) => void
  sendException: (exceptionId: string) => { ok: boolean; reason?: string }
  applySimilarDrafts: (targetId: string, sourceId: string) => { ok: boolean; reason?: string }
  resetWorkspace: () => void
  setEtaReviewHours: (hours: number) => void
  setMinConnectionHours: (hours: number) => void
  setPolicyFlag: (key: 'countConnecting' | 'countBerth' | 'checkEtbStale', value: boolean) => void
  addInbox: (item: Pick<InboxItem, 'sender' | 'subject' | 'sourceType' | 'fileName' | 'body'>) => string
  addVoyage: (input: { vessel: string; voyage: string; service: string; port: string; terminal: string; berth: string; eta: string; etd: string; etb?: string; cutoff?: string; connectingVoyageId?: string }) => { ok: boolean; id?: string; reason?: string }
  processInbox: (inboxId: string, opts?: { silent?: boolean }) => Promise<{ exceptionId?: string; kind: string }>
  processQueued: () => Promise<{ n: number }>
  runDemo: (key: 'A' | 'B' | 'C') => Promise<{ exceptionId?: string; kind: string }>
  pushAgent: (partial: Omit<AgentEvent, 'id' | 'at'>) => void
}

function audit(actor: string, title: string, detail: string, kind: AuditEvent['kind'] = 'human'): AuditEvent {
  return { id: eid(), at: nowStamp(), actor, kind, title, detail }
}

let inflight = false

export const useSeaStore = create<SeaState>((set, get) => ({
  operator: OPERATOR,
  operators: OPERATORS,
  voyages: VOYAGES,
  vessels: VESSELS,
  parties: PARTIES,
  terminals: TERMINALS,
  confirmed: CONFIRMED,
  confirmedHistory: initialConfirmedHistory(),
  inbox: INITIAL_INBOX.map((i) => ({ ...i })),
  exceptions: [{ ...MEMORY_EXCEPTION, fields: MEMORY_EXCEPTION.fields.map((f) => ({ ...f })), changes: [...MEMORY_EXCEPTION.changes] }],
  drafts: MEMORY_DRAFTS.map((d) => ({ ...d })),
  audit: [
    audit('SYSTEM', '워크스페이스 기동', 'DEMO LINE 운항 워크스페이스', 'ingest'),
  ],
  agentEvents: [],
  dataSources: DATA_SOURCES,
  processingInboxId: null,
  selectedExceptionId: null,
  seq: 1,
  processedKeys: [],
  keyToException: {},
  introDone: false,
  favorites: readFavorites(),
  pinnedExceptionIds: readPins(),
  runs: [],
  llmConfig: readLlmConfig(),
  policy: readPolicy(),
  setIntroDone: () => set({ introDone: true }),
  togglePinException: (id) => {
    const cur = get().pinnedExceptionIds
    const next = cur.includes(id) ? cur.filter((x) => x !== id) : [id, ...cur]
    writePins(next)
    set({ pinnedExceptionIds: next })
  },
  toggleFavorite: (item) => {
    const path = item.path.replace(/\/$/, '') || '/app'
    if (path.startsWith('/app/favorites')) return
    const cur = get().favorites
    const exists = cur.some((f) => f.path === path)
    const next = exists ? cur.filter((f) => f.path !== path) : [...cur, { path, title: item.title }]
    writeFavorites(next)
    set({ favorites: next })
  },
  selectException: (id) => set({ selectedExceptionId: id }),
  toggleTask: (exceptionId, taskId) => {
    const { operator } = get()
    set((s) => ({
      exceptions: s.exceptions.map((e) => {
        if (e.id !== exceptionId) return e
        return {
          ...e,
          tasks: e.tasks.map((t) => {
            if (t.id !== taskId) return t
            if (t.status === 'blocked' || t.status === 'auto_done') return t
            if (t.status === 'done') return { ...t, status: 'pending_human' as const }
            if (t.status === 'pending_human') return { ...t, status: 'done' as const }
            return t
          }),
        }
      }),
      audit: [audit(operator.id, '확인 항목', `${exceptionId} · ${taskId}`), ...s.audit],
    }))
  },
  editDraft: (id, body) => {
    const { operator } = get()
    set((s) => ({
      drafts: s.drafts.map((d) =>
        d.id === id ? { ...d, body, status: d.status === 'approved' ? d.status : 'edited', editedBy: operator.id } : d,
      ),
      audit: [
        audit(operator.id, '초안 수정', id, 'human'),
        ...s.audit,
      ],
    }))
  },
  approveDraft: (id) => {
    const { operator, drafts } = get()
    const d = drafts.find((x) => x.id === id)
    if (!d) return
    set((s) => {
      const nextDrafts = s.drafts.map((x) => (x.id === id ? { ...x, status: 'approved' as const } : x))
      const related = nextDrafts.filter((x) => x.exceptionId === d.exceptionId)
      const all = related.filter((x) => x.channel !== 'internal').every((x) => x.status === 'approved')
      return {
        drafts: nextDrafts,
        exceptions: s.exceptions.map((e) =>
          e.id === d.exceptionId
            ? { ...e, status: all ? 'awaiting_approval' : 'partially_approved' }
            : e,
        ),
        audit: [audit(operator.id, '초안 승인', `${d.channel} · ${d.exceptionId}`), ...s.audit],
        agentEvents: [
          { id: eid(), at: clock(), engine: '승인', title: `${CHANNEL_KO[d.channel] || d.channel} 승인`, detail: operator.id, tone: 'ok' },
          ...s.agentEvents,
        ],
      }
    })
  },
  rejectDraft: (id) => {
    const { operator } = get()
    set((s) => ({
      drafts: s.drafts.map((d) => (d.id === id ? { ...d, status: 'rejected' } : d)),
      exceptions: s.exceptions.map((e) => {
        const d = s.drafts.find((x) => x.id === id)
        return d && e.id === d.exceptionId ? { ...e, status: 'rejected' } : e
      }),
      audit: [audit(operator.id, '초안 반려', id), ...s.audit],
    }))
  },
  sendException: (exceptionId) => {
    const { drafts, exceptions, operator } = get()
    const ex = exceptions.find((e) => e.id === exceptionId)
    if (!ex) return { ok: false, reason: '예외 없음' }
    if (!ex.voyageId) return { ok: false, reason: '항차 미매칭 · 발송 불가' }
    if (ex.status === 'blocked') return { ok: false, reason: '검증 실패 · 발송 차단' }
    const related = drafts.filter((d) => d.exceptionId === exceptionId)
    const need = related.filter((d) => d.channel === 'shipper' || d.channel === 'inland')
    if (need.some((d) => d.status !== 'approved')) {
      return { ok: false, reason: '화주·내륙 채널 승인 전에는 발송할 수 없습니다' }
    }
    set((s) => ({
      drafts: s.drafts.map((d) => (d.exceptionId === exceptionId && d.status === 'approved' ? { ...d, status: 'sent' } : d)),
      exceptions: s.exceptions.map((e) => (e.id === exceptionId ? { ...e, status: 'sent' } : e)),
      confirmed: {
        ...s.confirmed,
        [ex.voyageId]: ex.incoming,
      },
      confirmedHistory: [
        {
          id: eid(),
          voyageId: ex.voyageId,
          at: nowStamp(),
          actor: operator.id,
          exceptionId: ex.id,
          fields: { ...ex.incoming },
          note: '통보 발송 · 확정본 갱신',
        },
        ...s.confirmedHistory,
      ],
      audit: [audit(operator.id, '통보 발송', exceptionId, 'send'), ...s.audit],
      agentEvents: [
        { id: eid(), at: clock(), engine: '발송', title: '발송 완료', detail: exceptionId, tone: 'ok' },
        ...s.agentEvents,
      ],
    }))
    return { ok: true }
  },
  applySimilarDrafts: (targetId, sourceId) => {
    const { operator, drafts, exceptions } = get()
    const target = exceptions.find((e) => e.id === targetId)
    if (!target) return { ok: false, reason: '예외 없음' }
    if (target.status === 'blocked' || target.status === 'sent') return { ok: false, reason: '이 전표에는 문장을 적용할 수 없습니다' }
    const source = drafts.filter((d) => d.exceptionId === sourceId)
    const dest = drafts.filter((d) => d.exceptionId === targetId)
    if (!dest.length) return { ok: false, reason: '이 전표에 초안이 없습니다' }
    if (!source.length) return { ok: false, reason: '불러올 승인 문장이 없습니다' }
    set((s) => ({
      drafts: s.drafts.map((d) => {
        if (d.exceptionId !== targetId || d.status === 'sent') return d
        const from = source.find((x) => x.channel === d.channel)
        if (!from) return d
        return { ...d, body: from.body, status: 'edited' as const, editedBy: operator.id }
      }),
      audit: [audit(operator.id, '유사 예외 문장 적용', `${sourceId} → ${targetId}`), ...s.audit],
    }))
    return { ok: true }
  },
  pushAgent: (partial) =>
    set((s) => ({
      agentEvents: [{ id: eid(), at: clock(), ...partial }, ...s.agentEvents].slice(0, 80),
    })),
  resetWorkspace: () =>
    set({
      inbox: INITIAL_INBOX.map((i) => ({ ...i })),
      exceptions: [{ ...MEMORY_EXCEPTION, fields: MEMORY_EXCEPTION.fields.map((f) => ({ ...f })), changes: [...MEMORY_EXCEPTION.changes] }],
      drafts: MEMORY_DRAFTS.map((d) => ({ ...d })),
      audit: [audit('SYSTEM', '워크스페이스 기동', 'DEMO LINE 운항 워크스페이스', 'ingest')],
      agentEvents: [],
      processingInboxId: null,
      selectedExceptionId: null,
      seq: 1,
      processedKeys: [],
      keyToException: {},
      confirmed: { ...CONFIRMED },
      voyages: VOYAGES.map((v) => ({ ...v })),
      confirmedHistory: initialConfirmedHistory(),
      runs: [],
      lastExtractError: undefined,
    }),
  setEtaReviewHours: (hours) => {
    const policy = normalizePolicy({ ...get().policy, etaReviewHours: hours })
    writePolicy(policy)
    set({ policy })
  },
  setMinConnectionHours: (hours) => {
    const policy = normalizePolicy({ ...get().policy, minConnectionHours: hours })
    writePolicy(policy)
    set({ policy })
  },
  setPolicyFlag: (key, value) => {
    const policy = normalizePolicy({ ...get().policy, [key]: value })
    writePolicy(policy)
    set({ policy })
  },
  addInbox: (item) => {
    const id = `IN-${eid().toUpperCase()}`
    const next: InboxItem = {
      id,
      receivedAt: nowStamp(),
      sender: item.sender,
      subject: item.subject,
      sourceType: item.sourceType,
      fileName: item.fileName,
      body: item.body,
      status: 'queued',
    }
    set((s) => ({
      inbox: [next, ...s.inbox],
      audit: [audit(s.operator.id, '수신 등록', `${id} · ${item.subject}`, 'ingest'), ...s.audit],
    }))
    return id
  },
  addVoyage: (input) => {
    const vessel = input.vessel.trim()
    const voyage = input.voyage.trim()
    if (!vessel || !voyage) return { ok: false, reason: '선박·항차가 필요합니다' }
    if (get().voyages.some((v) => v.voyage.toUpperCase() === voyage.toUpperCase() && v.vessel.toUpperCase() === vessel.toUpperCase())) {
      return { ok: false, reason: '같은 선박·항차가 이미 있습니다' }
    }
    const id = `V-${vessel.replace(/\s+/g, '').toUpperCase()}-${voyage.toUpperCase()}`
    const record: VoyageRecord = {
      id,
      vessel,
      voyage,
      service: input.service.trim() || '—',
      port: input.port.trim() || 'BUSAN',
      terminal: input.terminal.trim() || 'PNC',
      status: 'inbound',
      connectingVoyageId: input.connectingVoyageId || undefined,
    }
    const fields: ScheduleFields = {
      vessel,
      voyage,
      port: record.port,
      unlocode: 'KRPUS',
      terminal: record.terminal,
      berth: input.berth.trim(),
      eta: input.eta.trim(),
      etb: input.etb?.trim() || undefined,
      etd: input.etd.trim(),
      cutoff: input.cutoff?.trim() || undefined,
    }
    set((s) => ({
      voyages: [record, ...s.voyages],
      confirmed: { ...s.confirmed, [id]: fields },
      confirmedHistory: [
        { id: eid(), voyageId: id, at: nowStamp(), actor: s.operator.id, fields, note: '항차 등록' },
        ...s.confirmedHistory,
      ],
      audit: [audit(s.operator.id, '항차 등록', `${vessel} ${voyage}`), ...s.audit],
    }))
    return { ok: true, id }
  },
  processInbox: async (inboxId, opts) => {
    if (inflight) return { kind: 'busy' }
    inflight = true
    try {
      return await runInbox(get, set, inboxId, opts)
    } finally {
      inflight = false
    }
  },
  processQueued: async () => {
    if (inflight) return { n: 0 }
    inflight = true
    try {
      const ids = get()
        .inbox.filter((i) => i.status === 'queued')
        .map((i) => i.id)
      for (const id of ids) {
        await runInbox(get, set, id, { silent: true })
      }
      return { n: ids.length }
    } finally {
      inflight = false
    }
  },
  runDemo: async (key) => {
    if (inflight) return { kind: 'busy' }
    if (key === 'A') get().resetWorkspace()
    if (key === 'C') {
      const a = get().inbox.find((i) => i.demoKey === 'A')
      if (a && a.status === 'queued') await get().processInbox(a.id)
    }
    const item = get().inbox.find((i) => i.demoKey === key)
    if (!item) return { kind: 'failed' }
    return get().processInbox(item.id)
  },
}))

async function runInbox(
  get: () => SeaState,
  set: (partial: Partial<SeaState> | ((s: SeaState) => Partial<SeaState>)) => void,
  inboxId: string,
  opts?: { silent?: boolean },
): Promise<{ exceptionId?: string; kind: string }> {
  const silent = Boolean(opts?.silent)
  const state = get()
  const item = state.inbox.find((i) => i.id === inboxId)
  if (!item || item.status === 'processing') return { kind: 'failed' }
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now()
  set({
    processingInboxId: inboxId,
    lastExtractError: undefined,
    inbox: get().inbox.map((i) => (i.id === inboxId ? { ...i, status: 'processing' } : i)),
    agentEvents: silent ? get().agentEvents : [],
  })
  const extracted = await resolveExtraction(item.body, item.receivedAt, 'rules', get().llmConfig)
  if (extracted.error) set({ lastExtractError: extracted.error })
  if (!silent) {
    const steps: Array<Omit<AgentEvent, 'id' | 'at'>> = [
      { engine: '수신', title: '스케줄 자료 수신', detail: item.fileName, tone: 'info' },
      { engine: '추출', title: '문서 추출', detail: `${filledCount(extracted.fields)}개 필드`, tone: 'ok' },
      { engine: '맥락', title: '운항 맥락 연결', detail: '직전 확정본 · 연결 항차', tone: 'ok' },
      { engine: '비교', title: '변경 비교', detail: '직전 확정본 대비', tone: 'ok' },
      { engine: '예외', title: '예외 판정', detail: '규칙', tone: 'ok' },
      { engine: '영향', title: '확인 항목 생성', detail: '확인 필요', tone: 'warn' },
      { engine: '초안', title: '초안 준비', detail: '미발송', tone: 'ok' },
    ]
    for (const step of steps) {
      await sleep(120)
      get().pushAgent(step)
    }
  } else {
    get().pushAgent({
      engine: '추출',
      title: item.subject,
      detail: '문서 추출',
      tone: 'ok',
    })
  }

  const result = processInboxItem({
    item,
    voyages: get().voyages,
    confirmed: get().confirmed,
    existingKeys: get().processedKeys,
    seq: get().seq,
    extracted: extracted.fields,
    policy: get().policy,
  })
  const drafts = result.drafts

  const elapsedMs = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0)
  const gold = scoreGold(extracted.fields, item.gold)
  const kind = result.kind as ProcessKind
  const run: ProcessRun = {
    id: eid(),
    inboxId,
    at: nowStamp(),
    kind,
    elapsedMs,
    extractor: extracted.extractor,
    filledFields: filledCount(extracted.fields),
    changeCount: result.exception?.changes.length || 0,
    goldHit: gold.total ? gold.hit : undefined,
    goldTotal: gold.total || undefined,
    exceptionId: result.exception?.id,
    note: extracted.error,
  }

  if (result.kind === 'duplicate') {
    const existingId = get().keyToException[result.duplicateOf || '']
    set((s) => ({
      processingInboxId: null,
      seq: s.seq + 1,
      inbox: s.inbox.map((i) => (i.id === inboxId ? { ...i, status: 'duplicate', lastKind: 'duplicate' } : i)),
      runs: [run, ...s.runs],
      audit: [audit('SEA', '중복 예외 억제', item.subject, 'exception'), ...s.audit],
      selectedExceptionId: existingId || s.selectedExceptionId,
      agentEvents: [
        {
          id: eid(),
          at: clock(),
          engine: '예외',
          title: '중복 감지',
          detail: existingId ? `기존 ${existingId}와 동일 변경 키` : '동일 변경 · 새 예외 없음',
          tone: 'info',
        },
        ...s.agentEvents,
      ],
    }))
    return { kind: 'duplicate', exceptionId: existingId }
  }

  if (result.kind === 'unchanged') {
    set((s) => ({
      processingInboxId: null,
      seq: s.seq + 1,
      inbox: s.inbox.map((i) => (i.id === inboxId ? { ...i, status: 'processed', lastKind: 'unchanged' } : i)),
      processedKeys: result.key && !s.processedKeys.includes(result.key) ? [...s.processedKeys, result.key] : s.processedKeys,
      runs: [run, ...s.runs],
      audit: [audit('SEA', '변경 없음 · 예외 미생성', item.subject, 'diff'), ...s.audit],
      agentEvents: [
        { id: eid(), at: clock(), engine: '비교', title: '확정본과 동일', detail: item.subject, tone: 'info' },
        ...s.agentEvents,
      ],
    }))
    return { kind: 'unchanged' }
  }

  if (!result.exception) {
    set((s) => ({
      processingInboxId: null,
      inbox: s.inbox.map((i) => (i.id === inboxId ? { ...i, status: 'failed' } : i)),
      runs: [run, ...s.runs],
    }))
    return { kind: 'failed' }
  }

  const ex = result.exception
  const key = result.key || duplicateKey(ex.incoming)
  const title =
    result.kind === 'blocked' ? '검증 실패 · 발송 차단' : result.kind === 'unmatched' ? '항차 미매칭' : '예외 생성'
  set((s) => ({
    processingInboxId: null,
    seq: s.seq + 1,
    inbox: s.inbox.map((i) => (i.id === inboxId ? { ...i, status: 'processed', lastKind: result.kind } : i)),
    exceptions: [ex, ...s.exceptions],
    drafts: [...(drafts || []), ...s.drafts],
    processedKeys: key ? [...s.processedKeys, key] : s.processedKeys,
    keyToException: key ? { ...s.keyToException, [key]: ex.id } : s.keyToException,
    selectedExceptionId: ex.id,
    runs: [{ ...run, exceptionId: ex.id }, ...s.runs],
    audit: [audit('SEA', title, ex.id, 'exception'), ...s.audit],
    agentEvents: [
      {
        id: eid(),
        at: clock(),
        engine: result.kind === 'blocked' ? '검증' : result.kind === 'unmatched' ? '맥락' : '초안',
        title: result.kind === 'blocked' ? '자동 발송 차단' : result.kind === 'unmatched' ? '마스터 없음' : '초안 준비',
        detail: ex.summary,
        tone: result.kind === 'blocked' ? 'bad' : result.kind === 'unmatched' ? 'warn' : 'ok',
      },
      ...s.agentEvents,
    ],
  }))
  return { kind: result.kind, exceptionId: ex.id }
}
