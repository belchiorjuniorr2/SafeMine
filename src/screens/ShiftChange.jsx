import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import AudioRecorder from '../components/AudioRecorder'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical' }
const submitStyle = { width: '100%', marginTop: '16px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }

const turnos = ['Manhã', 'Tarde', 'Noite']

export default function ShiftChange() {
  const navigate = useNavigate()
  const today = new Date().toISOString().slice(0, 10)
  const { user } = useAuth()
  const [f, setF] = useState({ data: today })
  const [submitting, setSubmitting] = useState(false)

  const handleAI = (parsed) => {
    if (!parsed._noKey && !parsed._error) setF(p => ({ ...p, ...parsed }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    await supabase.from('registros').insert({ tipo: 'turno', dados: f, user_id: user.id, user_email: user.email })
    setSubmitting(false)
    navigate('/sucesso', { state: { type: 'turno', data: f } })
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  const TurnoSelect = ({ label, field: fkey }) => (
    <div style={{ marginBottom: '16px' }}>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: 'flex', gap: '8px' }}>
        {turnos.map(t => (
          <button
            key={t}
            onClick={() => setF(p => ({ ...p, [fkey]: t }))}
            style={{
              flex: 1, padding: '10px 0', borderRadius: '10px',
              border: `2px solid ${f[fkey] === t ? 'var(--orange)' : 'var(--gray-mid)'}`,
              background: f[fkey] === t ? 'rgba(255,94,20,0.1)' : '#fff',
              color: f[fkey] === t ? 'var(--orange)' : 'var(--gray)',
              fontWeight: 700, fontSize: '12px', transition: 'all 0.15s'
            }}
          >{t}</button>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)', paddingBottom: '32px' }}>
      <Header title="Passagem de Turno" subtitle="Troca de Turno" />
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>Preencher por voz</div>
          <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Grave as informações da passagem de turno — a IA preenche automaticamente</div>
          <AudioRecorder formType="turno" onResult={handleAI} />
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Informações Gerais
          </div>

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

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Turno Saindo
          </div>
          <TurnoSelect label="Turno de Saída" field="turno_saida" />
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Supervisor de Saída</label>
            <input value={f.supervisor_saida || ''} onChange={upd('supervisor_saida')} placeholder="Nome do supervisor" style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Turno Entrando
          </div>
          <TurnoSelect label="Turno de Entrada" field="turno_entrada" />
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Supervisor de Entrada</label>
            <input value={f.supervisor_entrada || ''} onChange={upd('supervisor_entrada')} placeholder="Nome do supervisor" style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Status Operacional
          </div>

          {[['Equipamentos Operando', 'equipamentos_operando', 'Liste os equipamentos ativos...'],
            ['Ocorrências', 'ocorrencias', 'Registre ocorrências do turno...'],
            ['Pendências', 'pendencias', 'Itens pendentes para o próximo turno...'],
            ['Observações', 'observacoes', 'Observações adicionais...']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <textarea value={f[key] || ''} onChange={upd(key)} rows={3} placeholder={ph} style={inputStyle} />
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{ ...submitStyle, background: submitting ? 'var(--gray)' : undefined }}>
          {submitting ? 'Enviando...' : 'Confirmar Passagem de Turno'}
        </button>
      </div>
    </div>
  )
}
