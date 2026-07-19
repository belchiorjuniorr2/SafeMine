import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import TypeIcon from './TypeIcon'

/**
 * @param {string} [icon] - path de imagem (logo etc.)
 * @param {object} [typeVisual] - { Icon, color, colorSoft, gradient, shadow } de reportTypes
 */
export default function Header({ title, subtitle, icon, typeVisual }) {
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
        {typeVisual?.Icon ? (
          <TypeIcon
            Icon={typeVisual.Icon}
            color={typeVisual.color}
            colorSoft={typeVisual.colorSoft}
            gradient={typeVisual.gradient}
            shadow={typeVisual.shadow}
            size={36}
          />
        ) : icon ? (
          <img
            src={icon}
            alt=""
            width={36}
            height={36}
            className="page-header__img-icon"
          />
        ) : null}
        <div className="page-header__text">
          <div className="page-header__title">{title}</div>
          {subtitle && <div className="page-header__sub">{subtitle}</div>}
        </div>
      </div>
    </header>
  )
}
