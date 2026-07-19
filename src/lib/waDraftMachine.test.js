import { describe, it, expect } from 'vitest'
import {
  afterAudioProcessed,
  transitionConfirmDraft,
  shouldCreateFinalRegistro,
  WA_STATES,
  buildDraftSummaryMessage,
} from './waDraftMachine.js'

const yesNo = {
  isYes: (t) => ['sim', 's', 'yes'].includes(String(t).trim().toLowerCase()),
  isNo: (t) => ['nao', 'não', 'n', 'no'].includes(String(t).trim().toLowerCase()),
}

describe('waDraftMachine', () => {
  it('after audio does not finalize — creates draft path', () => {
    const r = afterAudioProcessed()
    expect(r.shouldCreateDraft).toBe(true)
    expect(r.shouldFinalize).toBe(false)
    expect(r.nextState).toBe(WA_STATES.CONFIRM_DRAFT)
    expect(
      shouldCreateFinalRegistro({ event: 'audio_processed' }),
    ).toBe(false)
  })

  it('SIM on confirm_draft finalizes only', () => {
    const r = transitionConfirmDraft('SIM', yesNo)
    expect(r.action).toBe('finalize_draft')
    expect(r.shouldFinalize).toBe(true)
    expect(r.shouldDiscard).toBe(false)
    expect(
      shouldCreateFinalRegistro({
        event: 'confirm_draft',
        confirmAction: r.action,
      }),
    ).toBe(true)
  })

  it('NÃO discards without final registro', () => {
    const r = transitionConfirmDraft('não', yesNo)
    expect(r.action).toBe('discard_draft')
    expect(r.shouldFinalize).toBe(false)
    expect(r.shouldDiscard).toBe(true)
    expect(
      shouldCreateFinalRegistro({
        event: 'confirm_draft',
        confirmAction: r.action,
      }),
    ).toBe(false)
  })

  it('other text stays on confirm_draft', () => {
    const r = transitionConfirmDraft('talvez', yesNo)
    expect(r.nextState).toBe(WA_STATES.CONFIRM_DRAFT)
    expect(r.shouldFinalize).toBe(false)
  })

  it('builds summary asking SIM/NÃO', () => {
    const msg = buildDraftSummaryMessage({
      tipoLabel: 'Segurança',
      local: 'Banco 3',
      transcriptPreview: 'Desvio de material na berma',
    })
    expect(msg).toContain('Rascunho')
    expect(msg).toContain('SIM')
    expect(msg).toContain('NÃO')
  })
})
