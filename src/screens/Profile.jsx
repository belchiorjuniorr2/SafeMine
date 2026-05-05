import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, ChevronLeft, Check, Briefcase, Hash, Layers } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'

const turnos = ['Manhã', 'Tarde', 'Noite']

export default function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, setProfile } = useProfile()
  const [f, setF] = useState({ ...profile })
  const [saved, setSaved] = useState(false)

  const upd = key => e => setF(p => ({ ...p, [key]: e.target.value }))

  const handleSave = () => {
    setProfile(f)
    setSaved(true)
    setTimeout(() => { setSaved(false); navigate('/') }, 1200)
  }

  const hasChanges = JSON.stringify(f) !== JSON.stringify(profile)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)', paddingBottom: '32px' }}>
      {/* Header */}
      <header style={{ background: '#1a1a1a', padding: '0' }}>
        <div style={{ background: 'var(--orange)', height: '3px', width: '100%' }} />
        <div style={{ padding: '16px 16px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <ChevronLeft size={20} color="#fff" />
          </button>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: '18px' }}>Meu Perfil</div>
            <div style={{ color: 'var(--orange)', fontSize: '11px', fontWeight: 500 }}>Dados preenchidos automaticamente nos relatos</div>
          </div>
        </div>
      </header>

      <div style={{ padding: '16px' }}>
        {/* Avatar + email */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '20px 16px', boxShadow: 'var(--shadow)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--orange)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <User size={28} color="#fff" />
          </div>
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontWeight: 800, fontSize: '16px', color: 'var(--text-dark)', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {f.nome || 'Sem nome cadastrado'}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--gray)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.email}
            </div>
          </div>
        </div>

        {/* Info banner */}
        <div style={{ background: '#fff8f0', border: '1.5px solid rgba(255,94,20,0.2)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '18px', flexShrink: 0 }}>⚡</span>
          <div style={{ fontSize: '12px', color: 'var(--text-mid)', lineHeight: 1.5 }}>
            Esses dados são preenchidos automaticamente nos campos de <strong>colaborador</strong>, <strong>responsável</strong>, <strong>operador</strong> e <strong>inspetor</strong> em todos os relatos.
          </div>
        </div>

        {/* Form */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Identificação
          </div>

          {/* Nome */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Nome Completo</label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="var(--gray)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={f.nome || ''}
                onChange={upd('nome')}
                placeholder="Seu nome completo"
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Matrícula */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Matrícula</label>
            <div style={{ position: 'relative' }}>
              <Hash size={15} color="var(--gray)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={f.matricula || ''}
                onChange={upd('matricula')}
                placeholder="Ex: 00123"
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Função */}
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Função / Cargo</label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={15} color="var(--gray)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={f.funcao || ''}
                onChange={upd('funcao')}
                placeholder="Ex: Operador de Pá Carregadeira"
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>
          </div>

          {/* Setor */}
          <div style={{ marginBottom: '0' }}>
            <label style={labelStyle}>Setor / Área</label>
            <div style={{ position: 'relative' }}>
              <Layers size={15} color="var(--gray)" style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input
                value={f.setor || ''}
                onChange={upd('setor')}
                placeholder="Ex: Mina de Ferro — Frente Sul"
                style={{ ...inputStyle, paddingLeft: '36px' }}
              />
            </div>
          </div>
        </div>

        {/* Turno padrão */}
        <div style={{ background: '#fff', borderRadius: '16px', padding: '16px', boxShadow: 'var(--shadow)', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid var(--gray-light)' }}>
            Turno Padrão
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {turnos.map(t => (
              <button
                key={t}
                onClick={() => setF(p => ({ ...p, turno: t }))}
                style={{
                  flex: 1, padding: '10px 0', borderRadius: '10px',
                  border: `2px solid ${f.turno === t ? 'var(--orange)' : 'var(--gray-mid)'}`,
                  background: f.turno === t ? 'rgba(255,94,20,0.08)' : '#fff',
                  color: f.turno === t ? 'var(--orange)' : 'var(--gray)',
                  fontWeight: 700, fontSize: '13px', transition: 'all 0.15s', cursor: 'pointer'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={!hasChanges && !saved}
          style={{
            width: '100%',
            padding: '16px',
            borderRadius: '14px',
            border: 'none',
            background: saved ? '#43a047' : hasChanges ? 'var(--orange)' : 'var(--gray-mid)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            boxShadow: saved ? '0 4px 16px rgba(67,160,71,0.4)' : hasChanges ? '0 4px 16px rgba(255,94,20,0.35)' : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            cursor: hasChanges || saved ? 'pointer' : 'default',
          }}
        >
          {saved ? <><Check size={18} /> Salvo!</> : 'Salvar Perfil'}
        </button>
      </div>
    </div>
  )
}

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '12px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', background: '#fff', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
