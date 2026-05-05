import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useProfile } from '../context/ProfileContext'
import Header from '../components/Header'
import AudioRecorder from '../components/AudioRecorder'
import FileAttach from '../components/FileAttach'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

  useEffect(() => {
    const { _prefilled, _suggestions } = location.state || {}
    setF(p => ({
      ...p,
      ...getDefaults('inspecao'),
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
    await supabase.from('registros').insert({ tipo: 'inspecao', dados, user_id: user.id, user_email: user.email })
    setSubmitting(false)
    navigate('/sucesso', { state: { type: 'inspecao', data: dados } })
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)', paddingBottom: '32px' }}>
      <Header title="Inspeção de Segurança" subtitle="Inspeção de Campo" />
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>Preencher por voz</div>
          <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Grave os resultados da inspeção — a IA preenche automaticamente</div>
          <AudioRecorder formType="inspecao" onResult={handleAI} />
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>Identificação</div>
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
          {[['Área Inspecionada', 'area_inspecionada', 'Ex: Pátio de estocagem'],
            ['Inspetor', 'inspector', 'Nome do inspetor']].map(([label, key, ph]) => (
            <div key={key} style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>{label}</label>
              <input value={f[key] || ''} onChange={upd(key)} placeholder={ph} style={inputStyle} />
            </div>
          ))}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Tipo de Inspeção</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {tiposInspecao.map(t => (
                <button key={t} onClick={() => setF(p => ({ ...p, tipo_inspecao: t }))} style={{ flex: 1, padding: '10px 0', borderRadius: '10px', border: `2px solid ${f.tipo_inspecao === t ? 'var(--orange)' : 'var(--gray-mid)'}`, background: f.tipo_inspecao === t ? 'rgba(255,94,20,0.1)' : '#fff', color: f.tipo_inspecao === t ? 'var(--orange)' : 'var(--gray)', fontWeight: 700, fontSize: '12px', transition: 'all 0.15s' }}>{t}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>Resultados</div>
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

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>Plano de Ação</div>
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

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>Anexos</div>
          <FileAttach files={files} onChange={setFiles} />
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{ ...submitStyle, background: submitting ? 'var(--gray)' : 'var(--orange)' }}>
          {submitting ? 'Enviando...' : 'Enviar Inspeção'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const submitStyle = { width: '100%', marginTop: '16px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }
