/** Normaliza valores da IA para bater com os enums da UI (acentos, casing). */
const ENUM_MAPS = {
  gravidade: {
    leve: 'Leve',
    moderado: 'Moderado',
    grave: 'Grave',
  },
  nivel_criticidade: {
    baixo: 'Baixo',
    medio: 'Médio',
    médio: 'Médio',
    alto: 'Alto',
  },
  prioridade: {
    baixa: 'Baixa',
    media: 'Média',
    média: 'Média',
    alta: 'Alta',
  },
  tipo_inspecao: {
    rotina: 'Rotina',
    especial: 'Especial',
    auditoria: 'Auditoria',
  },
  turno: {
    manha: 'Manhã',
    manhã: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite',
  },
  turno_saida: {
    manha: 'Manhã',
    manhã: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite',
  },
  turno_entrada: {
    manha: 'Manhã',
    manhã: 'Manhã',
    tarde: 'Tarde',
    noite: 'Noite',
  },
}

const STATUS_KEYS = new Set([
  'pneus', 'freios', 'luzes', 'buzina', 'extintor', 'triangulo',
  'cinto', 'retrovisores', 'oleo', 'agua', 'combustivel',
])

const STATUS_MAP = {
  ok: 'OK',
  nok: 'NOK',
  'n/a': 'NA',
  na: 'NA',
  'não se aplica': 'NA',
  'nao se aplica': 'NA',
}

function stripAccents(s) {
  return String(s).normalize('NFD').replace(/\p{M}/gu, '')
}

export function normalizeAIFields(fields = {}) {
  if (!fields || typeof fields !== 'object') return {}
  if (fields._noKey || fields._error) return fields

  const out = {}
  for (const [key, value] of Object.entries(fields)) {
    if (value == null || value === '') continue

    if (ENUM_MAPS[key] && typeof value === 'string') {
      const lookup = stripAccents(value).toLowerCase().trim()
      const mapped = ENUM_MAPS[key][lookup] || ENUM_MAPS[key][value.toLowerCase().trim()]
      out[key] = mapped || value
      continue
    }

    if (STATUS_KEYS.has(key) && typeof value === 'string') {
      const lookup = stripAccents(value).toLowerCase().trim()
      out[key] = STATUS_MAP[lookup] || value.toUpperCase()
      continue
    }

    out[key] = value
  }
  return out
}
