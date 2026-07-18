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

const gravidades = ['Leve', 'Moderado', 'Grave']

const field = (label, key, fields, set, opts = {}) => (
  <div key={key} style={{ marginBottom: '16px' }}>
    <label style={labelStyle}>{label}</label>
    {opts.textarea ? (
      <textarea value={fields[key] || ''} onChange={e => set(p => ({ ...p, [key]: e.target.value }))} rows={opts.rows || 3} style={inputStyle} placeholder={opts.placeholder || ''} />
    ) : (
      <input type={opts.type || 'text'} value={fields[key] || ''} onChange={e => set(p => ({ ...p, [key]: e.target.value }))} style={inputStyle} placeholder={opts.placeholder || ''} />
    )}
  </div>
)

export default function SafetyReport() {
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
      ...getDefaults('seguranca'),
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
      const result = await submitRegistro({ tipo: 'seguranca', dados: f, files, user })
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate('/sucesso', { state: { type: 'seguranca', data: result.dados, emailSent: result.emailSent, emailTo: result.emailTo, emailError: result.emailError } })
    } catch (err) {
      setError(err?.message || 'Erro inesperado ao enviar o registro.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <Header title="Registro de Segurança" subtitle="Ocorrência de Segurança" icon="/icons/seguranca.png" />
      <div className="app-main app-main--form">
        <div className="panel">
          <div className="panel__title">Preencher por voz</div>
          <div className="panel__hint">Grave e descreva a ocorrência — a IA extrai os dados automaticamente</div>
          <AudioRecorder
            formType="seguranca"
            onResult={handleAI}
            initialTranscript={location.state?._transcript || ''}
            initialAudioBlob={location.state?._audioBlob || null}
          />
        </div>

        <ReporterFields f={f} setF={setF} />

        <div className="panel">
          <div className="panel__heading">Detalhes da Ocorrência</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Data</label>
              <input type="date" value={f.data || ''} onChange={e => setF(p => ({ ...p, data: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Hora</label>
              <input type="time" value={f.hora || ''} onChange={e => setF(p => ({ ...p, hora: e.target.value }))} style={inputStyle} />
            </div>
          </div>

          {field('Local', 'local', f, setF, { placeholder: 'Ex: Frente de lavra Norte' })}
          {field('Descrição da Ocorrência', 'descricao_ocorrencia', f, setF, { textarea: true, placeholder: 'Descreva o que aconteceu...' })}
          {field('Causa Raiz', 'causa_raiz', f, setF, { textarea: true, placeholder: 'Identifique a causa...' })}
          {field('Ação Imediata', 'acao_imediata', f, setF, { textarea: true, placeholder: 'Medidas tomadas imediatamente...' })}
          {field('Tratativas Recomendadas', 'tratativas', f, setF, { textarea: true, rows: 5, placeholder: 'Sugestões da IA ou ações planejadas...' })}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Gravidade</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {gravidades.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setF(p => ({ ...p, gravidade: g }))}
                  style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: `2px solid ${f.gravidade === g ? gravColor(g) : 'var(--gray-mid)'}`, background: f.gravidade === g ? `${gravColor(g)}15` : '#fff', color: f.gravidade === g ? gravColor(g) : 'var(--gray)', fontWeight: 700, fontSize: '13px', transition: 'all 0.15s' }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Anexos</div>
          <FileAttach files={files} onChange={setFiles} />
        </div>

        <SubmitError message={error} />
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar Registro'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const submitStyle = { width: '100%', marginTop: '4px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }
const gravColor = g => g === 'Grave' ? '#e53935' : g === 'Moderado' ? '#f57c00' : '#43a047'
