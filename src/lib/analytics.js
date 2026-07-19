/** Agregações para o painel de gestão SSMA */

export const STATUS = {
  novo: { key: 'novo', label: 'Novo', color: '#1E88E5' },
  em_analise: { key: 'em_analise', label: 'Em análise', color: '#FB8C00' },
  tratado: { key: 'tratado', label: 'Tratado', color: '#43A047' },
  fechado: { key: 'fechado', label: 'Fechado', color: '#8B939E' },
}

export const STATUS_LIST = Object.values(STATUS)

export function getStatus(rec) {
  const s = rec?.dados?._status || rec?.status || 'novo'
  return STATUS[s] || STATUS.novo
}

export function getGravidade(rec) {
  const d = rec?.dados || {}
  return (
    d.gravidade ||
    d.nivel_criticidade ||
    d.prioridade ||
    null
  )
}

export function isHighSeverity(g) {
  if (!g) return false
  const s = String(g).toLowerCase()
  return s === 'grave' || s === 'alto' || s === 'alta'
}

export function getCanal(rec) {
  return rec?.canal || rec?.dados?._canal || 'app'
}

export function canalLabel(c) {
  if (c === 'whatsapp') return 'WhatsApp'
  if (c === 'radio') return 'Rádio'
  return 'App'
}

export function getLocal(rec) {
  const d = rec?.dados || {}
  return (
    d.local ||
    d.area_inspecionada ||
    d.frente_trabalho ||
    d.setor ||
    d.area_afetada ||
    '—'
  )
}

/** Últimos N dias (incluindo hoje), chaves YYYY-MM-DD no fuso BR */
export function lastDaysKeys(n = 7) {
  const keys = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    keys.push(toBrDayKey(d))
  }
  return keys
}

export function toBrDayKey(date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date instanceof Date ? date : new Date(date))
  const y = parts.find((p) => p.type === 'year')?.value
  const m = parts.find((p) => p.type === 'month')?.value
  const d = parts.find((p) => p.type === 'day')?.value
  return `${y}-${m}-${d}`
}

export function formatBrDayLabel(key) {
  // key YYYY-MM-DD
  const [y, m, d] = key.split('-')
  return `${d}/${m}`
}

export function buildAnalytics(records = [], tipoLabels = {}) {
  const total = records.length
  const byTipo = {}
  const byCanal = { app: 0, whatsapp: 0, radio: 0 }
  const byStatus = { novo: 0, em_analise: 0, tratado: 0, fechado: 0 }
  const byGrav = { Grave: 0, Moderado: 0, Leve: 0, Alto: 0, Médio: 0, Baixo: 0, Alta: 0, Média: 0, Baixa: 0, Outro: 0 }
  const dayKeys = lastDaysKeys(7)
  const byDay = Object.fromEntries(dayKeys.map((k) => [k, 0]))
  const localCount = {}
  let high = 0
  let withTranscript = 0

  const todayKey = toBrDayKey(new Date())
  let today = 0
  const weekAgo = new Date()
  weekAgo.setDate(weekAgo.getDate() - 7)
  let week = 0

  for (const r of records) {
    const tipo = r.tipo || 'outro'
    byTipo[tipo] = (byTipo[tipo] || 0) + 1

    const canal = getCanal(r)
    if (byCanal[canal] != null) byCanal[canal] += 1
    else byCanal.app += 1

    const st = getStatus(r).key
    if (byStatus[st] != null) byStatus[st] += 1
    else byStatus.novo += 1

    const g = getGravidade(r)
    if (g) {
      if (byGrav[g] != null) byGrav[g] += 1
      else byGrav.Outro += 1
      if (isHighSeverity(g)) high += 1
    }

    if (r.dados?._transcript) withTranscript += 1

    const day = r.created_at ? toBrDayKey(r.created_at) : null
    if (day && byDay[day] != null) byDay[day] += 1
    if (day === todayKey) today += 1
    if (r.created_at && new Date(r.created_at) >= weekAgo) week += 1

    const loc = getLocal(r)
    if (loc && loc !== '—') localCount[loc] = (localCount[loc] || 0) + 1
  }

  // Índice de risco 0–100: peso de gravidade alta + volume de novos
  const open = byStatus.novo + byStatus.em_analise
  const riskScore = Math.min(
    100,
    Math.round(
      (high / Math.max(total, 1)) * 55 +
        (open / Math.max(total, 1)) * 35 +
        (today > 5 ? 10 : today * 1.5),
    ),
  )

  // Taxa de tratativa %
  const closed = byStatus.tratado + byStatus.fechado
  const treatRate = total ? Math.round((closed / total) * 100) : 0

  const tipoBars = Object.entries(byTipo)
    .map(([key, value]) => ({
      key,
      name: tipoLabels[key] || key,
      value,
      fill:
        {
          seguranca: '#E53935',
          ambiental: '#43A047',
          ergonomia: '#8E24AA',
          veiculo: '#1E88E5',
          turno: '#FB8C00',
          inspecao: '#00897B',
        }[key] || '#FF8A45',
    }))
    .sort((a, b) => b.value - a.value)

  const canalPie = [
    { name: 'App', value: byCanal.app, fill: '#FF8A45' },
    { name: 'WhatsApp', value: byCanal.whatsapp, fill: '#25D366' },
    { name: 'Rádio', value: byCanal.radio, fill: '#64748B' },
  ].filter((x) => x.value > 0)

  const statusBars = STATUS_LIST.map((s) => ({
    name: s.label,
    value: byStatus[s.key] || 0,
    fill: s.color,
  }))

  const dayBars = dayKeys.map((k) => ({
    name: formatBrDayLabel(k),
    key: k,
    value: byDay[k] || 0,
  }))

  const topLocais = Object.entries(localCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value }))

  const gravPie = Object.entries(byGrav)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name,
      value,
      fill:
        {
          Grave: '#E53935',
          Alto: '#E53935',
          Alta: '#E53935',
          Moderado: '#FB8C00',
          Médio: '#FB8C00',
          Média: '#FB8C00',
          Leve: '#43A047',
          Baixo: '#43A047',
          Baixa: '#43A047',
          Outro: '#8B939E',
        }[name] || '#8B939E',
    }))

  return {
    total,
    today,
    week,
    high,
    open,
    closed,
    withTranscript,
    riskScore,
    treatRate,
    tipoBars,
    canalPie,
    statusBars,
    dayBars,
    topLocais,
    gravPie,
    byStatus,
  }
}

/** CSV simples para export */
export function recordsToCsv(records) {
  const headers = [
    'id',
    'numero',
    'tipo',
    'canal',
    'status',
    'gravidade',
    'local',
    'nome',
    'matricula',
    'created_at',
  ]
  const lines = [headers.join(';')]
  for (const r of records) {
    const d = r.dados || {}
    const row = [
      r.id,
      r.numero || d._numero || '',
      r.tipo || '',
      getCanal(r),
      getStatus(r).key,
      getGravidade(r) || '',
      getLocal(r),
      d.nome || '',
      d.matricula || '',
      r.created_at || '',
    ].map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`)
    lines.push(row.join(';'))
  }
  return lines.join('\n')
}
