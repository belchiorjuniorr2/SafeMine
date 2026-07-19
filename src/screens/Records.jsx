import { useState, useEffect, useMemo } from 'react'
import {
  ShieldAlert,
  Leaf,
  Activity,
  Truck,
  ArrowLeftRight,
  Search,
  ChevronDown,
  ChevronUp,
  Trash2,
  X,
  AlertTriangle,
  Paperclip,
  MapPin,
  User,
  Clock,
  MessageCircle,
  Smartphone,
  FileText,
  Mic,
  Inbox,
  Filter,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'

const tipos = {
  seguranca: { label: 'Segurança', color: '#e53935', soft: '#FDECEA', Icon: ShieldAlert },
  ambiental: { label: 'Ambiental', color: '#43a047', soft: '#E8F5E9', Icon: Leaf },
  ergonomia: { label: 'Ergonomia', color: '#8e24aa', soft: '#F3E5F5', Icon: Activity },
  veiculo: { label: 'Veículo', color: '#1e88e5', soft: '#E3F2FD', Icon: Truck },
  turno: { label: 'Turno', color: '#f57c00', soft: '#FFF3E0', Icon: ArrowLeftRight },
  inspecao: { label: 'Inspeção', color: '#00897b', soft: '#E0F2F1', Icon: Search },
}

const fieldLabels = {
  nome: 'Nome',
  matricula: 'Matrícula',
  funcao: 'Função',
  local: 'Local',
  data: 'Data',
  hora: 'Hora',
  colaborador: 'Colaborador',
  descricao_ocorrencia: 'Descrição',
  causa_raiz: 'Causa Raiz',
  acao_imediata: 'Ação Imediata',
  gravidade: 'Gravidade',
  responsavel: 'Responsável',
  tipo_impacto: 'Tipo de Impacto',
  area_afetada: 'Área Afetada',
  descricao: 'Descrição',
  medida_tomada: 'Medida Tomada',
  nivel_criticidade: 'Criticidade',
  setor: 'Setor',
  posto_trabalho: 'Posto',
  descricao_risco: 'Risco',
  sintoma_relatado: 'Sintoma',
  recomendacao: 'Recomendação',
  prioridade: 'Prioridade',
  placa: 'Placa',
  modelo: 'Modelo',
  km_atual: 'KM Atual',
  operador: 'Operador',
  turno: 'Turno',
  frente_trabalho: 'Frente',
  turno_saida: 'Turno Saindo',
  turno_entrada: 'Turno Entrando',
  supervisor_saida: 'Sup. Saída',
  supervisor_entrada: 'Sup. Entrada',
  equipamentos_operando: 'Equipamentos',
  ocorrencias: 'Ocorrências',
  pendencias: 'Pendências',
  observacoes: 'Observações',
  area_inspecionada: 'Área',
  inspector: 'Inspetor',
  tipo_inspecao: 'Tipo',
  conformidades: 'Conformidades',
  nao_conformidades: 'Não Conformidades',
  recomendacoes: 'Recomendações',
  prazo_acao: 'Prazo',
  responsavel_acao: 'Responsável',
  pneus: 'Pneus',
  freios: 'Freios',
  luzes: 'Luzes',
  buzina: 'Buzina',
  extintor: 'Extintor',
  triangulo: 'Triângulo',
  cinto: 'Cinto',
  retrovisores: 'Retrovisores',
  oleo: 'Óleo',
  agua: 'Água',
  combustivel: 'Combustível',
  tratativas: 'Tratativas Recomendadas',
  anexos: 'Anexos',
}

const badgeKey = { seguranca: 'gravidade', ambiental: 'nivel_criticidade', ergonomia: 'prioridade' }
const badgeColor = {
  Grave: '#e53935',
  Moderado: '#f57c00',
  Leve: '#43a047',
  Alto: '#e53935',
  Médio: '#f57c00',
  Baixo: '#43a047',
  Alta: '#e53935',
  Média: '#f57c00',
  Baixa: '#43a047',
}

const PREVIEW_KEYS = [
  'local',
  'area_inspecionada',
  'frente_trabalho',
  'setor',
  'placa',
  'descricao_ocorrencia',
  'descricao',
  'descricao_risco',
]

function formatFieldValue(v) {
  if (v == null) return ''
  if (Array.isArray(v)) {
    if (v[0]?.url) return v.map((a) => a.name || a.url).join(', ')
    return v.join('; ')
  }
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function canalInfo(rec) {
  const canal = rec.canal || rec.dados?._canal || 'app'
  if (canal === 'whatsapp') {
    return { label: 'WhatsApp', Icon: MessageCircle, className: 'rec-chip rec-chip--wa' }
  }
  if (canal === 'radio') {
    return { label: 'Rádio', Icon: Mic, className: 'rec-chip rec-chip--radio' }
  }
  return { label: 'App', Icon: Smartphone, className: 'rec-chip rec-chip--app' }
}

function recordNumero(rec) {
  return rec.numero || rec.dados?._numero || null
}

function recordPreview(dados = {}) {
  for (const k of PREVIEW_KEYS) {
    if (dados[k] && typeof dados[k] === 'string') return { key: k, value: dados[k] }
  }
  const first = Object.entries(dados).find(
    ([k, v]) => !k.startsWith('_') && typeof v === 'string' && v.trim(),
  )
  return first ? { key: first[0], value: first[1] } : null
}

export default function Records() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [filter, setFilter] = useState('todos')
  const [query, setQuery] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [justification, setJustification] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data, error } = await supabase
        .from('registros')
        .select('*')
        .order('created_at', { ascending: false })
      if (cancelled) return
      if (error) {
        setLoadError(error.message || 'Não foi possível carregar os registros.')
        setRecords([])
      } else {
        setRecords(data || [])
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const c = { todos: records.length }
    for (const k of Object.keys(tipos)) c[k] = 0
    for (const r of records) {
      if (c[r.tipo] != null) c[r.tipo] += 1
      else c[r.tipo] = 1
    }
    return c
  }, [records])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return records.filter((r) => {
      if (filter !== 'todos' && r.tipo !== filter) return false
      if (!q) return true
      const d = r.dados || {}
      const blob = [
        r.tipo,
        r.numero,
        r.user_email,
        r.canal,
        d.nome,
        d.matricula,
        d.local,
        d.descricao_ocorrencia,
        d.descricao,
        d._transcript,
        d._numero,
        formatFieldValue(d),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }, [records, filter, query])

  const openDeleteModal = (e, rec) => {
    e.stopPropagation()
    setDeleteTarget({ id: rec.id, tipo: rec.tipo })
    setJustification('')
    setDeleteError('')
  }

  const cancelDelete = () => {
    setDeleteTarget(null)
    setJustification('')
    setDeleteError('')
  }

  const confirmDelete = async () => {
    if (!justification.trim()) return
    setDeleting(true)
    setDeleteError('')
    const target = records.find((r) => r.id === deleteTarget.id)
    if (target) {
      await supabase
        .from('registros')
        .update({
          dados: {
            ...(target.dados || {}),
            _exclusao: {
              justificativa: justification.trim(),
              em: new Date().toISOString(),
            },
          },
        })
        .eq('id', deleteTarget.id)
    }
    const { error } = await supabase.from('registros').delete().eq('id', deleteTarget.id)
    if (error) {
      setDeleteError(error.message || 'Falha ao excluir o registro.')
    } else {
      setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      if (expandedId === deleteTarget.id) setExpandedId(null)
      setDeleteTarget(null)
      setJustification('')
    }
    setDeleting(false)
  }

  return (
    <div className="app-shell rec-page">
      <Header
        title="Consultar Registros"
        subtitle={
          loading
            ? 'Carregando…'
            : `${records.length} registro${records.length !== 1 ? 's' : ''} no sistema`
        }
        icon="/icons/registros.png"
      />

      <div className="rec-toolbar">
        <div className="rec-search">
          <Search size={16} className="rec-search__icon" aria-hidden />
          <input
            type="search"
            className="rec-search__input"
            placeholder="Buscar por nome, local, matrícula, nº…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar registros"
          />
          {query ? (
            <button
              type="button"
              className="rec-search__clear"
              onClick={() => setQuery('')}
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>

        <div className="rec-filters" role="tablist" aria-label="Filtrar por tipo">
          {['todos', ...Object.keys(tipos)].map((t) => {
            const cfg =
              t === 'todos'
                ? { label: 'Todos', color: '#FF9A5C', soft: '#FFF4EC', Icon: Filter }
                : tipos[t]
            const active = filter === t
            const n = counts[t] || 0
            const ChipIcon = cfg.Icon || Filter
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={active}
                className={`rec-filter ${active ? 'rec-filter--active' : ''}`}
                style={
                  active
                    ? { background: cfg.color, borderColor: cfg.color, color: '#fff' }
                    : { borderColor: 'var(--gray-mid)', color: 'var(--text-mid)' }
                }
                onClick={() => setFilter(t)}
              >
                <ChipIcon size={13} style={{ opacity: active ? 1 : 0.75 }} />
                <span>{cfg.label}</span>
                <span className={`rec-filter__count ${active ? 'rec-filter__count--on' : ''}`}>
                  {n}
                </span>
              </button>
            )
          })}
        </div>

        {!loading && !loadError && (
          <div className="rec-summary">
            <span>
              Mostrando <strong>{filtered.length}</strong>
              {filter !== 'todos' || query ? ` de ${records.length}` : ''}
            </span>
            {query ? <span className="rec-summary__q">“{query}”</span> : null}
          </div>
        )}
      </div>

      <div className="app-main app-main--form rec-list">
        {loading ? (
          <div className="rec-state">
            <div className="rec-spinner" />
            <p className="rec-state__text">Carregando registros…</p>
          </div>
        ) : loadError ? (
          <div className="rec-state rec-state--card rec-state--error">
            <AlertTriangle size={28} color="#dc2626" />
            <p className="rec-state__title">Erro ao carregar</p>
            <p className="rec-state__text">{loadError}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rec-state rec-state--card">
            <div className="rec-state__icon">
              <Inbox size={28} color="var(--orange-deep)" />
            </div>
            <p className="rec-state__title">Nenhum registro encontrado</p>
            <p className="rec-state__text">
              {query
                ? 'Tente outro termo de busca.'
                : filter === 'todos'
                  ? 'Os relatos enviados pelo app ou WhatsApp aparecerão aqui.'
                  : `Nenhum registro de ${tipos[filter]?.label || filter}.`}
            </p>
            {(query || filter !== 'todos') && (
              <button
                type="button"
                className="rec-state__btn"
                onClick={() => {
                  setQuery('')
                  setFilter('todos')
                }}
              >
                Limpar filtros
              </button>
            )}
          </div>
        ) : (
          filtered.map((rec) => {
            const cfg = tipos[rec.tipo] || {
              label: rec.tipo,
              color: '#808184',
              soft: '#F4F5F7',
              Icon: ShieldAlert,
            }
            const { Icon } = cfg
            const isExpanded = expandedId === rec.id
            const dados = rec.dados || {}
            const badge = dados[badgeKey[rec.tipo]]
            const preview = recordPreview(dados)
            const canal = canalInfo(rec)
            const CanalIcon = canal.Icon
            const numero = recordNumero(rec)
            const isDeleteTarget = deleteTarget?.id === rec.id
            const relator = dados.nome || rec.user_email || null
            const mat = dados.matricula

            return (
              <article
                key={rec.id}
                className={`rec-card ${isExpanded ? 'rec-card--open' : ''}`}
                style={{ '--rec-accent': cfg.color, '--rec-soft': cfg.soft }}
              >
                <button
                  type="button"
                  className="rec-card__hit"
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  aria-expanded={isExpanded}
                >
                  <div className="rec-card__accent" aria-hidden />
                  <div className="rec-card__icon" style={{ background: cfg.soft, color: cfg.color }}>
                    <Icon size={18} />
                  </div>

                  <div className="rec-card__body">
                    <div className="rec-card__top">
                      <span className="rec-card__tipo" style={{ color: cfg.color }}>
                        {cfg.label}
                      </span>
                      {badge ? (
                        <span
                          className="rec-badge"
                          style={{
                            color: badgeColor[badge] || cfg.color,
                            background: `${badgeColor[badge] || cfg.color}18`,
                          }}
                        >
                          {badge}
                        </span>
                      ) : null}
                      <span className={canal.className}>
                        <CanalIcon size={11} />
                        {canal.label}
                      </span>
                    </div>

                    {preview ? (
                      <p className="rec-card__preview">
                        {preview.key === 'local' ||
                        preview.key === 'area_inspecionada' ||
                        preview.key === 'frente_trabalho' ||
                        preview.key === 'setor' ? (
                          <MapPin size={12} className="rec-card__preview-ico" />
                        ) : null}
                        <span>{preview.value}</span>
                      </p>
                    ) : (
                      <p className="rec-card__preview rec-card__preview--muted">Sem resumo</p>
                    )}

                    <div className="rec-card__meta">
                      {numero ? (
                        <span className="rec-card__num">
                          <FileText size={11} />
                          {numero}
                        </span>
                      ) : null}
                      <span>
                        <Clock size={11} />
                        {fmtDate(rec.created_at)}
                      </span>
                      {relator ? (
                        <span className="rec-card__who">
                          <User size={11} />
                          {relator}
                          {mat ? ` · Mat. ${mat}` : ''}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className={`rec-card__chev ${isExpanded ? 'rec-card__chev--open' : ''}`}>
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="rec-detail">
                    {dados._transcript ? (
                      <div className="rec-transcript">
                        <div className="rec-transcript__label">
                          <Mic size={12} />
                          Transcrição
                        </div>
                        <p>{dados._transcript}</p>
                      </div>
                    ) : null}

                    <div className="rec-fields">
                      {Object.entries(dados)
                        .filter(
                          ([k, v]) =>
                            !k.startsWith('_') &&
                            k !== 'anexos' &&
                            k !== 'tratativas' &&
                            v !== '' &&
                            v != null &&
                            typeof v !== 'object',
                        )
                        .map(([k, v]) => (
                          <div key={k} className="rec-field">
                            <div className="rec-field__label">{fieldLabels[k] || k}</div>
                            <div className="rec-field__value">{formatFieldValue(v)}</div>
                          </div>
                        ))}
                    </div>

                    {dados.tratativas ? (
                      <div className="rec-callout rec-callout--warn">
                        <div className="rec-callout__label">Tratativas recomendadas</div>
                        <p>
                          {Array.isArray(dados.tratativas)
                            ? dados.tratativas.join('\n')
                            : String(dados.tratativas)}
                        </p>
                      </div>
                    ) : null}

                    {Array.isArray(dados.anexos) && dados.anexos.length > 0 ? (
                      <div className="rec-anexos">
                        <div className="rec-anexos__label">
                          <Paperclip size={12} />
                          Anexos ({dados.anexos.length})
                        </div>
                        <div className="rec-anexos__grid">
                          {dados.anexos.map((a, i) =>
                            a.type?.startsWith('image/') ? (
                              <a
                                key={i}
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rec-anexo rec-anexo--img"
                              >
                                <img src={a.url} alt={a.name || 'anexo'} />
                              </a>
                            ) : (
                              <a
                                key={i}
                                href={a.url}
                                target="_blank"
                                rel="noreferrer"
                                className="rec-anexo"
                              >
                                <Paperclip size={13} />
                                {(a.name || 'arquivo').length > 22
                                  ? `${(a.name || 'arquivo').slice(0, 20)}…`
                                  : a.name || 'arquivo'}
                              </a>
                            ),
                          )}
                        </div>
                      </div>
                    ) : null}

                    {!isDeleteTarget ? (
                      <div className="rec-actions">
                        <button
                          type="button"
                          className="rec-btn rec-btn--danger"
                          onClick={(e) => openDeleteModal(e, rec)}
                        >
                          <Trash2 size={14} />
                          Excluir registro
                        </button>
                      </div>
                    ) : (
                      <div className="rec-delete">
                        <div className="rec-delete__head">
                          <AlertTriangle size={15} color="#dc2626" />
                          <span>Confirmar exclusão</span>
                        </div>
                        <p className="rec-delete__hint">
                          Esta ação não pode ser desfeita. Informe o motivo:
                        </p>
                        <textarea
                          className="rec-delete__ta"
                          value={justification}
                          onChange={(e) => setJustification(e.target.value)}
                          placeholder="Descreva o motivo da exclusão…"
                          rows={3}
                        />
                        {deleteError ? (
                          <div className="rec-delete__err">{deleteError}</div>
                        ) : null}
                        <div className="rec-delete__row">
                          <button type="button" className="rec-btn rec-btn--ghost" onClick={cancelDelete}>
                            <X size={13} /> Cancelar
                          </button>
                          <button
                            type="button"
                            className="rec-btn rec-btn--danger-solid"
                            onClick={confirmDelete}
                            disabled={!justification.trim() || deleting}
                          >
                            {deleting ? <span className="rec-spinner rec-spinner--sm" /> : (
                              <>
                                <Trash2 size={13} /> Excluir
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}
