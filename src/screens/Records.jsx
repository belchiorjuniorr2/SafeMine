import { useState, useEffect } from 'react'
import { ShieldAlert, Leaf, Activity, Truck, ArrowLeftRight, Search, ChevronDown, ChevronUp, Trash2, X, AlertTriangle, Paperclip } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Header from '../components/Header'

const tipos = {
  seguranca: { label: 'Segurança', color: '#e53935', Icon: ShieldAlert },
  ambiental: { label: 'Ambiental', color: '#43a047', Icon: Leaf },
  ergonomia: { label: 'Ergonomia', color: '#8e24aa', Icon: Activity },
  veiculo: { label: 'Veículo', color: '#1e88e5', Icon: Truck },
  turno: { label: 'Turno', color: '#f57c00', Icon: ArrowLeftRight },
  inspecao: { label: 'Inspeção', color: '#00897b', Icon: Search },
}

const fieldLabels = {
  local: 'Local', data: 'Data', hora: 'Hora', colaborador: 'Colaborador',
  descricao_ocorrencia: 'Descrição', causa_raiz: 'Causa Raiz', acao_imediata: 'Ação Imediata',
  gravidade: 'Gravidade', responsavel: 'Responsável', tipo_impacto: 'Tipo de Impacto',
  area_afetada: 'Área Afetada', descricao: 'Descrição', medida_tomada: 'Medida Tomada',
  nivel_criticidade: 'Criticidade', setor: 'Setor', funcao: 'Função',
  posto_trabalho: 'Posto', descricao_risco: 'Risco', sintoma_relatado: 'Sintoma',
  recomendacao: 'Recomendação', prioridade: 'Prioridade', placa: 'Placa',
  modelo: 'Modelo', km_atual: 'KM Atual', operador: 'Operador', turno: 'Turno',
  frente_trabalho: 'Frente', turno_saida: 'Turno Saindo', turno_entrada: 'Turno Entrando',
  supervisor_saida: 'Sup. Saída', supervisor_entrada: 'Sup. Entrada',
  equipamentos_operando: 'Equipamentos', ocorrencias: 'Ocorrências',
  pendencias: 'Pendências', observacoes: 'Observações',
  area_inspecionada: 'Área', inspector: 'Inspetor', tipo_inspecao: 'Tipo',
  conformidades: 'Conformidades', nao_conformidades: 'Não Conformidades',
  recomendacoes: 'Recomendações', prazo_acao: 'Prazo', responsavel_acao: 'Responsável',
  pneus: 'Pneus', freios: 'Freios', luzes: 'Luzes', buzina: 'Buzina',
  extintor: 'Extintor', triangulo: 'Triângulo', cinto: 'Cinto',
  retrovisores: 'Retrovisores', oleo: 'Óleo', agua: 'Água', combustivel: 'Combustível',
  tratativas: 'Tratativas Recomendadas', anexos: 'Anexos',
}

const badgeKey = { seguranca: 'gravidade', ambiental: 'nivel_criticidade', ergonomia: 'prioridade' }
const badgeColor = { Grave: '#e53935', Moderado: '#f57c00', Leve: '#43a047', Alto: '#e53935', Médio: '#f57c00', Baixo: '#43a047', Alta: '#e53935', Média: '#f57c00', Baixa: '#43a047' }

export default function Records() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('todos')
  const [expandedId, setExpandedId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null) // { id, tipo }
  const [justification, setJustification] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    supabase
      .from('registros')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setRecords(data || [])
        setLoading(false)
      })
  }, [])

  const filtered = filter === 'todos' ? records : records.filter(r => r.tipo === filter)

  const fmtDate = iso => new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })

  const openDeleteModal = (e, rec) => {
    e.stopPropagation()
    setDeleteTarget({ id: rec.id, tipo: rec.tipo })
    setJustification('')
  }

  const cancelDelete = () => {
    setDeleteTarget(null)
    setJustification('')
  }

  const confirmDelete = async () => {
    if (!justification.trim()) return
    setDeleting(true)
    const { error } = await supabase
      .from('registros')
      .delete()
      .eq('id', deleteTarget.id)
    if (!error) {
      setRecords(prev => prev.filter(r => r.id !== deleteTarget.id))
      if (expandedId === deleteTarget.id) setExpandedId(null)
      setDeleteTarget(null)
      setJustification('')
    }
    setDeleting(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)', paddingBottom: '32px' }}>
      <Header
        title="Consultar Registros"
        subtitle={loading ? 'Carregando...' : `${records.length} registro${records.length !== 1 ? 's' : ''} encontrado${records.length !== 1 ? 's' : ''}`}
      />

      {/* Filtros */}
      <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {['todos', ...Object.keys(tipos)].map(t => {
          const cfg = t === 'todos' ? { label: 'Todos', color: '#1a1a1a' } : tipos[t]
          const active = filter === t
          return (
            <button
              key={t}
              onClick={() => setFilter(t)}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: '20px',
                border: `1.5px solid ${active ? cfg.color : 'var(--gray-mid)'}`,
                background: active ? cfg.color : '#fff',
                color: active ? '#fff' : 'var(--gray)',
                fontSize: '13px',
                fontWeight: 600,
                transition: 'all 0.15s',
                whiteSpace: 'nowrap'
              }}
            >
              {cfg.label}
            </button>
          )
        })}
      </div>

      <div style={{ padding: '0 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid var(--orange)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '14px' }}>📋</div>
            <div style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-dark)', marginBottom: '6px' }}>
              Nenhum registro encontrado
            </div>
            <div style={{ fontSize: '13px', color: 'var(--gray)' }}>
              {filter === 'todos' ? 'Os registros enviados aparecerão aqui' : `Nenhum registro de ${tipos[filter]?.label || filter}`}
            </div>
          </div>
        ) : (
          filtered.map(rec => {
            const cfg = tipos[rec.tipo] || { label: rec.tipo, color: '#808184', Icon: ShieldAlert }
            const { Icon } = cfg
            const isExpanded = expandedId === rec.id
            const dados = rec.dados || {}
            const badge = dados[badgeKey[rec.tipo]]
            const previewFields = ['local', 'colaborador', 'area_inspecionada', 'placa', 'frente_trabalho', 'setor']
            const preview = previewFields.map(k => dados[k]).filter(Boolean)[0] || Object.values(dados).find(v => typeof v === 'string' && v && !v.startsWith('_')) || ''
            const isDeleteTarget = deleteTarget?.id === rec.id

            return (
              <div key={rec.id} style={{ background: '#fff', borderRadius: '16px', marginBottom: '10px', boxShadow: 'var(--shadow)', overflow: 'hidden' }}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : rec.id)}
                  style={{ width: '100%', padding: '14px 16px', border: 'none', background: 'none', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '12px' }}
                >
                  <div style={{ width: '4px', alignSelf: 'stretch', background: cfg.color, borderRadius: '4px', flexShrink: 0 }} />
                  <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={cfg.color} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                      {badge && (
                        <span style={{ fontSize: '11px', background: `${badgeColor[badge] || cfg.color}18`, color: badgeColor[badge] || cfg.color, borderRadius: '6px', padding: '2px 7px', fontWeight: 700 }}>
                          {badge}
                        </span>
                      )}
                    </div>
                    {preview ? (
                      <div style={{ fontSize: '13px', color: 'var(--text-mid)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {preview}
                      </div>
                    ) : null}
                    <div style={{ fontSize: '11px', color: 'var(--gray)' }}>
                      {fmtDate(rec.created_at)}
                      {rec.user_email ? ` · ${rec.user_email}` : ''}
                    </div>
                  </div>
                  {isExpanded
                    ? <ChevronUp size={16} color="var(--gray)" style={{ flexShrink: 0 }} />
                    : <ChevronDown size={16} color="var(--gray)" style={{ flexShrink: 0 }} />
                  }
                </button>

                {isExpanded && (
                  <div style={{ borderTop: '1px solid var(--gray-light)' }}>
                    <div style={{ padding: '12px 16px 4px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {Object.entries(dados)
                          .filter(([k, v]) => !k.startsWith('_') && k !== 'anexos' && k !== 'tratativas' && v !== '' && v !== null && v !== undefined)
                          .map(([k, v]) => (
                            <div key={k} style={{ background: 'var(--gray-light)', borderRadius: '8px', padding: '8px 10px' }}>
                              <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '2px' }}>
                                {fieldLabels[k] || k}
                              </div>
                              <div style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 500, wordBreak: 'break-word', lineHeight: 1.4 }}>
                                {String(v)}
                              </div>
                            </div>
                          ))
                        }
                      </div>

                      {/* Tratativas */}
                      {dados.tratativas && (
                        <div style={{ marginTop: '6px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: '10px', padding: '10px 12px' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>Tratativas Recomendadas</div>
                          <p style={{ fontSize: '13px', color: '#78350f', lineHeight: 1.6, margin: 0, whiteSpace: 'pre-line' }}>{dados.tratativas}</p>
                        </div>
                      )}

                      {/* Anexos */}
                      {Array.isArray(dados.anexos) && dados.anexos.length > 0 && (
                        <div style={{ marginTop: '6px', background: 'var(--gray-light)', borderRadius: '10px', padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '8px' }}>
                            <Paperclip size={12} color="var(--gray)" />
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Anexos ({dados.anexos.length})</span>
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                            {dados.anexos.map((a, i) => (
                              a.type?.startsWith('image/') ? (
                                <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: '8px', overflow: 'hidden', border: '1.5px solid var(--gray-mid)' }}>
                                  <img src={a.url} alt={a.name} style={{ width: '72px', height: '72px', objectFit: 'cover', display: 'block' }} />
                                </a>
                              ) : (
                                <a key={i} href={a.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 10px', borderRadius: '8px', border: '1.5px solid var(--gray-mid)', background: '#fff', fontSize: '12px', color: 'var(--text-mid)', fontWeight: 500, textDecoration: 'none' }}>
                                  <Paperclip size={13} color="var(--gray)" />
                                  {a.name.length > 20 ? a.name.slice(0, 18) + '…' : a.name}
                                </a>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Delete section */}
                    {!isDeleteTarget ? (
                      <div style={{ padding: '12px 16px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          onClick={(e) => openDeleteModal(e, rec)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            border: '1.5px solid #fecaca',
                            background: '#fff5f5',
                            color: '#dc2626',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <Trash2 size={14} />
                          Excluir registro
                        </button>
                      </div>
                    ) : (
                      <div style={{ margin: '0 16px 16px', background: '#fff5f5', border: '1.5px solid #fecaca', borderRadius: '12px', padding: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                          <AlertTriangle size={15} color="#dc2626" />
                          <span style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>Confirmar exclusão</span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#7f1d1d', margin: '0 0 10px', lineHeight: 1.4 }}>
                          Esta ação não pode ser desfeita. Informe o motivo da exclusão:
                        </p>
                        <textarea
                          value={justification}
                          onChange={e => setJustification(e.target.value)}
                          placeholder="Descreva o motivo da exclusão..."
                          rows={3}
                          style={{
                            width: '100%',
                            borderRadius: '8px',
                            border: '1.5px solid #fca5a5',
                            padding: '10px',
                            fontSize: '13px',
                            resize: 'none',
                            outline: 'none',
                            boxSizing: 'border-box',
                            background: '#fff',
                            color: 'var(--text-dark)',
                            lineHeight: 1.4,
                            fontFamily: 'inherit'
                          }}
                        />
                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                          <button
                            onClick={cancelDelete}
                            style={{
                              flex: 1,
                              padding: '9px',
                              borderRadius: '8px',
                              border: '1.5px solid var(--gray-mid)',
                              background: '#fff',
                              color: 'var(--gray)',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px'
                            }}
                          >
                            <X size={13} /> Cancelar
                          </button>
                          <button
                            onClick={confirmDelete}
                            disabled={!justification.trim() || deleting}
                            style={{
                              flex: 1,
                              padding: '9px',
                              borderRadius: '8px',
                              border: 'none',
                              background: justification.trim() ? '#dc2626' : '#fca5a5',
                              color: '#fff',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: justification.trim() && !deleting ? 'pointer' : 'default',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '5px',
                              transition: 'background 0.2s'
                            }}
                          >
                            {deleting ? (
                              <div style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                            ) : (
                              <><Trash2 size={13} /> Excluir</>
                            )}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
