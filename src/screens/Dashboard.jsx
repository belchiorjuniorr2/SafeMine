import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight, UserCircle, Mic } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import QuickVoiceCapture from '../components/QuickVoiceCapture'

const cards = [
  {
    key: 'seguranca',
    label: 'Segurança',
    sub: 'Registro de ocorrências',
    path: '/seguranca',
    icon: '/icons/seguranca.png',
  },
  {
    key: 'ambiental',
    label: 'Ambiental',
    sub: 'Impacto ambiental',
    path: '/ambiental',
    icon: '/icons/ambiental.png',
  },
  {
    key: 'ergonomia',
    label: 'Ergonomia',
    sub: 'Risco ergonômico',
    path: '/ergonomia',
    icon: '/icons/ergonomia.png',
  },
  {
    key: 'veiculo',
    label: 'Veículo',
    sub: 'Checklist diário',
    path: '/veiculo',
    icon: '/icons/veiculo.png',
  },
  {
    key: 'turno',
    label: 'Passagem de Turno',
    sub: 'Troca de turno',
    path: '/turno',
    icon: '/icons/turno.png',
  },
  {
    key: 'inspecao',
    label: 'Inspeção',
    sub: 'Inspeção de segurança',
    path: '/inspecao',
    icon: '/icons/inspecao.png',
  },
]

export default function Dashboard() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { profile } = useProfile()
  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const handleSignOut = async () => {
    try {
      await signOut()
    } finally {
      navigate('/login')
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__accent" />
        <div className="app-header__inner">
          <div className="app-header__brand">
            <img
              src="/icons/logo.png"
              alt="SafeMine"
              className="app-header__logo"
              width={40}
              height={40}
            />
            <div style={{ minWidth: 0 }}>
              <div className="app-header__title">SafeMine</div>
              <div className="app-header__sub">Segurança em Campo</div>
            </div>
          </div>
          <div className="app-header__actions">
            <button
              type="button"
              className="icon-btn icon-btn--ghost"
              onClick={() => navigate('/perfil')}
              aria-label="Meu perfil"
            >
              <UserCircle size={20} />
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={handleSignOut}
              aria-label="Sair"
            >
              <LogOut size={16} />
              <span className="icon-btn__label">Sair</span>
            </button>
          </div>
        </div>
        <div className="app-header__meta">
          <div className="app-header__date">{today}</div>
          <div className="app-header__user">
            {profile.nome ? (
              <>
                <span className="app-header__user-name">{profile.nome}</span>
                {profile.matricula && (
                  <span className="app-header__user-meta">· Mat. {profile.matricula}</span>
                )}
              </>
            ) : (
              <button type="button" className="link-cta" onClick={() => navigate('/perfil')}>
                Preencher perfil para auto-identificação
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="app-main">
        <div className="section-label">Registros</div>
        <h1 className="section-title">O que deseja registrar?</h1>

        <div className="card-grid" role="list">
          {cards.map(({ key, label, sub, path, icon }) => (
            <button
              key={path}
              type="button"
              className={`dash-card dash-card--${key}`}
              onClick={() => navigate(path)}
              role="listitem"
              aria-label={`${label}: ${sub}`}
            >
              <span className="dash-card__bar" aria-hidden />
              <div className="dash-card__icon-wrap">
                <img
                  src={icon}
                  alt=""
                  className="dash-card__icon"
                  width={56}
                  height={56}
                  loading="lazy"
                />
              </div>
              <div className="dash-card__body">
                <div className="dash-card__label">{label}</div>
                <div className="dash-card__sub">{sub}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="list-cta"
          onClick={() => navigate('/registros')}
          aria-label="Consultar registros enviados"
        >
          <img
            src="/icons/registros.png"
            alt=""
            className="list-cta__icon"
            width={48}
            height={48}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="list-cta__title">Consultar Registros</div>
            <div className="list-cta__sub">Visualize todos os registros enviados</div>
          </div>
          <ChevronRight size={18} color="var(--gray)" aria-hidden />
        </button>

        <div className="tip-card">
          <div className="tip-card__badge" aria-hidden>
            <Mic size={20} color="#fff" />
          </div>
          <div>
            <div className="tip-card__title">Gravação por voz com IA</div>
            <div className="tip-card__sub">
              Fale o relato — a IA transcreve e preenche os campos automaticamente
            </div>
          </div>
        </div>
      </main>

      <QuickVoiceCapture />

      <style>{`
        @media (max-width: 380px) {
          .icon-btn__label { display: none; }
          .icon-btn { width: var(--touch); padding: 0; }
        }
      `}</style>
    </div>
  )
}
