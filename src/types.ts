export type SourceType = 'email' | 'pdf' | 'xlsx' | 'api'
export type Priority = 'high' | 'medium' | 'low'
export type RuleBasis = 'invariant' | 'structure' | 'company_policy' | 'forbid'

export interface PolicyParams {
  etaReviewHours: number
  minConnectionHours: number
  countConnecting: boolean
  countBerth: boolean
  checkEtbStale: boolean
}

export type ClockCode = 'ETA_SLIP' | 'ETB_STALE' | 'PORT_STAY' | 'CONNECTION' | 'BERTH' | 'CUTOFF'
export type ClockState = 'ok' | 'review' | 'tight' | 'na'

export interface OpsClock {
  code: ClockCode
  label: string
  hours: number | null
  previousHours?: number | null
  thresholdHours: number | null
  state: ClockState
  formula: string
  cite: string
  detail: string
}
export type ExceptionStatus =
  | 'processing'
  | 'open'
  | 'review_required'
  | 'blocked'
  | 'duplicate'
  | 'awaiting_approval'
  | 'partially_approved'
  | 'sent'
  | 'rejected'
  | 'resolved'

export type DraftChannel = 'shipper' | 'inland' | 'internal'
export type DraftStatus = 'draft' | 'edited' | 'approved' | 'rejected' | 'sent'

export type FieldKey =
  | 'vessel'
  | 'voyage'
  | 'imo'
  | 'port'
  | 'unlocode'
  | 'terminal'
  | 'berth'
  | 'eta'
  | 'etb'
  | 'etd'
  | 'cutoff'

export type ImpactStatus = 'review_required' | 'no_update' | 'unchanged' | 'unavailable'
export type AgentKind =
  | 'ingest'
  | 'extract'
  | 'context'
  | 'validate'
  | 'diff'
  | 'exception'
  | 'impact'
  | 'action'
  | 'approval'
  | 'send'

export interface ExtractedField {
  key: FieldKey
  label: string
  value: string
  sourceNote: string
  span?: [number, number]
  verified: boolean
}

export interface ScheduleFields {
  vessel: string
  voyage: string
  imo?: string
  port: string
  unlocode?: string
  terminal: string
  berth: string
  eta: string
  etb?: string
  etd: string
  cutoff?: string
}

export interface VoyageRecord {
  id: string
  vessel: string
  voyage: string
  service: string
  port: string
  terminal: string
  status: 'at_sea' | 'inbound' | 'alongside' | 'departed'
  connectingVoyageId?: string
}

export interface VesselMaster {
  id: string
  name: string
  imo: string
  service: string
  flag: string
}

export interface PartyMaster {
  id: string
  kind: DraftChannel
  name: string
  contact: string
  terminal?: string
}

export interface TerminalMaster {
  code: string
  name: string
  port: string
  turnaroundDays: number
  cite: string
}

export type ProcessKind = 'exception' | 'blocked' | 'duplicate' | 'unchanged' | 'unmatched'

export interface InboxItem {
  id: string
  demoKey?: 'A' | 'B' | 'C'
  receivedAt: string
  sender: string
  subject: string
  sourceType: SourceType
  fileName: string
  body: string
  linkedVoyageId?: string
  status: 'queued' | 'processing' | 'processed' | 'duplicate' | 'failed'
  lastKind?: ProcessKind
  gold?: Partial<ScheduleFields>
}

export interface ProcessRun {
  id: string
  inboxId: string
  at: string
  kind: ProcessKind
  elapsedMs: number
  extractor: 'rules' | 'llm'
  filledFields: number
  changeCount: number
  goldHit?: number
  goldTotal?: number
  exceptionId?: string
  note?: string
}

export interface DiffChange {
  key: FieldKey
  label: string
  previous: string
  next: string
  delta?: string
}

export interface ValidationIssue {
  code: string
  message: string
  field?: FieldKey
}

export interface RuleHit {
  id: string
  rule: string
  action: string
  fired: boolean
  basis: RuleBasis
}

export interface ImpactItem {
  area: string
  status: ImpactStatus
  reason: string
  dataConsidered: string
  nextAction: string
}

export interface AgentTask {
  id: string
  title: string
  status: 'auto_done' | 'draft_ready' | 'pending_human' | 'blocked' | 'done'
  detail: string
}

export interface NotificationDraft {
  id: string
  exceptionId: string
  channel: DraftChannel
  title: string
  body: string
  originalBody?: string
  status: DraftStatus
  editedBy?: string
}

export interface AuditEvent {
  id: string
  at: string
  actor: string
  kind: AgentKind | 'human'
  title: string
  detail: string
}

export interface AgentEvent {
  id: string
  at: string
  engine: string
  title: string
  detail: string
  tone: 'ok' | 'warn' | 'bad' | 'info'
}

export interface ExceptionRecord {
  id: string
  inboxId: string
  voyageId: string
  createdAt: string
  priority: Priority
  reviewRank: number
  reviewHeadline: string
  clocks: OpsClock[]
  status: ExceptionStatus
  summary: string
  fields: ExtractedField[]
  previous: ScheduleFields
  incoming: ScheduleFields
  changes: DiffChange[]
  issues: ValidationIssue[]
  rules: RuleHit[]
  impact: ImpactItem[]
  tasks: AgentTask[]
  duplicateOf?: string
}

export interface ScheduleVersion {
  id: string
  voyageId: string
  at: string
  actor: string
  exceptionId?: string
  fields: ScheduleFields
  note: string
}

export interface SimilarHit {
  id: string
  score: number
  reasons: string[]
  vessel: string
  voyage: string
  summary: string
  status: ExceptionStatus
  createdAt: string
}

export interface DataSource {
  id: string
  name: string
  kind: string
  status: 'connected' | 'available' | 'extension'
  note: string
  prototype: boolean
}

export interface Operator {
  id: string
  name: string
  role: 'ops' | 'approver' | 'admin'
}
