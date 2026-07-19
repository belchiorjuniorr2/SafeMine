import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import Header from '../components/Header'
import AudioRecorder from '../components/AudioRecorder'
import FileAttach from '../components/FileAttach'
import ReporterFields from '../components/ReporterFields'
import SubmitError from '../components/SubmitError'
import { submitRegistro } from '../lib/submitRegistro'
import { mergeAiIntoForm, withoutIdentity } from '../lib/identity'
import { useAuth } from '../context/AuthContext'
import { getReportType } from '../lib/reportTypes'

const tiposInspecao = ['Rotina', 'Especial', 'Auditoria']

export default function SafetyInspection() {
  const navigate = useNavigate()
  const location = useLocation()
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 5)
  const { user } = useAuth()
  const { getDefaults } = useProfile()
  const [f, setF] = useState({ data: today, hora: now })
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const { _prefilled, _suggestions, _transcript, _audioBlob } = location.state || {}
    setF(p => ({
      ...p,
      ...getDefaults('inspecao'),
      ...withoutIdentity(_prefilled || {}),
      ...(_suggestions?.length ? { tratativas: _suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') } : {})
    }))
  }, [])

  const handleAI = (parsed, _t, sugs) => {
    if (parsed._noKey || parsed._error) return
    setF(p => mergeAiIntoForm(p, parsed, sugs))
  }

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const result = await submitRegistro({ tipo: 'inspecao', dados: f, files, user })
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate('/sucesso', { state: { type: 'inspecao', data: result.dados, emailSent: result.emailSent, emailTo: result.emailTo, emailError: result.emailError } })
    } catch (err) {
      setError(err?.message || 'Erro inesperado ao enviar a inspeção.')
    } finally {
      setSubmitting(false)
    }
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="app-shell">
      <Header title="Inspeção de Segurança" subtitle="Inspeção de Campo" typeVisual={getReportType('inspecao')} />
      <div className="app-main app-main--form">
        <div className="panel">
          <div className="panel__title">Preencher por voz</div>
          <div className="panel__hint">Grave os resultados da inspeção — a IA preenche automaticamente</div>
          <AudioRecorder
            formType="inspecao"
            onResult={handleAI}
            initialTranscript={location.state?._transcript || ''}
            initialAudioBlob={location.state?._audioBlob || null}
          />
        </div>

        <ReporterFields f={f} setF={setF} />

        <div className="panel">
          <div className="panel__heading">Dados da inspeção</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Data</label>
              <input type="date" value={f.data || ''} onChange={upd('data')} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Hora</label>
              <input type="time" value={f.hora || ''} onChange={upd('hora')} style={inputStyle} />
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Área Inspecionada</label>
            <input value={f.area_inspecionada || ''} onChange={upd('area_inspecionada')} placeholder="Ex: Pátio de estocagem" style={inputStyle} />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Tipo de Inspeção</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tiposInspecao.map(t => (
                <button key={t} type="button" onClick={() => setF(p => ({ ...p, tipo_inspecao: t }))} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: `2px solid ${f.tipo_inspecao === t ? 'var(--orange)' : 'var(--gray-mid)'}`, background: f.tipo_inspecao === t ? 'rgba(255,94,20,0.1)' : '#fff', color: f.tipo_inspecao === t ? 'var(--orange)' : 'var(--gray)', fontWeight: 700, fontSize: '12px', transition: 'all 0.15s' }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Resultados</div>
          {[['Conformidades', 'conformidades', 'Itens em conformidade...'],
            ['Não Conformidades', 'nao_conformidades', 'Itens fora de conformidade...'],
            ['Recomendações', 'recomendacoes', 'Ações recomendadas...'],
            ['Tratativas Recomendadas', 'tratativas', 'Sugestões da IA ou ações corretivas prioritárias...']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <textarea value={f[key] || ''} onChange={upd(key)} rows={key === 'tratativas' ? 5 : 3} placeholder={ph} style={inputStyle} />
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel__heading">Plano de Ação</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Prazo da Ação</label>
              <input type="date" value={f.prazo_acao || ''} onChange={upd('prazo_acao')} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Responsável</label>
              <input value={f.responsavel_acao || ''} onChange={upd('responsavel_acao')} placeholder="Nome" style={inputStyle} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Anexos</div>
          <FileAttach files={files} onChange={setFiles} />
        </div>

        <SubmitError message={error} />
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar Inspeção'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const submitStyle = { width: '100%', marginTop: '4px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }
