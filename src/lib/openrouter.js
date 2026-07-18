/**
 * Cliente OpenRouter para SafeMine:
 * - Transcrição: openai/gpt-4o-mini-transcribe (+ fallback whisper)
 * - Extração de campos: openai/gpt-4o-mini (chat)
 */

import { MINING_SYSTEM_CONTEXT, STT_DOMAIN_PROMPT } from './miningContext'

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1'
// whisper-1 costuma lidar melhor com webm do browser; mini-transcribe como fallback
const TRANSCRIBE_MODEL = 'openai/whisper-1'
const TRANSCRIBE_FALLBACK = 'openai/gpt-4o-mini-transcribe'
const CHAT_MODEL = 'openai/gpt-4o-mini'

export function getOpenRouterKey() {
  return import.meta.env.VITE_OPENROUTER_API_KEY || ''
}

function authHeaders(json = false) {
  const key = getOpenRouterKey()
  const h = {
    Authorization: `Bearer ${key}`,
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://safemine.app',
    'X-Title': 'SafeMine',
  }
  if (json) h['Content-Type'] = 'application/json'
  return h
}

/** Converte Blob de áudio em base64 (sem prefixo data:) */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Falha ao ler áudio'))
        return
      }
      const base64 = result.includes(',') ? result.split(',')[1] : result
      resolve(base64)
    }
    reader.onerror = () => reject(new Error('Falha ao ler áudio'))
    reader.readAsDataURL(blob)
  })
}

/** Mapeia MIME do MediaRecorder para format do OpenRouter */
export function audioFormatFromMime(mime = '') {
  const m = String(mime || '').toLowerCase()
  if (m.includes('webm')) return 'webm'
  if (m.includes('ogg')) return 'ogg'
  if (m.includes('mp4') || m.includes('m4a') || m.includes('aac')) return 'm4a'
  if (m.includes('mpeg') || m.includes('mp3')) return 'mp3'
  if (m.includes('wav')) return 'wav'
  if (m.includes('flac')) return 'flac'
  return 'webm'
}

/**
 * Escolhe o melhor MIME suportado pelo browser para MediaRecorder.
 */
export function pickRecorderMime() {
  if (typeof MediaRecorder === 'undefined') return ''
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ]
  return candidates.find((t) => MediaRecorder.isTypeSupported(t)) || ''
}

/** Extrai texto de respostas STT em formatos variados */
function extractTranscriptText(body) {
  if (!body) return ''
  if (typeof body === 'string') return body.trim()
  if (typeof body.text === 'string') return body.text.trim()
  if (typeof body.transcript === 'string') return body.transcript.trim()
  if (typeof body.output === 'string') return body.output.trim()
  if (typeof body.result === 'string') return body.result.trim()
  // some providers nest under data
  if (body.data) {
    if (typeof body.data === 'string') return body.data.trim()
    if (typeof body.data?.text === 'string') return body.data.text.trim()
  }
  // chat-like
  const content = body.choices?.[0]?.message?.content
  if (typeof content === 'string') return content.trim()
  return ''
}

