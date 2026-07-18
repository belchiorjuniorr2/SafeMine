import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Check, Briefcase, Hash, Layers, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import Header from '../components/Header'

const turnos = ['Manhã', 'Tarde', 'Noite']

export default function Profile() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, setProfile, saving } = useProfile()
  const [f, setF] = useState({ ...profile })
  const [saved, setSaved] = useState(false)
  const initialized = useRef(false)

  useEffect(() => {
    const hasData = Object.values(profile).some(Boolean)
    if (!hasData && initialized.current) return
    if (hasData) initialized.current = true
    setF({ ...profile })
  }, [profile])

  const upd = (key) => (e) => setF((p) => ({ ...p, [key]: e.target.value }))

  const handleSave = async () => {
    const ok = await setProfile(f)
    if (ok) {
      setSaved(true)
      setTimeout(() => {
        setSaved(false)
        navigate('/')
      }, 1200)
    } else {
      alert('Não foi possível salvar o perfil. Tente novamente.')
    }
  }

  const hasChanges = JSON.stringify(f) !== JSON.stringify(profile)
  const isDisabled = saving || saved || !hasChanges

  return (
    <div className="app-shell">
      <Header title="Meu Perfil" subtitle="Auto-identificação nos relatos" icon="/icons/logo.png" />

      <div className="app-main app-main--form">
        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(145deg, #FFB07A, var(--orange))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px var(--orange-glow)',
            }}
          >
            <User size={28} color="#fff" />
          </div>
          <div style={{ overflow: 'hidden', minWidth: 0 }}>
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: 'var(--text-dark)',
                marginBottom: 2,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {f.nome || 'Sem nome cadastrado'}
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'var(--gray)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.email}
            </div>
          </div>
        </div>

        <div
          className="tip-card"
          style={{ marginTop: 0, marginBottom: 16 }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚡</span>
          <div style={{ fontSize: 12, color: 'var(--text-mid)', lineHeight: 1.5 }}>
            Esses dados preenchem automaticamente <strong>nome</strong>, <strong>matrícula</strong> e <strong>função</strong> em todos os relatos.
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Identificação</div>

          <div className="field">
            <label className="field-label">Nome Completo</label>
            <div style={{ position: 'relative' }}>
              <User size={15} color="var(--gray)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="field-input" value={f.nome || ''} onChange={upd('nome')} placeholder="Seu nome completo" style={{ paddingLeft: 36 }} />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Matrícula</label>
            <div style={{ position: 'relative' }}>
              <Hash size={15} color="var(--gray)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="field-input" value={f.matricula || ''} onChange={upd('matricula')} placeholder="Ex: 00123" style={{ paddingLeft: 36 }} />
            </div>
          </div>

          <div className="field">
            <label className="field-label">Função / Cargo</label>
            <div style={{ position: 'relative' }}>
              <Briefcase size={15} color="var(--gray)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="field-input" value={f.funcao || ''} onChange={upd('funcao')} placeholder="Ex: Operador de Pá Carregadeira" style={{ paddingLeft: 36 }} />
            </div>
          </div>

          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label">Setor / Área</label>
            <div style={{ position: 'relative' }}>
              <Layers size={15} color="var(--gray)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              <input className="field-input" value={f.setor || ''} onChange={upd('setor')} placeholder="Ex: Mina de Ferro — Frente Sul" style={{ paddingLeft: 36 }} />
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel__heading">Turno Padrão</div>
          <div className="chip-row">
            {turnos.map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${f.turno === t ? 'chip--active' : ''}`}
                onClick={() => setF((p) => ({ ...p, turno: t }))}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn-primary"
          onClick={handleSave}
          disabled={isDisabled}
          style={
            saved
              ? { background: 'linear-gradient(180deg, #A5D6A7, #81C784)', boxShadow: '0 6px 18px rgba(129,199,132,0.35)' }
              : saving
              ? { background: 'linear-gradient(180deg, #FF7A33, #FF5E14)', boxShadow: '0 6px 20px rgba(255,94,20,0.42)' }
              : !hasChanges
              ? { background: 'var(--gray-mid)', color: 'var(--gray)', boxShadow: 'none' }
              : { background: 'linear-gradient(180deg, #FF7A33 0%, #FF5E14 50%, #F04E0A 100%)', boxShadow: '0 6px 20px rgba(255,94,20,0.42)' }
          }
        >
          {saved ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Check size={18} /> Salvo!
            </span>
          ) : saving ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Salvando...
            </span>
          ) : (
            'Salvar Perfil'
          )}
        </button>
      </div>
    </div>
  )
}
