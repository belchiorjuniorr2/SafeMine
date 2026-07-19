import { describe, it, expect } from 'vitest'
import {
  LOCAIS_CATALOG,
  LOCAL_OUTRO,
  resolveLocalValue,
  matchCatalogId,
  locationFieldKey,
  filterCatalog,
} from './locaisCatalog.js'

describe('locaisCatalog', () => {
  it('has seeded frentes/bancos', () => {
    expect(LOCAIS_CATALOG.length).toBeGreaterThan(5)
    expect(LOCAIS_CATALOG.some((l) => l.label.includes('Banco 3'))).toBe(true)
  })

  it('resolveLocalValue from catalog id', () => {
    const id = LOCAIS_CATALOG.find((l) => l.label.includes('Banco 3')).id
    const v = resolveLocalValue(id)
    expect(v).toContain('Banco 3')
  })

  it('resolveLocalValue outro uses custom text', () => {
    expect(resolveLocalValue(LOCAL_OUTRO, '  Área X  ')).toBe('Área X')
  })

  it('matchCatalogId roundtrip', () => {
    const item = LOCAIS_CATALOG[0]
    expect(matchCatalogId(item.label)).toBe(item.id)
    expect(matchCatalogId('lugar inventado')).toBe(LOCAL_OUTRO)
  })

  it('locationFieldKey by form type', () => {
    expect(locationFieldKey('seguranca')).toBe('local')
    expect(locationFieldKey('inspecao')).toBe('area_inspecionada')
    expect(locationFieldKey('turno')).toBe('frente_trabalho')
    expect(locationFieldKey('ergonomia')).toBe('setor')
  })

  it('filterCatalog by query', () => {
    const r = filterCatalog('britagem')
    expect(r.some((l) => l.label.toLowerCase().includes('britagem'))).toBe(true)
  })

  it('analytics-style match: selected label is used as local string', () => {
    const id = 'fl-norte-b3'
    const local = resolveLocalValue(id)
    const records = [{ dados: { local } }, { dados: { local: 'Outro' } }]
    const filtered = records.filter((r) => r.dados.local === local)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].dados.local).toContain('Banco 3')
  })
})
