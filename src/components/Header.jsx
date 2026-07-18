import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function Header({ title, subtitle, icon }) {
  const navigate = useNavigate()
  return (
    <header className="app-header">
      <div className="app-header__accent" />
      <div className="page-header__inner">
        <button
          type="button"
          className="icon-btn icon-btn--ghost"
          onClick={() => navigate('/')}
          aria-label="Voltar ao início"
        >
          <ChevronLeft size={22} />
        </button>
        {icon && (
          <img
            src={icon}
            alt=""
            width={36}
            height={36}
            style={{
              width: 36,
              height: 36,
              borderRadius: 0,
              objectFit: 'contain',
              objectPosition: 'center',
              flexShrink: 0,
              background: 'transparent',
              filter: 'drop-shadow(0 2px 8px rgba(255,154,92,0.28))',
            }}
          />
        )}
        <div className="page-header__text">
          <div className="page-header__title">{title}</div>
          {subtitle && <div className="page-header__sub">{subtitle}</div>}
        </div>
      </div>
    </header>
  )
}
