/**
 * Persistência / recuperação de rascunho WhatsApp (pura, testável).
 * Garante que SIM em outra instância serverless ainda encontre o draft.
 */

/**
 * Campos de rascunho que devem sobreviver ao round-trip de sessão.
 */
export function pickDraftFields(session = {}) {
  return {
    draft_id: session.draft_id ?? session.draftId ?? null,
    draft_numero: session.draft_numero ?? session.draftNumero ?? null,
    draft_tipo: session.draft_tipo ?? session.draftTipo ?? null,
    draft_summary: session.draft_summary ?? session.draftSummary ?? null,
  }
}

/**
 * Mescla sessão DB + memória, preferindo draft da memória se DB ainda vazio,
 * e preferindo DB se tiver draft_id/numero (fonte de verdade entre instâncias).
 */
export function mergeSessionWithMemory(dbSession, memSession) {
  if (!dbSession && !memSession) return null
  if (!dbSession) return { ...memSession }
  if (!memSession) return { ...dbSession }

  const dbDraft = pickDraftFields(dbSession)
  const memDraft = pickDraftFields(memSession)
  const hasDbDraft = !!(dbDraft.draft_id || dbDraft.draft_numero)
  const hasMemDraft = !!(memDraft.draft_id || memDraft.draft_numero)

  const draft = hasDbDraft ? dbDraft : hasMemDraft ? memDraft : dbDraft

  return {
    ...dbSession,
    ...memSession,
    // identity/state: prefer more recent mem state if same phone
    state: memSession.state || dbSession.state,
    ...draft,
  }
}

/**
 * Payload para upsert de sessão incluindo rascunho.
 */
export function sessionPayloadWithDraft(base, draft) {
  const d = pickDraftFields(draft || {})
  return {
    ...base,
    draft_id: d.draft_id,
    draft_numero: d.draft_numero,
    draft_tipo: d.draft_tipo,
    draft_summary: d.draft_summary,
  }
}

/**
 * Resolve refs de rascunho a partir da sessão e/ou lista de registros recentes.
 * @param {object} session
 * @param {Array<{id, numero, tipo, dados}>} registrosRows - candidatos (ex.: phone match)
 */
export function resolveDraftRefs(session, registrosRows = []) {
  const fromSession = pickDraftFields(session || {})
  if (fromSession.draft_id || fromSession.draft_numero) {
    return {
      draft_id: fromSession.draft_id,
      draft_numero: fromSession.draft_numero,
      draft_tipo: fromSession.draft_tipo,
      draft_summary: fromSession.draft_summary,
      source: 'session',
    }
  }

  const phone = session?.phone || session?._wa_phone
  const candidates = (registrosRows || []).filter((r) => {
    const d = r.dados || {}
    const isDraft = d._status === 'rascunho' || d._draft === true
    if (!isDraft) return false
    if (phone && d._wa_phone && String(d._wa_phone) !== String(phone)) return false
    return true
  })

  // most recent first if caller didn't sort
  const draft = candidates[0]
  if (!draft) return null

  return {
    draft_id: draft.id || null,
    draft_numero: draft.numero || draft.dados?._numero || null,
    draft_tipo: draft.tipo || null,
    draft_summary: null,
    source: 'registros',
    dados: draft.dados || null,
  }
}

/**
 * Simula round-trip: após draft_created, só campos persistidos na "DB" ficam.
 * Usado no teste de regressão do bug serverless.
 */
export function simulateSessionRoundTrip(sessionAfterDraft, persistedKeys) {
  const out = { phone: sessionAfterDraft.phone, state: sessionAfterDraft.state }
  for (const k of persistedKeys) {
    if (sessionAfterDraft[k] !== undefined) out[k] = sessionAfterDraft[k]
  }
  return out
}
