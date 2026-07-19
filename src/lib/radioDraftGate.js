/**
 * Gate de qualidade para áudio de rádio digital.
 * Transcrições curtas ou duvidosas → rascunho; adequadas → final.
 */

const MIN_CHARS_FINAL = 40
const MIN_WORDS_FINAL = 6

/** Palavras que sozinhas não formam relato útil */
const NOISE_ONLY = new Set([
  'teste',
  'test',
  'ok',
  'oi',
  'olá',
  'ola',
  'alo',
  'alô',
  'sim',
  'não',
  'nao',
  'hmm',
  'ah',
  'eh',
  'uh',
  'copy',
  'positivo',
  'negativo',
  'cambio',
  'câmbio',
])

export function normalizeTranscript(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function wordCount(text) {
  const t = normalizeTranscript(text)
  if (!t) return 0
  return t.split(' ').filter(Boolean).length
}

/**
 * @param {string} transcript
 * @param {{ forceDraft?: boolean, forceFinal?: boolean, confidence?: number }} [meta]
 * @returns {{ draft: boolean, reason: string, quality: 'low'|'ok' }}
 */
export function shouldDraftRadio(transcript, meta = {}) {
  if (meta.forceFinal) {
    return { draft: false, reason: 'force_final', quality: 'ok' }
  }
  if (meta.forceDraft) {
    return { draft: true, reason: 'force_draft', quality: 'low' }
  }

  const t = normalizeTranscript(transcript)
  if (!t) {
    return { draft: true, reason: 'empty', quality: 'low' }
  }

  const words = wordCount(t)
  const lower = t.toLowerCase()
  const onlyNoise =
    words <= 2 &&
    lower
      .split(/[\s,.!;:]+/)
      .filter(Boolean)
      .every((w) => NOISE_ONLY.has(w))

  if (onlyNoise) {
    return { draft: true, reason: 'noise_only', quality: 'low' }
  }

  if (t.length < MIN_CHARS_FINAL || words < MIN_WORDS_FINAL) {
    return { draft: true, reason: 'short', quality: 'low' }
  }

  // confidence opcional 0–1
  if (typeof meta.confidence === 'number' && meta.confidence < 0.45) {
    return { draft: true, reason: 'low_confidence', quality: 'low' }
  }

  return { draft: false, reason: 'adequate', quality: 'ok' }
}

/**
 * Status a gravar no registro conforme gate.
 */
export function radioPersistStatus(gate) {
  return gate.draft ? 'rascunho' : 'novo'
}
