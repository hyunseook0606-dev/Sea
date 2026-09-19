export type CostStatus = 'matched' | 'explained' | 'review' | 'suspected' | 'missing_evidence'
export type DocumentType = 'PDA' | 'RDA' | 'FDA' | 'INVOICE' | 'RECEIPT' | 'WORK_LOG' | 'TARIFF' | 'APPROVAL'
export type EventKind = 'schedule_extension' | 'extra_service' | 'berth_extension'

export interface PortCall {
  id: string
  vesselName: string
  imo: string
  port: string
  terminal: string
  berth: string
  eta: string
  etd: string
  status: 'planned' | 'in_progress' | 'departed' | 'review' | 'closed'
  currency: 'KRW'
  pdaTotal: number
}

export interface PortEvent {
  id: string
  portCallId: string
  kind: EventKind
  title: string
  detail: string
  occurredAt: string
  costImpact: number
  calculationBasis: string
  enabled: boolean
}

export interface CostItem {
  id: string
  portCallId: string
  code: string
  label: string
  vendor: string
  pdaAmount: number
  baseActualAmount: number
  eventId?: string
  status: CostStatus
  varianceReason: string
  evidenceIds: string[]
  tariffRuleId?: string
}

export interface EvidenceDocument {
  id: string
  portCallId: string
  type: DocumentType
  fileName: string
  issuer: string
  receivedAt: string
  isSynthetic: true
  extractionStatus: 'extracted' | 'review'
  fields: number
  confidence: number
}

export interface TariffRule {
  id: string
  name: string
  version: string
  ruleType: 'public_reference' | 'demo_rule'
  effectiveFrom: string
  effectiveTo: string
  formula: string
  source: string
}

export interface ReviewIssue {
  id: string
  costItemId: string
  type: 'missing_evidence' | 'duplicate' | 'calculation' | 'tariff' | 'approval'
  severity: 'high' | 'medium' | 'low'
  message: string
  recommendedAction: string
  resolved: boolean
}
