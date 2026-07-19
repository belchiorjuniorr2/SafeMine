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
import LocationField from '../components/LocationField'

const niveis = ['Baixo', 'Médio', 'Alto']
const nivColor = n => n === 'Alto' ? '#e53935' : n === 'Médio' ? '#f57c00' : '#43a047'

export default function EnvironmentalReport() {
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
      ...getDefaults('ambiental'),
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
      const result = await submitRegistro({ tipo: 'ambiental', dados: f, files, user })
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate('/sucesso', {
        state: {
          type: 'ambiental',
          data: result.dados,
          emailSent: result.emailSent,
          emailTo: result.emailTo,
          emailError: result.emailError,
          queued: result.queued,
          message: result.message,
        },
      })
    } catch (err) {
      setError(err?.message || 'Erro inesperado ao enviar o registro.')
    } finally {
      setSubmitting(false)
    }
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  return (
    <div className="app-shell">
      <Header title="Registro Ambiental" subtitle="Impacto Ambiental" typeVisual={getReportType('ambiental')} />
      <div className="app-main app-main--form">
        <div className="panel">
          <div className="panel__title">Preencher por voz</div>
          <div className="panel__hint">Grave e descreva o impacto ambiental — a IA extrai os dados automaticamente</div>
          <AudioRecorder
            formType="ambiental"
            onResult={handleAI}
            initialTranscript={location.state?._transcript || ''}
            initialAudioBlob={location.state?._audioBlob || null}
          />
        </div>

        <ReporterFields f={f} setF={setF} />

        <div className="panel">
          <div className="panel__heading">Detalhes do Impacto</div>

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
            <LocationField formTipo="ambiental" f={f} setF={setF} label="Local" />
          </div>
          {[['Tipo de Impacto', 'tipo_impacto', 'Ex: Derramamento de óleo'],
            ['Área Afetada', 'area_afetada', 'Ex: 50m²']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <input value={f[key] || ''} onChange={upd(key)} placeholder={ph} style={inputStyle} />
            </div>
          ))}

          {[['Descrição', 'descricao', 'Descreva o impacto...'],
            ['Medida Tomada', 'medida_tomada', 'Ação executada imediatamente...'],
            ['Tratativas Recomendadas', 'tratativas', 'Sugestões da IA ou ações planejadas...']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <textarea value={f[key] || ''} onChange={upd(key)} rows={key === 'tratativas' ? 5 : 3} placeholder={ph} style={inputStyle} />
            </div>
          ))}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Nível de Criticidade</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {niveis.map(n => (
                <button key={n} type="button" onClick={() => setF(p => ({ ...p, nivel_criticidade: n }))} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: `2px solid ${f.nivel_criticidade === n ? nivColor(n) : 'var(--gray-mid)'}`, background: f.nivel_criticidade === n ? `${nivColor(n)}15` : '#fff', color: f.nivel_criticidade === n ? nivColor(n) : 'var(--gray)', fontWeight: 700, fontSize: '13px', transition: 'all 0.15s' }}>{n}</button>
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
