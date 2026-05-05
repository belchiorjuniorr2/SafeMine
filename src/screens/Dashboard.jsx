import { useNavigate } from 'react-router-dom'
import { ShieldAlert, Leaf, Activity, Truck, ArrowLeftRight, Search, ClipboardList, LogOut, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import QuickVoiceCapture from '../components/QuickVoiceCapture'

const cards = [
  { icon: ShieldAlert, label: 'Segurança', sub: 'Registro de Ocorrências', path: '/seguranca', color: '#e53935' },
  { icon: Leaf, label: 'Ambiental', sub: 'Impacto Ambiental', path: '/ambiental', color: '#43a047' },
  { icon: Activity, label: 'Ergonomia', sub: 'Risco Ergonômico', path: '/ergonomia', color: '#8e24aa' },
  { icon: Truck, label: 'Veículo', sub: 'Checklist Diário', path: '/veiculo', color: '#1e88e5' },
  { icon: ArrowLeftRight, label: 'Passagem de Turno', sub: 'Troca de Turno', path: '/turno', color: '#f57c00' },
  { icon: Search, label: 'Inspeção', sub: 'Inspeção de Segurança', path: '/inspecao', color: '#00897b' },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gray-light)' }}>
      <header style={{ background: '#1a1a1a', padding: '0' }}>
        <div style={{ background: 'var(--orange)', height: '3px', width: '100%' }} />
        <div style={{ padding: '20px 16px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ background: 'var(--orange)', borderRadius: '8px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <ShieldAlert size={18} color="#fff" />
              </div>
              <div>
                <div style={{ color: '#fff', fontWeight: 800, fontSize: '20px', letterSpacing: '-0.3px' }}>SafeMine</div>
                <div style={{ color: 'var(--orange)', fontSize: '11px', fontWeight: 500 }}>Segurança em Campo</div>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'rgba(255,255,255,0.7)', fontSize: '12px', fontWeight: 600 }}
            >
              <LogOut size={14} /> Sair
            </button>
          </div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px', marginTop: '10px', textTransform: 'capitalize' }}>{today}</div>
          {user?.email && (
            <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: '11px', marginTop: '2px' }}>{user.email}</div>
          )}
        </div>
      </header>

      <main style={{ padding: '20px 16px', paddingBottom: '108px' }}>
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--gray)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '4px' }}>
            Registros
          </div>
          <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-dark)' }}>O que deseja registrar?</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {cards.map(({ icon: Icon, label, sub, path, color }) => (
            <button
              key={path}
              onClick={() => navigate(path)}
              style={{ background: '#fff', border: 'none', borderRadius: '16px', padding: '18px 14px', textAlign: 'left', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', gap: '12px', transition: 'transform 0.15s', position: 'relative', overflow: 'hidden' }}
              onPointerDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
              onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: color }} />
              <div style={{ background: `${color}18`, borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-dark)', lineHeight: 1.2, marginBottom: '3px' }}>{label}</div>
                <div style={{ fontSize: '11px', color: 'var(--gray)', lineHeight: 1.3 }}>{sub}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Consultar Registros */}
        <button
          onClick={() => navigate('/registros')}
          style={{
            width: '100%',
            marginTop: '16px',
            background: '#1a1a1a',
            border: 'none',
            borderRadius: '16px',
            padding: '16px',
            boxShadow: 'var(--shadow)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            textAlign: 'left'
          }}
          onPointerDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
          onPointerUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onPointerLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <ClipboardList size={20} color="#fff" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>Consultar Registros</div>
            <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '12px' }}>Visualize todos os registros enviados</div>
          </div>
          <ChevronRight size={18} color="rgba(255,255,255,0.4)" />
        </button>

        {/* Dica de voz */}
        <div style={{ marginTop: '12px', background: '#fff', borderRadius: '14px', padding: '16px', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'var(--orange)', borderRadius: '10px', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Activity size={20} color="#fff" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-dark)' }}>Gravação por voz disponível</div>
            <div style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '2px', lineHeight: 1.4 }}>Fale para preencher formulários automaticamente com IA</div>
          </div>
        </div>
      </main>
      <QuickVoiceCapture />
    </div>
  )
}
