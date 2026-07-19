/**
 * Máquina de estados pura — rascunho WhatsApp pós-áudio.
 * Separada de I/O para testes unitários.
 */

export const WA_STATES = {
  NEED_MATRICULA: 'need_matricula',
  CONFIRM: 'confirm_matricula',
  READY: 'ready',
  /** Após STT: aguarda SIM para finalizar rascunho */
  CONFIRM_DRAFT: 'confirm_draft',
}

/**
 * Após processar áudio (STT+parse), o próximo passo NÃO é finalize.
 * @returns {{ nextState: string, shouldCreateDraft: true, shouldFinalize: false }}
 */
export function afterAudioProcessed() {
  return {
    nextState: WA_STATES.CONFIRM_DRAFT,
    shouldCreateDraft: true,
    shouldFinalize: false,
  }
}

/**
 * Transição em estado confirm_draft a partir do texto do usuário.
 * @param {string} text
 * @param {{ isYes: (t:string)=>boolean, isNo: (t:string)=>boolean }} helpers
 */
export function transitionConfirmDraft(text, helpers) {
  const { isYes, isNo } = helpers
  if (isYes(text)) {
    return {
      action: 'finalize_draft',
      nextState: WA_STATES.READY,
      shouldFinalize: true,
      shouldDiscard: false,
    }
  }
  if (isNo(text)) {
    return {
      action: 'discard_draft',
      nextState: WA_STATES.READY,
      shouldFinalize: false,
      shouldDiscard: true,
    }
  }
  return {
    action: 'repeat_summary',
    nextState: WA_STATES.CONFIRM_DRAFT,
    shouldFinalize: false,
    shouldDiscard: false,
  }
}

/**
 * Gate: só cria registro FINAL se shouldFinalize.
 * Draft path cria rascunho; decline não finaliza.
 */
export function shouldCreateFinalRegistro({ event, confirmAction }) {
  if (event === 'audio_processed') return false
  if (event === 'confirm_draft' && confirmAction === 'finalize_draft') return true
  return false
}

export function buildDraftSummaryMessage({ tipoLabel, local, gravidade, transcriptPreview }) {
  const lines = [
    '📝 *Rascunho do relato*',
    `Tipo: ${tipoLabel || 'Segurança'}`,
  ]
  if (local) lines.push(`Local: ${local}`)
  if (gravidade) lines.push(`Gravidade: ${gravidade}`)
  if (transcriptPreview) {
    const t =
      transcriptPreview.length > 280
        ? `${transcriptPreview.slice(0, 277)}…`
        : transcriptPreview
    lines.push('', `Texto: ${t}`)
  }
  lines.push('', 'Responda *SIM* para registrar ou *NÃO* para descartar.')
  return lines.join('\n')
}
