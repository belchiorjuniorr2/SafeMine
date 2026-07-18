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

const prioridades = ['Baixa', 'Média', 'Alta']
const priColor = p => p === 'Alta' ? '#e53935' : p === 'Média' ? '#f57c00' : '#43a047'

export default function ErgonomicReport() {
  const navigate = useNavigate()
  const location = useLocation()
  const today = new Date().toISOString().slice(0, 10)
  const { user } = useAuth()
  const { getDefaults } = useProfile()
  const [f, setF] = useState({ data: today })
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const { _prefilled, _suggestions, _transcript, _audioBlob } = location.state || {}
    setF(p => ({
      ...p,
      ...getDefaults('ergonomia'),
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
      const result = await submitRegistro({ tipo: 'ergonomia', dados: f, files, user })
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate('/sucesso', { state: { type: 'ergonomia', data: result.dados, emailSent: result.emailSent, emailTo: result.emailTo, emailError: result.emailError } })
    } catch (err) {
      setError(err?.message || 'Erro inesperado ao enviar o registro.')
    } finally {
      setSubmitting(false)
    }
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="app-shell">
      <Header title="Registro Ergonômico" subtitle="Risco Ergonômico" icon="/icons/ergonomia.png" />
      <div className="app-main app-main--form">
        <div className="panel">
          <div className="panel__title">Preencher por voz</div>
          <div className="panel__hint">Grave e descreva o risco ergonômico — a IA extrai os dados automaticamente</div>
          <AudioRecorder
            formType="ergonomia"
            onResult={handleAI}
            initialTranscript={location.state?._transcript || ''}
            initialAudioBlob={location.state?._audioBlob || null}
          />
        </div>

        <ReporterFields f={f} setF={setF} />

        <div className="panel">
          <div className="panel__heading">Detalhes do Risco</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Data</label>
              <input type="date" value={f.data || ''} onChange={upd('data')} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Setor</label>
              <input value={f.setor || ''} onChange={upd('setor')} placeholder="Ex: Manutenção" style={inputStyle} />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Posto de Trabalho</label>
            <input value={f.posto_trabalho || ''} onChange={upd('posto_trabalho')} placeholder="Ex: Cabine do escavador" style={inputStyle} />
          </div>

          {[['Descrição do Risco', 'descricao_risco', 'Descreva o risco identificado...'],
            ['Sintoma Relatado', 'sintoma_relatado', 'Ex: Dor lombar, fadiga...'],
            ['Recomendação', 'recomendacao', 'Medidas recomendadas...'],
            ['Tratativas Recomendadas', 'tratativas', 'Sugestões da IA ou ações planejadas...']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <textarea value={f[key] || ''} onChange={upd(key)} rows={key === 'tratativas' ? 5 : 3} placeholder={ph} style={inputStyle} />
            </div>
          ))}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Prioridade</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {prioridades.map(p => (
                <button key={p} type="button" onClick={() => setF(prev => ({ ...prev, prioridade: p }))} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: `2px solid ${f.prioridade === p ? priColor(p) : 'var(--gray-mid)'}`, background: f.prioridade === p ? `${priColor(p)}15` : '#fff', color: f.prioridade === p ? priColor(p) : 'var(--gray)', fontWeight: 700, fontSize: '13px', transition: 'all 0.15s' }}>{p}</button>
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