async function transcribeViaMultipart(blob, model, language) {
  const form = new FormData()
  const format = audioFormatFromMime(blob.type)
  const ext = format === 'm4a' ? 'm4a' : format
  const file = blob instanceof File
    ? blob
    : new File([blob], `recording.${ext}`, { type: blob.type || `audio/${ext}` })

  form.append('file', file)
  form.append('model', model)
  if (language) form.append('language', language)
  form.append('response_format', 'json')
  // Vocabulário de mina a céu aberto (quando o provedor aceitar prompt)
  form.append('prompt', STT_DOMAIN_PROMPT)

  const res = await fetch(`${OPENROUTER_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: authHeaders(false), // browser sets multipart boundary
    body: form,
  })
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

async function transcribeViaJson(blob, model, language) {
  const data = await blobToBase64(blob)
  const format = audioFormatFromMime(blob.type)
  const res = await fetch(`${OPENROUTER_BASE}/audio/transcriptions`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({
      model,
      language,
      prompt: STT_DOMAIN_PROMPT,
      input_audio: { data, format },
    }),
  })
  const body = await res.json().catch(() => ({}))
  return { res, body }
}

/**
 * Transcreve áudio via OpenRouter.
 * Tenta multipart (melhor p/ browser) e cai para JSON base64 + modelo fallback.
 * @returns {{ text: string } | { error: string, code?: string }}
 */
export async function transcribeAudio(blob) {
  const key = getOpenRouterKey()
  if (!key) {
    return { error: 'Chave OpenRouter não configurada (VITE_OPENROUTER_API_KEY).', code: 'no_key' }
  }
  if (!blob || blob.size < 200) {
    return { error: 'Áudio muito curto ou vazio. Grave novamente por alguns segundos.', code: 'empty' }
  }

  const language = 'pt'
  const models = [TRANSCRIBE_MODEL, TRANSCRIBE_FALLBACK]
  let lastError = 'Falha na transcrição'

  try {
    for (const model of models) {
      // 1) multipart
      try {
        const { res, body } = await transcribeViaMultipart(blob, model, language)
        if (res.ok) {
          const text = extractTranscriptText(body)
          if (text) return { text }
          // empty text: try next strategy/model
          lastError = 'Transcrição vazia. Fale mais perto do microfone e grave por mais tempo.'
        } else {
          lastError =
            body?.error?.message ||
            body?.message ||
            `Erro na transcrição (${res.status})`
        }
      } catch (e) {
        lastError = e?.message || 'Falha multipart'
      }

      // 2) JSON base64
      try {
        const { res, body } = await transcribeViaJson(blob, model, language)
        if (res.ok) {
          const text = extractTranscriptText(body)
          if (text) return { text }
          lastError = 'Transcrição vazia. Fale mais perto do microfone e grave por mais tempo.'
        } else {
          lastError =
            body?.error?.message ||
            body?.message ||
            `Erro na transcrição (${res.status})`
        }
      } catch (e) {
        lastError = e?.message || 'Falha JSON'
      }
    }

    return { error: lastError, code: 'api' }
  } catch (err) {
    return { error: err?.message || 'Falha de rede na transcrição.', code: 'network' }
  }
}

/**
 * Chat completion OpenRouter (JSON livre no content).
 * @returns {{ text: string } | { error: string, code?: string }}
 */
export async function chatCompletion(userPrompt, { maxTokens = 1500 } = {}) {
  const key = getOpenRouterKey()
  if (!key) {
    return { error: 'Chave OpenRouter não configurada (VITE_OPENROUTER_API_KEY).', code: 'no_key' }
  }

  try {
    const res = await fetch(`${OPENROUTER_BASE}/chat/completions`, {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        model: CHAT_MODEL,
        max_tokens: maxTokens,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `${MINING_SYSTEM_CONTEXT}\n\nSua tarefa agora é extrair dados de relatos. Responda APENAS com JSON válido, sem markdown e sem comentários.`,
          },
          { role: 'user', content: userPrompt },
        ],
      }),
    })

    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg =
        body?.error?.message ||
        body?.message ||
        `Erro no modelo de texto (${res.status})`
      return { error: msg, code: 'api' }
    }

    const text = body.choices?.[0]?.message?.content || ''
    if (!text.trim()) {
      return { error: 'Resposta vazia do modelo.', code: 'empty_result' }
    }
    return { text: text.trim() }
  } catch (err) {
    return { error: err?.message || 'Falha de rede no chat.', code: 'network' }
  }
}

/** Parseia JSON de respostas que às vezes vêm com ```json fences */
export function parseJsonLoose(text) {
  const cleaned = String(text)
    .replace(/```json\s*/gi, '')
    .replace(/```/g, '')
    .trim()
  try {
    return JSON.parse(cleaned)
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0])
      } catch {
        return null
      }
    }
    return null
  }
}

export const OPENROUTER_MODELS = {
  transcribe: TRANSCRIBE_MODEL,
  chat: CHAT_MODEL,
}
