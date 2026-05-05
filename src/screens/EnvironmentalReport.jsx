import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import Header from '../components/Header'
import AudioRecorder from '../components/AudioRecorder'
import FileAttach from '../components/FileAttach'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

  useEffect(() => {
    const { _prefilled, _suggestions } = location.state || {}
    setF(p => ({
      ...p,
      ...getDefaults('ambiental'),
      ..._prefilled,
      ...(_suggestions?.length ? { tratativas: _suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n') } : {})
    }))
  }, [])

  const handleAI = (parsed, _t, sugs) => {
    if (parsed._noKey || parsed._error) return
    const update = { ...parsed }
    if (sugs?.length) update.tratativas = sugs.map((s, i) => `${i + 1}. ${s}`).join('\n')
    setF(p => ({ ...p, ...update }))
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    let anexos = []
    for (const file of files) {
      const path = `${user.id}/${Date.now()}_${file.name}`
      const { error } = await supabase.storage.from('relatos-anexos').upload(path, file)
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from('relatos-anexos').getPublicUrl(path)
        anexos.push({ url: publicUrl, name: file.name, type: file.type })
      }
    }
    const dados = { ...f, ...(anexos.length ? { anexos } : {}) }
    await supabase.from('registros').insert({ tipo: 'ambiental', dados, user_id: user.id, user_email: user.email })
    setSubmitting(false)
    navigate('/sucesso', { state: { type: 'ambiental', data: dados } })
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)', paddingBottom: '32px' }}>
      <Header title="Registro Ambiental" subtitle="Impacto Ambiental" />
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>Preencher por voz</div>
          <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Grave e descreva o impacto ambiental — a IA extrai os dados automaticamente</div>
          <AudioRecorder formType="ambiental" onResult={handleAI} />
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Detalhes do Impacto
          </div>

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

          {[['Local', 'local', 'Ex: Bacia de contenção Sul'],
            ['Responsável', 'responsavel', 'Nome do responsável'],
            ['Tipo de Impacto', 'tipo_impacto', 'Ex: Derramamento de óleo'],
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
                <button key={n} onClick={() => setF(p => ({ ...p, nivel_criticidade: n }))} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: `2px solid ${f.nivel_criticidade === n ? nivColor(n) : 'var(--gray-mid)'}`, background: f.nivel_criticidade === n ? `${nivColor(n)}15` : '#fff', color: f.nivel_criticidade === n ? nivColor(n) : 'var(--gray)', fontWeight: 700, fontSize: '13px', transition: 'all 0.15s' }}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>Anexos</div>
          <FileAttach files={files} onChange={setFiles} />
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{ ...submitStyle, background: submitting ? 'var(--gray)' : 'var(--orange)' }}>
          {submitting ? 'Enviando...' : 'Enviar Registro'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const submitStyle = { width: '100%', marginTop: '16px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }
