import { useState } from 'react'
import {
  X,
  FileText,
  MapPin,
  User,
  Clock,
  Mic,
  Headphones,
  CheckCircle2,
  ListChecks,
  Loader2,
  Sparkles,
  Paperclip,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { chatCompletion } from '../lib/openrouter'
import { REPORT_TYPES } from '../lib/reportTypes'
import {
  getStatus,
  getGravidade,
  getCanal,
  canalLabel,
  getLocal,
  STATUS_LIST,
} from '../lib/analytics'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function formatFieldValue(v) {
  if (v == null || v === '') return '—'
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

function findAudio(dados = {}) {
  if (dados._audioUrl) return { url: dados._audioUrl, name: 'Áudio do relato' }
  if (dados.audio_url) return { url: dados.audio_url, name: 'Áudio do relato' }
  if (Array.isArray(dados.anexos)) {
    const a = dados.anexos.find(
      (x) =>
        String(x.type || '').startsWith('audio/') ||
        /\.(ogg|mp3|wav|m4a|webm)$/i.test(x.name || x.url || ''),
    )
    if (a?.url) return { url: a.url, name: a.name || 'Áudio' }
  }
  return null
}

/**
 * Drawer/modal de detalhe do relato — web e mobile.
 */
export default function ReportDrawer({ record, onClose, onUpdated }) {
  const [notes, setNotes] = useState(record?.dados?._tratativa_notas || '')
  const [plan, setPlan] = useState(
    Array.isArray(record?.dados?._plano_acao)
      ? record.dados._plano_acao
      : record?.dados?._plano_acao
        ? [String(record.dados._plano_acao)]
        : [],
  )
  const [saving, setSaving] = useState(false)
  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState(getStatus(record).key)

  if (!record) return null

  const d = record.dados || {}
  const tipoMeta = REPORT_TYPES[record.tipo]
  const TipoIcon = tipoMeta?.Icon || FileText
  const numero = record.numero || d._numero || '—'
  const transcript = d._transcript || ''
  const audio = findAudio(d)
  const st = STATUS_LIST.find((s) => s.key === status) || STATUS_LIST[0]

  const saveDados = async (patch, nextStatus = status) => {
    setSaving(true)
    setError('')
    const nextDados = {
      ...d,
      ...patch,
      _status: nextStatus,
      _status_updated_at: new Date().toISOString(),
    }
    const { error: err } = await supabase
      .from('registros')
      .update({ dados: nextDados })
      .eq('id', record.id)
    setSaving(false)
    if (err) {
      setError(err.message || 'Falha ao salvar')
      return false
    }
    onUpdated?.({ ...record, dados: nextDados })
    return true
  }

  const finalizeTratativa = async () => {
    if (!notes.trim()) {
      setError('Descreva a tratativa antes de finalizar.')
      return
    }
    const ok = await saveDados(
      {
        _tratativa_notas: notes.trim(),
        _tratativa_em: new Date().toISOString(),
      },
      'fechado',
    )
    if (ok) {
      setStatus('fechado')
    }
  }

  const markTratado = async () => {
    const ok = await saveDados(
      {
        _tratativa_notas: notes.trim() || d._tratativa_notas || '',
        _tratativa_em: new Date().toISOString(),
      },
      'tratado',
    )
    if (ok) setStatus('tratado')
  }

  const generatePlan = async () => {
    setPlanning(true)
    setError('')
    const tipoLabel = tipoMeta?.label || record.tipo
    const prompt = `Com base no relato de segurança em mina a céu aberto, gere um PLANO DE AÇÃO objetivo.

Tipo: ${tipoLabel}
Local: ${getLocal(record)}
Gravidade: ${getGravidade(record) || 'não informada'}
Relator: ${d.nome || '—'} · Mat. ${d.matricula || '—'}
Transcrição/descrição: """${transcript || d.descricao_ocorrencia || d.descricao || JSON.stringify(d)}"""

Retorne APENAS JSON:
{
  "plano": ["ação 1 com responsável/prazo sugerido", "ação 2", "..."],
  "prioridade": "Alta|Média|Baixa",
  "resumo": "1 frase"
}`

    const result = await chatCompletion(prompt, { maxTokens: 900 })
    setPlanning(false)
    if (result.error) {
      setError(result.error)
      return
    }
    let parsed = null
    try {
      const m = String(result.text).match(/\{[\s\S]*\}/)
      parsed = m ? JSON.parse(m[0]) : null
    } catch {
      parsed = null
    }
    const items = Array.isArray(parsed?.plano)
      ? parsed.plano.map(String)
      : String(result.text || '')
          .split(/\n+/)
          .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
          .filter(Boolean)
          .slice(0, 8)

    if (!items.length) {
      setError('Não foi possível gerar o plano. Tente novamente.')
      return
    }
    setPlan(items)
    await saveDados({
      _plano_acao: items,
      _plano_prioridade: parsed?.prioridade || '',
      _plano_resumo: parsed?.resumo || '',
      _plano_gerado_em: new Date().toISOString(),
    })
  }

  const fieldEntries = Object.entries(d).filter(
    ([k, v]) =>
      !k.startsWith('_') &&
      k !== 'anexos' &&
      k !== 'tratativas' &&
      v != null &&
      v !== '' &&
      typeof v !== 'object',
  )

  return (
    <div className="drawer-root" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <button type="button" className="drawer-backdrop" aria-label="Fechar" onClick={onClose} />
      <div className="drawer-panel">
        <header className="drawer-head">
          <div className="drawer-head__main">
            <span
              className="drawer-type-icon"
              style={{
                background: tipoMeta?.colorSoft || '#FFF4EC',
                color: tipoMeta?.color || '#FF8A45',
              }}
            >
              <TipoIcon size={18} />
            </span>
            <div className="min-w-0">
              <p className="drawer-kicker">
                {tipoMeta?.label || record.tipo}
                <span className={`gestao-chip gestao-chip--${getCanal(record)}`}>
                  {canalLabel(getCanal(record))}
                </span>
              </p>
              <h2 id="drawer-title" className="drawer-title">
                {numero}
              </h2>
            </div>
          </div>
          <button type="button" className="drawer-close" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </header>

        <div className="drawer-body">
          <div className="drawer-meta">
            <span>
              <Clock size={13} /> {fmtDate(record.created_at)}
            </span>
            <span>
              <User size={13} /> {d.nome || record.user_email || '—'}
              {d.matricula ? ` · Mat. ${d.matricula}` : ''}
            </span>
            <span>
              <MapPin size={13} /> {getLocal(record)}
            </span>
            {getGravidade(record) ? (
              <span className="gestao-badge">{getGravidade(record)}</span>
            ) : null}
            <span className="drawer-status-pill" style={{ color: st.color, borderColor: st.color + '44' }}>
              {st.label}
            </span>
          </div>

          {/* Audio */}
          <section className="drawer-section">
            <h3 className="drawer-section__title">
              <Headphones size={15} /> Áudio
            </h3>
            {audio ? (
              <div className="drawer-audio">
                <audio controls preload="metadata" src={audio.url} className="drawer-audio__player">
                  Seu navegador não suporta áudio.
                </audio>
                <a href={audio.url} target="_blank" rel="noreferrer" className="drawer-link">
                  {audio.name || 'Abrir arquivo'}
                </a>
              </div>
            ) : (
              <p className="drawer-muted">
                Áudio não disponível neste registro (relatos antigos ou canal sem upload de mídia).
                A transcrição, quando houver, aparece abaixo.
              </p>
            )}
          </section>

          {/* Transcript */}
          <section className="drawer-section">
            <h3 className="drawer-section__title">
              <Mic size={15} /> Transcrição
            </h3>
            {transcript ? (
              <div className="drawer-transcript">{transcript}</div>
            ) : (
              <p className="drawer-muted">Sem transcrição salva neste relato.</p>
            )}
          </section>

          {/* Fields */}
          <section className="drawer-section">
            <h3 className="drawer-section__title">
              <FileText size={15} /> Detalhes
            </h3>
            <div className="drawer-fields">
              {fieldEntries.map(([k, v]) => (
                <div key={k} className="drawer-field">
                  <div className="drawer-field__lab">{k.replace(/_/g, ' ')}</div>
                  <div className="drawer-field__val">{formatFieldValue(v)}</div>
                </div>
              ))}
            </div>
          </section>

          {Array.isArray(d.anexos) && d.anexos.length > 0 ? (
            <section className="drawer-section">
              <h3 className="drawer-section__title">
                <Paperclip size={15} /> Anexos
              </h3>
              <div className="drawer-anexos">
                {d.anexos.map((a, i) => (
                  <a key={i} href={a.url} target="_blank" rel="noreferrer" className="drawer-anexo">
                    {a.type?.startsWith('image/') ? (
                      <img src={a.url} alt={a.name || 'anexo'} />
                    ) : (
                      <>
                        <Paperclip size={14} /> {a.name || 'arquivo'}
                      </>
                    )}
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          {/* Action plan */}
          <section className="drawer-section drawer-section--plan">
            <div className="drawer-section__row">
              <h3 className="drawer-section__title">
                <ListChecks size={15} /> Plano de ação
              </h3>
              <button
                type="button"
                className="gestao-btn gestao-btn--ghost drawer-btn-sm"
                onClick={generatePlan}
                disabled={planning || saving}
              >
                {planning ? <Loader2 size={14} className="gestao-spin" /> : <Sparkles size={14} />}
                {plan.length ? 'Regenerar com IA' : 'Gerar com IA'}
              </button>
            </div>
            {plan.length ? (
              <ol className="drawer-plan">
                {plan.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ol>
            ) : (
              <p className="drawer-muted">
                Gere um plano de ação com IA a partir da descrição e da transcrição do relato.
              </p>
            )}
          </section>

          {/* Treatment */}
          <section className="drawer-section drawer-section--treat">
            <h3 className="drawer-section__title">
              <CheckCircle2 size={15} /> Tratativa SSMA
            </h3>
            <label className="drawer-label">
              Status
              <select
                className="gestao-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_LIST.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="drawer-label">
              Notas da tratativa
              <textarea
                className="drawer-textarea"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="O que foi feito, responsável, evidências…"
              />
            </label>
            {error ? <p className="drawer-error">{error}</p> : null}
            <div className="drawer-actions">
              <button
                type="button"
                className="gestao-btn gestao-btn--ghost"
                disabled={saving}
                onClick={() => saveDados({ _tratativa_notas: notes.trim() }, status)}
              >
                {saving ? <Loader2 size={14} className="gestao-spin" /> : null}
                Salvar
              </button>
              <button
                type="button"
                className="gestao-btn gestao-btn--primary"
                disabled={saving}
                onClick={markTratado}
              >
                Marcar tratado
              </button>
              <button
                type="button"
                className="gestao-btn gestao-btn--solid"
                disabled={saving}
                onClick={finalizeTratativa}
              >
                Finalizar tratativa
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
