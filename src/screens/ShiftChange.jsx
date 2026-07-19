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

const turnos = ['Manhã', 'Tarde', 'Noite']

export default function ShiftChange() {
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
      ...getDefaults('turno'),
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
      const result = await submitRegistro({ tipo: 'turno', dados: f, files, user })
      if (!result.ok) {
        setError(result.error)
        return
      }
      navigate('/sucesso', { state: { type: 'turno', data: result.dados, emailSent: result.emailSent, emailTo: result.emailTo, emailError: result.emailError } })
    } catch (err) {
      setError(err?.message || 'Erro inesperado ao enviar a passagem de turno.')
    } finally {
      setSubmitting(false)
    }
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  const TurnoSelect = ({ label, field: fkey }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {turnos.map(t => (
          <button key={t} type="button" onClick={() => setF(p => ({ ...p, [fkey]: t }))} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: `2px solid ${f[fkey] === t ? 'var(--orange)' : 'var(--gray-mid)'}`, background: f[fkey] === t ? 'rgba(255,94,20,0.1)' : '#fff', color: f[fkey] === t ? 'var(--orange)' : 'var(--gray)', fontWeight: 700, fontSize: '12px', transition: 'all 0.15s' }}>{t}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div className="app-shell">
      <Header title="Passagem de Turno" subtitle="Troca de Turno" typeVisual={getReportType('turno')} />
      <div className="app-main app-main--form">
        <div className="panel">
          <div className="panel__title">Preencher por voz</div>
          <div className="panel__hint">Grave as informações da passagem de turno — a IA preenche automaticamente</div>
          <AudioRecorder
            formType="turno"
            onResult={handleAI}
            initialTranscript={location.state?._transcript || ''}
            initialAudioBlob={location.state?._audioBlob || null}
          />
        </div>

        <ReporterFields f={f} setF={setF} />

        <div className="panel">
          <div className="panel__heading">Informações Gerais</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Data</label>
              <input type="date" value={f.data || ''} onChange={upd('data')} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Frente de Trabalho</label>
              <input value={f.frente_trabalho || ''} onChange={upd('frente_trabalho')} placeholder="Ex: Frente Norte" style={inputStyle} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Turno Saindo</div>
          <TurnoSelect label="Turno de Saída" field="turno_saida" />
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Supervisor de Saída</label>
            <input value={f.supervisor_saida || ''} onChange={upd('supervisor_saida')} placeholder="Nome do supervisor" style={inputStyle} />
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Turno Entrando</div>
          <TurnoSelect label="Turno de Entrada" field="turno_entrada" />
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Supervisor de Entrada</label>
            <input value={f.supervisor_entrada || ''} onChange={upd('supervisor_entrada')} placeholder="Nome do supervisor" style={inputStyle} />
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Status Operacional</div>
          {[['Equipamentos Operando', 'equipamentos_operando', 'Liste os equipamentos ativos...'],
            ['Ocorrências', 'ocorrencias', 'Registre ocorrências do turno...'],
            ['Pendências', 'pendencias', 'Itens pendentes para o próximo turno...'],
            ['Observações', 'observacoes', 'Observações adicionais...'],
            ['Tratativas Recomendadas', 'tratativas', 'Sugestões da IA ou ações prioritárias...']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <textarea value={f[key] || ''} onChange={upd(key)} rows={key === 'tratativas' ? 5 : 3} placeholder={ph} style={inputStyle} />
            </div>
          ))}
        </div>

        <div className="panel">
          <div className="panel__heading">Anexos</div>
          <FileAttach files={files} onChange={setFiles} />
        </div>

        <SubmitError message={error} />
        <button type="button" className="btn-primary" onClick={handleSubmit} disabled={submitting}>
          {submitting ? 'Enviando...' : 'Confirmar Passagem de Turno'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const submitStyle = { width: '100%', marginTop: '4px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }
