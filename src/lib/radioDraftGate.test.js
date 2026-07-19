import { describe, it, expect } from 'vitest'
import { shouldDraftRadio, radioPersistStatus } from './radioDraftGate.js'

describe('shouldDraftRadio', () => {
  it('empty → draft', () => {
    const g = shouldDraftRadio('')
    expect(g.draft).toBe(true)
    expect(g.reason).toBe('empty')
    expect(radioPersistStatus(g)).toBe('rascunho')
  })

  it('short / noise → draft', () => {
    expect(shouldDraftRadio('ok').draft).toBe(true)
    expect(shouldDraftRadio('teste').draft).toBe(true)
    expect(shouldDraftRadio('oi oi').draft).toBe(true)
    expect(shouldDraftRadio('rádio check').draft).toBe(true) // short
  })

  it('adequate transcript → final', () => {
    const t =
      'Ocorrência de segurança na frente de lavra Norte banco 3 com desvio de material na berma e risco de queda de rocha.'
    const g = shouldDraftRadio(t)
    expect(g.draft).toBe(false)
    expect(g.reason).toBe('adequate')
    expect(radioPersistStatus(g)).toBe('novo')
  })

  it('forceDraft / forceFinal', () => {
    expect(shouldDraftRadio('longo texto aqui com varias palavras extras sim', { forceDraft: true }).draft).toBe(true)
    expect(shouldDraftRadio('', { forceFinal: true }).draft).toBe(false)
  })

  it('low confidence → draft', () => {
    const t =
      'Ocorrência de segurança na frente de lavra Norte banco 3 com desvio de material na berma.'
    expect(shouldDraftRadio(t, { confidence: 0.2 }).draft).toBe(true)
  })
})
