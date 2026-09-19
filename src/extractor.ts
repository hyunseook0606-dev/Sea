import { extractFromSource } from './extract'
import { extractWithLlm, type LlmConfig } from './llm'
import { extractHybrid, extractWithSea } from './seaExtractor'
import type { ExtractedField } from './types'

/**
 * Maritime schedule information extraction.
 * Implementations are swappable. The ops engine (Diff / Validation / send lock)
 * never lives here.
 *
 * Default runtime path is local (hybrid). A commercial LLM is an optional
 * adapter, not the product.
 */
export type ExtractorId = 'rules' | 'sea' | 'hybrid' | 'llm'
export type LocalExtractorId = 'rules' | 'sea' | 'hybrid'

export const LOCAL_EXTRACTORS: LocalExtractorId[] = ['rules', 'sea', 'hybrid']

export const EXTRACTOR_LABEL: Record<ExtractorId, string> = {
  rules: '규칙 베이스라인',
  sea: 'SEA Extractor',
  hybrid: '하이브리드',
  llm: '외부 LLM (선택)',
}

export type ExtractionInput = {
  body: string
  receivedAt?: string
}

export type ExtractionResult = {
  fields: ExtractedField[]
  extractor: ExtractorId
  error?: string
}

export interface ScheduleExtractor {
  readonly id: ExtractorId
  readonly label: string
  extract(input: ExtractionInput): Promise<ExtractionResult>
}

const MODE_KEY = 'sea-extractor'

export function readExtractorMode(): ExtractorId {
  const raw = typeof localStorage === 'undefined' ? null : localStorage.getItem(MODE_KEY)
  if (raw === 'rules' || raw === 'sea' || raw === 'hybrid' || raw === 'llm') return raw
  return 'hybrid'
}

export function writeExtractorMode(mode: ExtractorId) {
  localStorage.setItem(MODE_KEY, mode)
}

export function extractLocal(id: LocalExtractorId, body: string, receivedAt?: string): ExtractedField[] {
  if (id === 'sea') return extractWithSea(body, receivedAt)
  if (id === 'hybrid') return extractHybrid(body, receivedAt)
  return extractFromSource(body, receivedAt)
}

function localAdapter(id: LocalExtractorId): ScheduleExtractor {
  return {
    id,
    label: EXTRACTOR_LABEL[id],
    extract({ body, receivedAt }) {
      return Promise.resolve({ fields: extractLocal(id, body, receivedAt), extractor: id })
    },
  }
}

function llmAdapter(cfg?: LlmConfig): ScheduleExtractor {
  return {
    id: 'llm',
    label: EXTRACTOR_LABEL.llm,
    async extract({ body, receivedAt }) {
      if (!cfg?.apiKey) {
        return {
          fields: extractLocal('hybrid', body, receivedAt),
          extractor: 'hybrid',
          error: '외부 LLM 키 없음 · 하이브리드로 처리',
        }
      }
      try {
        const fields = await extractWithLlm(body, receivedAt, cfg)
        return { fields, extractor: 'llm' }
      } catch (err) {
        return {
          fields: extractLocal('hybrid', body, receivedAt),
          extractor: 'hybrid',
          error: err instanceof Error ? err.message : 'LLM 실패 · 하이브리드로 처리',
        }
      }
    },
  }
}

/** Resolve a named extractor. Unknown ids fall back to hybrid, never to a hosted LLM. */
export function getExtractor(id: ExtractorId, llm?: LlmConfig): ScheduleExtractor {
  if (id === 'llm') return llmAdapter(llm)
  if (id === 'sea' || id === 'rules' || id === 'hybrid') return localAdapter(id)
  return localAdapter('hybrid')
}

export async function resolveExtraction(
  body: string,
  receivedAt: string | undefined,
  mode: ExtractorId,
  llm?: LlmConfig,
): Promise<ExtractionResult> {
  return getExtractor(mode, llm).extract({ body, receivedAt })
}
