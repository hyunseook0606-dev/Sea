import { fieldsFromLlmJson } from './extract'
import type { ExtractedField, FieldKey, NotificationDraft, ScheduleFields } from './types'

/** Optional hosted-model adapter. Not the default extractor. */
export type LlmConfig = {
  baseUrl: string
  apiKey: string
  model: string
}

const STORAGE = 'sea-llm'

export const DEFAULT_LLM: LlmConfig = {
  baseUrl: 'https://openrouter.ai/api/v1',
  apiKey: '',
  model: 'openai/gpt-4o-mini',
}

export function readLlmConfig(): LlmConfig {
  try {
    const raw = localStorage.getItem(STORAGE)
    if (!raw) return DEFAULT_LLM
    const parsed = JSON.parse(raw) as Partial<LlmConfig>
    return {
      baseUrl: parsed.baseUrl || DEFAULT_LLM.baseUrl,
      apiKey: parsed.apiKey || '',
      model: parsed.model || DEFAULT_LLM.model,
    }
  } catch {
    return DEFAULT_LLM
  }
}

export function writeLlmConfig(cfg: LlmConfig) {
  localStorage.setItem(STORAGE, JSON.stringify(cfg))
}

const EXTRACT_KEYS: FieldKey[] = ['vessel', 'voyage', 'imo', 'port', 'unlocode', 'terminal', 'berth', 'eta', 'etb', 'etd', 'cutoff']

function endpoint(baseUrl: string) {
  const base = baseUrl.replace(/\/$/, '')
  if (base.endsWith('/chat/completions')) return base
  return `${base}/chat/completions`
}

async function chatJson(cfg: LlmConfig, system: string, user: string): Promise<unknown> {
  const res = await fetch(endpoint(cfg.baseUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text.slice(0, 240) || `LLM HTTP ${res.status}`)
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('LLM 응답이 비었습니다')
  return JSON.parse(content)
}

export async function extractWithLlm(body: string, receivedAt: string | undefined, cfg: LlmConfig): Promise<ExtractedField[]> {
  const raw = (await chatJson(
    cfg,
    'You extract vessel schedule fields from shipping emails or spreadsheets. Reply JSON only. Use empty string when unknown. Do not invent CY cut-off from ETA. Times as YYYY-MM-DD HH:mm LT when a date is known.',
    `receivedAt: ${receivedAt || ''}\n---\n${body}\n---\nReturn JSON keys: ${EXTRACT_KEYS.join(', ')}`,
  )) as Record<string, string>
  return fieldsFromLlmJson(raw, body)
}

export async function draftWithLlm(
  exceptionId: string,
  prev: ScheduleFields,
  next: ScheduleFields,
  cfg: LlmConfig,
): Promise<NotificationDraft[] | null> {
  try {
    const raw = (await chatJson(
      cfg,
      'Write three Korean notice drafts for a liner ops team. JSON keys: shipper, inland, internal. Do not invent cut-off if it did not change. Do not decide transhipment. Mark each as 초안, 승인 전 미발송.',
      JSON.stringify({ previous: prev, incoming: next }),
    )) as Record<string, string>
    const channels = [
      ['shipper', '화주 통보 초안'],
      ['inland', '내륙 운송 초안'],
      ['internal', '내부 운항 메모'],
    ] as const
    return channels.map(([channel, title]) => ({
      id: `${exceptionId}-${channel}`,
      exceptionId,
      channel,
      title,
      status: 'draft' as const,
      body: (raw[channel] || '').trim(),
      originalBody: (raw[channel] || '').trim(),
    }))
  } catch {
    return null
  }
}
