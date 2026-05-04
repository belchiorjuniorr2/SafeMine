import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import AudioRecorder from '../components/AudioRecorder'
import FileAttach from '../components/FileAttach'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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
  const today = new Date().toISOString().slice(0, 10)
  const { user } = useAuth()
  const initChecklist = Object.fromEntries(checklistItems.map(i => [i.key, 'OK']))
  const [f, setF] = useState({ data: today, ...initChecklist })
  const [files, setFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

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
    await supabase.from('registros').insert({ tipo: 'veiculo', dados, user_id: user.id, user_email: user.email })
    setSubmitting(false)
    navigate('/sucesso', { state: { type: 'veiculo', data: dados } })
  }

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))
  const setStatus = (key, val) => setF(p => ({ ...p, [key]: val }))

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)', paddingBottom: '32px' }}>
      <Header title="Checklist de Veículo" subtitle="Inspeção Diária" />
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)', marginBottom: '4px' }}>Preencher por voz</div>
          <div style={{ fontSize: '12px', color: 'var(--gray)' }}>Grave os dados do veículo — a IA preenche automaticamente</div>
          <AudioRecorder formType="veiculo" onResult={handleAI} />
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Dados do Veículo
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            {[['Placa', 'placa', 'ABC-1234'], ['Modelo', 'modelo', 'Ex: Caminhão 740'], ['KM Atual', 'km_atual', '00000'], ['Turno', 'turno', 'Ex: Manhã']].map(([label, key, ph]) => (
              <div key={key} style={{ marginBottom: '16px' }}>
                <label style={labelStyle}>{label}</label>
                <input value={f[key] || ''} onChange={upd(key)} placeholder={ph} style={inputStyle} />
              </div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Data</label>
              <input type="date" value={f.data || ''} onChange={upd('data')} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '0' }}>
              <label style={labelStyle}>Operador</label>
              <input value={f.operador || ''} onChange={upd('operador')} placeholder="Nome do operador" style={inputStyle} />
            </div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '12px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Itens de Verificação
          </div>
          {checklistItems.map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '12px', marginBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
              <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-dark)' }}>{label}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {['OK', 'NOK', 'NA'].map(s => (
                  <button key={s} onClick={() => setStatus(key, s)} style={{ padding: '6px 12px', borderRadius: '8px', border: `2px solid ${f[key] === s ? statusColors[s] : 'var(--gray-mid)'}`, background: f[key] === s ? `${statusColors[s]}18` : '#fff', color: f[key] === s ? statusColors[s] : 'var(--gray)', fontWeight: 700, fontSize: '12px', transition: 'all 0.15s' }}>{s}</button>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: '4px' }}>
            <label style={labelStyle}>Tratativas Recomendadas</label>
            <textarea value={f.tratativas || ''} onChange={upd('tratativas')} rows={5} placeholder="Sugestões da IA ou observações sobre itens NOK..." style={inputStyle} />
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>Anexos</div>
          <FileAttach files={files} onChange={setFiles} />
        </div>

        <button onClick={handleSubmit} disabled={submitting} style={{ ...submitStyle, background: submitting ? 'var(--gray)' : 'var(--orange)' }}>
          {submitting ? 'Enviando...' : 'Enviar Checklist'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }
const submitStyle = { width: '100%', marginTop: '16px', padding: '16px', borderRadius: '14px', border: 'none', background: 'var(--orange)', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 16px rgba(255,94,20,0.35)' }
