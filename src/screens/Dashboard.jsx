import { useNavigate } from 'react-router-dom'
import { LogOut, ChevronRight, UserCircle, Mic, LayoutDashboard } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useProfile } from '../context/ProfileContext'
import QuickVoiceCapture from '../components/QuickVoiceCapture'
import TypeIcon from '../components/TypeIcon'
import { REPORT_TYPE_LIST, REGISTROS_VISUAL } from '../lib/reportTypes'

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
          {REPORT_TYPE_LIST.map((t) => (
            <button
              key={t.path}
              type="button"
              className={`dash-card dash-card--${t.key}`}
              onClick={() => navigate(t.path)}
              role="listitem"
              aria-label={`${t.label}: ${t.sub}`}
              style={{
                '--card-color': t.color,
                '--card-glow': `${t.color}28`,
                '--card-shadow': t.shadow,
              }}
            >
              <span className="dash-card__bar" aria-hidden />
              <div className="dash-card__icon-wrap">
                <TypeIcon
                  Icon={t.Icon}
                  color={t.color}
                  colorSoft={t.colorSoft}
                  gradient={t.gradient}
                  shadow={t.shadow}
                  size="lg"
                  className="dash-card__type-icon"
                />
              </div>
              <div className="dash-card__body">
                <div className="dash-card__label">{t.label}</div>
                <div className="dash-card__sub">{t.sub}</div>
              </div>
            </button>
          ))}
        </div>

        <button
          type="button"
          className="list-cta"
          onClick={() => navigate('/gestao')}
          aria-label="Painel de gestão SSMA"
        >
          <TypeIcon
            Icon={LayoutDashboard}
            color="#FF8A45"
            colorSoft="#FFF4EC"
            gradient="linear-gradient(145deg, #FFB074 0%, #F07830 100%)"
            shadow="rgba(240, 120, 48, 0.28)"
            size={48}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="list-cta__title">Gestão SSMA</div>
            <div className="list-cta__sub">Gráficos, indicadores e relatórios</div>
          </div>
          <ChevronRight size={18} color="var(--gray)" aria-hidden />
        </button>

        <button
          type="button"
          className="list-cta"
          onClick={() => navigate('/registros')}
          aria-label="Consultar registros enviados"
        >
          <TypeIcon
            Icon={REGISTROS_VISUAL.Icon}
            color={REGISTROS_VISUAL.color}
            colorSoft={REGISTROS_VISUAL.colorSoft}
            gradient={REGISTROS_VISUAL.gradient}
            shadow={REGISTROS_VISUAL.shadow}
            size={48}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="list-cta__title">{REGISTROS_VISUAL.label}</div>
            <div className="list-cta__sub">{REGISTROS_VISUAL.sub}</div>
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
