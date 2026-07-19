/**
 * Tile de ícone visual para tipos de relato.
 * size: sm (32) | md (48) | lg (64) | number
 */
export default function TypeIcon({
  Icon,
  color = '#FF8A45',
  colorSoft = '#FFF4EC',
  gradient,
  shadow,
  size = 'md',
  className = '',
}) {
  const px = typeof size === 'number' ? size : size === 'sm' ? 32 : size === 'lg' ? 64 : 48
  const iconPx = Math.round(px * 0.48)
  const radius = Math.round(px * 0.28)

  return (
    <span
      className={`type-icon type-icon--${typeof size === 'string' ? size : 'custom'} ${className}`}
      style={{
        width: px,
        height: px,
        borderRadius: radius,
        background: gradient || colorSoft,
        color: gradient ? '#fff' : color,
        boxShadow: shadow
          ? `0 8px 20px ${shadow}, inset 0 1px 0 rgba(255,255,255,0.35)`
          : `0 4px 12px ${color}22`,
      }}
      aria-hidden
    >
      {Icon ? <Icon size={iconPx} strokeWidth={2.25} absoluteStrokeWidth={false} /> : null}
    </span>
  )
}
