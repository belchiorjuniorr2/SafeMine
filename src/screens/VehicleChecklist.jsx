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

const checklistItems = [
  { key: 'pneus', label: 'Pneus' },
  { key: 'freios', label: 'Freios' },
  { key: 'luzes', label: 'Luzes' },
  { key: 'buzina', label: 'Buzina' },
  { key: 'extintor', label: 'Extintor' },
  { key: 'triangulo', label: 'Triângulo' },
  { key: 'cinto', label: 'Cinto de Segurança' },
  { key: 'retrovisores', label: 'Retrovisores' },
  { key: 'oleo', label: 'Óleo do Motor' },
  { key: 'agua', label: 'Água/Radiador' },
  { key: 'combustivel', label: 'Combustível' },
]

const statusColors = { OK: '#43a047', NOK: '#e53935', NA: '#808184' }

export default function VehicleChecklist() {
  const navigate = useNavigate()
  const location = useLocation()
  const today = new Date().toISOString().slice(0, 10)
  const { user } = useAuth()
  const { getDefaults } = useProfile()
  const initChecklist = Object.fromEntries(checklistItems.map(i => [i.key, 'OK']))
  const [f, setF] = useState({ data: today, ...initChecklist })
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const { _prefilled, _transcript, _audioBlob } = location.state || {}
    setF(p => ({ ...p, ...getDefaults('veiculo'), ...withoutIdentity(_prefilled || {}) }))
  }, [])

  const handleAI = (parsed, _t, sugs) => {
    if (parsed._noKey || parsed._error) return
    setF(p => mergeAiIntoForm(p, parsed, sugs))
  }

  const handleSubmit = async () => {
    setError('')
    setSubmitting(true)
    try {
      const result = await submitRegistro({ tipo: 'veiculo', dados: f, files, user })
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate('/sucesso', {
        state: {
          type: 'veiculo',
          data: result.dados,
          emailSent: result.emailSent,
          emailTo: result.emailTo,
          emailError: result.emailError,
          queued: result.queued,
          message: result.message,
        },
      })
    } catch (err) {
      setError(err?.message || 'Erro inesperado ao enviar o checklist.')
    } finally {
      setSubmitting(false)
    }
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))
  const setStatus = (key, val) => setF(p => ({ ...p, [key]: val }))

  return (
    <div className="app-shell">
      <Header title="Checklist de Veículo" subtitle="Inspeção Diária" typeVisual={getReportType('veiculo')} />
      <div className="app-main app-main--form">
        <div className="panel">
          <div className="panel__title">Preencher por voz</div>
          <div className="panel__hint">Grave os dados do veículo — a IA preenche automaticamente</div>
          <AudioRecorder
            formType="veiculo"
            onResult={handleAI}
            initialTranscript={location.state?._transcript || ''}
            initialAudioBlob={location.state?._audioBlob || null}
          />
        </div>

        <ReporterFields f={f} setF={setF} />

        <div className="panel">
          <div className="panel__heading">Dados do Veículo</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            {[['Placa', 'placa', 'ABC-1234'], ['Modelo', 'modelo', 'Ex: Caminhão 740'], ['KM Atual', 'km_atual', '00000'], ['Turno', 'turno', 'Ex: Manhã']].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>{label}</label>
                <input value={f[key] || ''} onChange={upd(key)} placeholder={ph} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ marginBottom: '0' }}>
            <label style={labelStyle}>Data</label>
            <input type="date" value={f.data || ''} onChange={upd('data')} style={inputStyle} />
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Itens de Verificação</div>
          {checklistItems.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dark)' }}>{label}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['OK', 'NOK', 'NA'].map(s => (
                  <button key={s} type="button" onClick={() => setStatus(key, s)} style={{ padding: '6px 12px', borderRadius: '8px', border: `2px solid ${f[key] === s ? statusColors[s] : 'var(--gray-mid)'}`, background: f[key] === s ? `${statusColors[s]}18` : '#fff', color: f[key] === s ? statusColors[s] : 'var(--gray)', fontWeight: 700, fontSize: '12px', transition: 'all 0.15s' }}>{s}</button>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: '4px' }}>
            <label style={labelStyle}>Tratativas Recomendadas</label>
            <textarea value={f.tratativas || ''} onChange={upd('tratativas')} rows={5} placeholder="Sugestões da IA ou observações sobre itens NOK..." style={inputStyle} />
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Anexos</div>
          <FileAttach files={files} onChange={setFiles} />
        </div>

        <SubmitError message={error} />
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Enviando...' : 'Enviar Checklist'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const submitStyle = { width: '100%', marginTop: '4px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }
