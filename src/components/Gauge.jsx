/**
 * Velocímetro SVG (0–100) — responsivo, sem lib externa.
 */
export default function Gauge({
  value = 0,
  label = 'Índice',
  sublabel = '',
  size = 160,
  colorLow = '#43A047',
  colorMid = '#FB8C00',
  colorHigh = '#E53935',
}) {
  const v = Math.max(0, Math.min(100, Number(value) || 0))
  const color = v < 35 ? colorLow : v < 65 ? colorMid : colorHigh

  // arco 180° de -180 a 0 (SVG: path semicircle)
  const cx = size / 2
  const cy = size / 2 + 8
  const r = size * 0.38
  const stroke = Math.max(10, size * 0.08)

  const polar = (angleDeg) => {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    }
  }

  // background arc: from 180° to 360° (left to right through bottom... wait)
  // Use: start at 180 (left), end at 0 (right) going through bottom = clockwise in SVG y-down is weird
  // Standard semicircle top: start (-180 or 180) left, end (0) right, large arc upper
  const start = polar(Math.PI) // wrong - use degrees from positive x
  // angle 180 = left, 0 = right. For upper semicircle: from 180 to 0 counterclockwise
  const pStart = { x: cx - r, y: cy }
  const pEnd = { x: cx + r, y: cy }
  const bgPath = `M ${pStart.x} ${pStart.y} A ${r} ${r} 0 0 1 ${pEnd.x} ${pEnd.y}`

  // value arc: 0% = left (180°), 100% = right (0°)
  const angle = Math.PI - (v / 100) * Math.PI // radians from positive x... 
  // left is pi, right is 0, going upper: angle decreases
  const endX = cx + r * Math.cos(Math.PI - (v / 100) * Math.PI)
  const endY = cy - r * Math.sin((v / 100) * Math.PI)
  const large = v > 50 ? 1 : 0
  // From left, sweep to value point along upper arc
  const valPath =
    v <= 0
      ? ''
      : `M ${pStart.x} ${pStart.y} A ${r} ${r} 0 ${large} 1 ${endX} ${endY}`

  // needle
  const needleAngle = Math.PI - (v / 100) * Math.PI
  const nx = cx + (r - stroke) * 0.75 * Math.cos(needleAngle)
  const ny = cy - (r - stroke) * 0.75 * Math.sin(needleAngle)

  return (
    <div className="gauge" style={{ width: size, maxWidth: '100%' }}>
      <svg
        viewBox={`0 0 ${size} ${size * 0.72}`}
        width="100%"
        height="auto"
        role="img"
        aria-label={`${label}: ${v}`}
      >
        <path
          d={bgPath}
          fill="none"
          stroke="var(--gray-mid)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {valPath ? (
          <path
            d={valPath}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
          />
        ) : null}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke={color}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        <text
          x={cx}
          y={cy - r * 0.35}
          textAnchor="middle"
          className="gauge__value"
          fill={color}
          fontSize={size * 0.18}
          fontWeight="800"
          fontFamily="Inter, system-ui, sans-serif"
        >
          {v}
        </text>
      </svg>
      <div className="gauge__label">{label}</div>
      {sublabel ? <div className="gauge__sub">{sublabel}</div> : null}
    </div>
  )
}
