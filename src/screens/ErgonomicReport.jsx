import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import AudioRecorder from '../components/AudioRecorder'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const prioridades = ['Baixa', 'Média', 'Alta']
const priColor = p => p === 'Alta' ? '#e53935' : p === 'Média' ? '#f57c00' : '#43a047'

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical' }
const submitStyle = { width: '100%', marginTop: '16px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }

export default function ErgonomicReport() {
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
    await supabase.from('registros').insert({ tipo: 'ergonomia', dados: f, user_id: user.id, user_email: user.email })
    setSubmitting(false)
    navigate('/sucesso', { state: { type: 'ergonomia', data: f } })
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)', paddingBottom: '32px' }}>
      <Header title="Registro Ergonômico" subtitle="Risco Ergonômico" />
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>Preencher por voz</div>
          <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Grave e descreva o risco ergonômico — a IA extrai os dados automaticamente</div>
          <AudioRecorder formType="ergonomia" onResult={handleAI} />
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Detalhes do Risco
          </div>

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

          {[['Colaborador', 'colaborador', 'Nome completo'],
            ['Função', 'funcao', 'Ex: Operador de equipamento'],
            ['Posto de Trabalho', 'posto_trabalho', 'Ex: Cabine do escavador']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <input value={f[key] || ''} onChange={upd(key)} placeholder={ph} style={inputStyle} />
            </div>
          ))}

          {[['Descrição do Risco', 'descricao_risco', 'Descreva o risco identificado...'],
            ['Sintoma Relatado', 'sintoma_relatado', 'Ex: Dor lombar, fadiga...'],
            ['Recomendação', 'recomendacao', 'Medidas recomendadas...']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <textarea value={f[key] || ''} onChange={upd(key)} rows={3} placeholder={ph} style={inputStyle} />
            </div>
          ))}

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Prioridade</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {prioridades.map(p => (
                <button
                  key={p}
                  onClick={() => setF(prev => ({ ...prev, prioridade: p }))}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: '10px',
                    border: `2px solid ${f.prioridade === p ? priColor(p) : 'var(--gray-mid)'}`,
                    background: f.prioridade === p ? `${priColor(p)}15` : '#fff',
                    color: f.prioridade === p ? priColor(p) : 'var(--gray)',
                    fontWeight: 700, fontSize: '13px', transition: 'all 0.15s'
                  }}
                >{p}</button>
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{ ...submitStyle, background: submitting ? 'var(--gray)' : 'var(--orange)' }}>
          {submitting ? 'Enviando...' : 'Enviar Registro'}
        </button>
      </div>
    </div>
  )
}
