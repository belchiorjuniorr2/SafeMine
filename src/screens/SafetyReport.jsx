import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import AudioRecorder from '../components/AudioRecorder'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const gravidades = ['Leve', 'Moderado', 'Grave']

const field = (label, key, fields, set, opts = {}) => (
  <div key={key} style={{ marginBottom: '16px' }}>
    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }}>
      {label}
    </label>
    {opts.textarea ? (
      <textarea
        value={fields[key] || ''}
        onChange={e => set(p => ({ ...p, [key]: e.target.value }))}
        rows={3}
        style={inputStyle}
        placeholder={opts.placeholder || ''}
      />
    ) : (
      <input
        type={opts.type || 'text'}
        value={fields[key] || ''}
        onChange={e => set(p => ({ ...p, [key]: e.target.value }))}
        style={inputStyle}
        placeholder={opts.placeholder || ''}
      />
    )}
  </div>
)

const inputStyle = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: '10px',
  border: '1.5px solid var(--gray-mid)',
  fontSize: '14px',
  color: 'var(--text-dark)',
  background: '#fff',
  outline: 'none',
  resize: 'vertical'
}

export default function SafetyReport() {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toTimeString().slice(0, 5)

  const { user } = useAuth()
  const [f, setF] = useState({ data: today, hora: now })
  const [submitting, setSubmitting] = useState(false)

  const handleAI = (parsed) => {
    if (!parsed._noKey && !parsed._error) setF(p => ({ ...p, ...parsed }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    await supabase.from('registros').insert({ tipo: 'seguranca', dados: f, user_id: user.id, user_email: user.email })
    setSubmitting(false)
    navigate('/sucesso', { state: { type: 'seguranca', data: f } })
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)', paddingBottom: '32px' }}>
      <Header title="Registro de Segurança" subtitle="Ocorrência de Segurança" />
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>Preencher por voz</div>
          <div style={{ fontSize: '12px', color: 'var(--gray)', marginBottom: '0' }}>Grave e descreva a ocorrência — a IA extrai os dados automaticamente</div>
          <AudioRecorder formType="seguranca" onResult={handleAI} />
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Detalhes da Ocorrência
          </div>

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
          {field('Colaborador', 'colaborador', f, setF, { placeholder: 'Nome completo' })}
          {field('Descrição da Ocorrência', 'descricao_ocorrencia', f, setF, { textarea: true, placeholder: 'Descreva o que aconteceu...' })}
          {field('Causa Raiz', 'causa_raiz', f, setF, { textarea: true, placeholder: 'Identifique a causa...' })}
          {field('Ação Imediata', 'acao_imediata', f, setF, { textarea: true, placeholder: 'Medidas tomadas imediatamente...' })}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Gravidade</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {gravidades.map(g => (
                <button
                  key={g}
                  onClick={() => setF(p => ({ ...p, gravidade: g }))}
                  style={{
                    flex: 1,
                    padding: '10px 0',
                    borderRadius: '10px',
                    border: `2px solid ${f.gravidade === g ? gravColor(g) : 'var(--gray-mid)'}`,
                    background: f.gravidade === g ? `${gravColor(g)}15` : '#fff',
                    color: f.gravidade === g ? gravColor(g) : 'var(--gray)',
                    fontWeight: 700,
                    fontSize: '13px',
                    transition: 'all 0.15s'
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{ ...submitStyle, background: submitting ? 'var(--gray)' : undefined }}
        >
          {submitting ? 'Enviando...' : 'Enviar Registro'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const submitStyle = { width: '100%', marginTop: '16px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }
const gravColor = g => g === 'Grave' ? '#e53935' : g === 'Moderado' ? '#f57c00' : '#43a047'
