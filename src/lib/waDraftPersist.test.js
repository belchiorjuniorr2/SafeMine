import { describe, it, expect } from 'vitest'
import {
  pickDraftFields,
  mergeSessionWithMemory,
  sessionPayloadWithDraft,
  resolveDraftRefs,
  simulateSessionRoundTrip,
} from './waDraftPersist.js'
import {
  afterAudioProcessed,
  transitionConfirmDraft,
  shouldCreateFinalRegistro,
} from './waDraftMachine.js'

const yesNo = {
  isYes: (t) => ['sim', 's'].includes(String(t).trim().toLowerCase()),
  isNo: (t) => ['nao', 'não', 'n'].includes(String(t).trim().toLowerCase()),
}

describe('waDraftPersist — serverless round-trip', () => {
  it('sessionPayloadWithDraft includes draft_id and draft_numero for RPC', () => {
    const payload = sessionPayloadWithDraft(
      {
        phone: '5534999999999',
        state: 'confirm_draft',
        nome: 'José',
        matricula: '50349',
      },
      {
        draft_id: '8f31f1bb-b169-40b2-a6ff-30f57476fd05',
        draft_numero: 'SM-2026-00042',
        draft_tipo: 'seguranca',
        draft_summary: 'Rascunho…',
      },
    )
    expect(payload.draft_id).toBe('8f31f1bb-b169-40b2-a6ff-30f57476fd05')
    expect(payload.draft_numero).toBe('SM-2026-00042')
    expect(payload.draft_summary).toContain('Rascunho')
  })

  it('FAILS if only identity fields survive round-trip (old bug)', () => {
    // After draft_created, in-process session has draft_*
    const afterDraft = {
      phone: '5534999999999',
      state: 'confirm_draft',
      nome: 'José',
      matricula: '50349',
      draft_id: 'abc-uuid',
      draft_numero: 'SM-2026-00099',
      draft_tipo: 'seguranca',
      draft_summary: 'resumo',
    }
    // Old RPC only persisted identity — simulate that bug
    const brokenKeys = [
      'phone',
      'state',
      'nome',
      'matricula',
      'funcao',
      'pending_matricula',
      'user_id',
    ]
    const afterReload = simulateSessionRoundTrip(afterDraft, brokenKeys)
    const refs = resolveDraftRefs(afterReload, [])
    // Without recovery rows, draft is LOST — this documents the bug
    expect(refs).toBeNull()
    expect(afterReload.draft_id).toBeUndefined()
  })

  it('persisted draft keys survive round-trip and allow finalize gate', () => {
    const afterDraft = {
      phone: '5534999999999',
      state: 'confirm_draft',
      nome: 'José',
      matricula: '50349',
      draft_id: 'abc-uuid',
      draft_numero: 'SM-2026-00099',
      draft_tipo: 'seguranca',
      draft_summary: 'resumo',
    }
    const persistedKeys = [
      'phone',
      'state',
      'nome',
      'matricula',
      'funcao',
      'draft_id',
      'draft_numero',
      'draft_tipo',
      'draft_summary',
    ]
    const afterReload = simulateSessionRoundTrip(afterDraft, persistedKeys)
    const refs = resolveDraftRefs(afterReload, [])
    expect(refs).not.toBeNull()
    expect(refs.draft_id).toBe('abc-uuid')
    expect(refs.draft_numero).toBe('SM-2026-00099')
    expect(refs.source).toBe('session')

    // SIM still finalizes
    const tr = transitionConfirmDraft('SIM', yesNo)
    expect(shouldCreateFinalRegistro({ event: 'confirm_draft', confirmAction: tr.action })).toBe(
      true,
    )
  })

  it('recovers draft from registros when session lost draft fields', () => {
    const sessionOnlyIdentity = {
      phone: '5534999999999',
      state: 'confirm_draft',
      nome: 'José',
      matricula: '50349',
    }
    const rows = [
      {
        id: 'rec-1',
        numero: 'SM-2026-00077',
        tipo: 'seguranca',
        dados: {
          _status: 'rascunho',
          _draft: true,
          _wa_phone: '5534999999999',
          _numero: 'SM-2026-00077',
          local: 'Banco 3',
        },
      },
    ]
    const refs = resolveDraftRefs(sessionOnlyIdentity, rows)
    expect(refs).not.toBeNull()
    expect(refs.source).toBe('registros')
    expect(refs.draft_id).toBe('rec-1')
    expect(refs.draft_numero).toBe('SM-2026-00077')
  })

  it('mergeSessionWithMemory prefers DB draft when present', () => {
    const db = {
      phone: '55',
      state: 'confirm_draft',
      draft_id: 'from-db',
      draft_numero: 'SM-DB',
    }
    const mem = {
      phone: '55',
      state: 'confirm_draft',
      draft_id: 'from-mem',
      draft_numero: 'SM-MEM',
    }
    const m = mergeSessionWithMemory(db, mem)
    expect(m.draft_id).toBe('from-db')
    expect(m.draft_numero).toBe('SM-DB')
  })

  it('mergeSessionWithMemory uses memory draft if DB empty', () => {
    const db = { phone: '55', state: 'confirm_draft', nome: 'X' }
    const mem = {
      phone: '55',
      state: 'confirm_draft',
      draft_id: 'from-mem',
      draft_numero: 'SM-MEM',
    }
    const m = mergeSessionWithMemory(db, mem)
    expect(m.draft_id).toBe('from-mem')
  })

  it('audio path still does not finalize (machine)', () => {
    const r = afterAudioProcessed()
    expect(r.shouldFinalize).toBe(false)
    expect(pickDraftFields({ draft_id: 'x' }).draft_id).toBe('x')
  })
})
