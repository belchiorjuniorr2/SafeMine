import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'

export default function Header({ title, subtitle }) {
  const navigate = useNavigate()
  return (
    <header style={{
      background: '#1a1a1a',
      padding: '0',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
    }}>
      <div style={{
        background: 'var(--orange)',
        height: '3px',
        width: '100%'
      }} />
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '14px 16px'
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: '8px',
            padding: '8px',
            display: 'flex',
            alignItems: 'center',
            color: '#fff'
          }}
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '15px', lineHeight: 1.2 }}>{title}</div>
          {subtitle && <div style={{ color: 'var(--orange)', fontSize: '11px', fontWeight: 500, marginTop: '2px' }}>{subtitle}</div>}
        </div>
      </div>
    </header>
  )
}
