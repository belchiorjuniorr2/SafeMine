/**
 * Catálogo de frentes / bancos / áreas (mina a céu aberto).
 */

export const LOCAIS_CATALOG = [
  { id: 'fl-norte-b1', label: 'Frente de lavra Norte — Banco 1', tipo: 'frente' },
  { id: 'fl-norte-b2', label: 'Frente de lavra Norte — Banco 2', tipo: 'frente' },
  { id: 'fl-norte-b3', label: 'Frente de lavra Norte — Banco 3', tipo: 'frente' },
  { id: 'fl-sul-b1', label: 'Frente de lavra Sul — Banco 1', tipo: 'frente' },
  { id: 'fl-sul-b2', label: 'Frente de lavra Sul — Banco 2', tipo: 'frente' },
  { id: 'britagem', label: 'Britagem primária', tipo: 'area' },
  { id: 'pilha-esteril', label: 'Pilha de estéril', tipo: 'area' },
  { id: 'bacia-sul', label: 'Bacia de contenção Sul', tipo: 'area' },
  { id: 'patio-estocagem', label: 'Pátio de estocagem', tipo: 'area' },
  { id: 'oficina', label: 'Oficina de manutenção', tipo: 'area' },
  { id: 'porta-mina', label: 'Portaria / acesso mina', tipo: 'area' },
  { id: 'laboratorio', label: 'Laboratório de qualidade', tipo: 'area' },
  { id: 'refinaria', label: 'Área de refinaria / processo', tipo: 'area' },
  { id: 'berma-acesso', label: 'Berma de acesso principal', tipo: 'berma' },
]

export const LOCAL_OUTRO = '__outro__'

/**
 * Resolve valor de formulário a partir da seleção do catálogo.
 * @param {string} selectedId - id do catálogo ou LOCAL_OUTRO
 * @param {string} [customText] - texto livre se outro
 */
export function resolveLocalValue(selectedId, customText = '') {
  if (!selectedId || selectedId === LOCAL_OUTRO) {
    return String(customText || '').trim()
  }
  const found = LOCAIS_CATALOG.find((l) => l.id === selectedId)
  return found ? found.label : String(customText || '').trim()
}

/**
 * Dado um valor já salvo, tenta casar com o catálogo.
 */
export function matchCatalogId(value) {
  if (!value) return ''
  const v = String(value).trim()
  const found = LOCAIS_CATALOG.find((l) => l.label === v)
  return found ? found.id : LOCAL_OUTRO
}

export function filterCatalog(query) {
  const q = String(query || '')
    .trim()
    .toLowerCase()
  if (!q) return LOCAIS_CATALOG.slice()
  return LOCAIS_CATALOG.filter(
    (l) => l.label.toLowerCase().includes(q) || l.tipo.toLowerCase().includes(q),
  )
}

/** Campo de destino por tipo de formulário */
export function locationFieldKey(formTipo) {
  if (formTipo === 'inspecao') return 'area_inspecionada'
  if (formTipo === 'turno') return 'frente_trabalho'
  if (formTipo === 'ergonomia') return 'setor'
  return 'local'
}
