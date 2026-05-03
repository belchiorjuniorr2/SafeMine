import { useNavigate, useLocation } from 'react-router-dom'
import { CheckCircle, Home, Plus } from 'lucide-react'

const labels = {
  seguranca: 'Registro de Segurança',
  ambiental: 'Registro Ambiental',
  ergonomia: 'Registro Ergonômico',
  veiculo: 'Checklist de Veículo',
  turno: 'Passagem de Turno',
  inspecao: 'Inspeção de Segurança',
}

export default function Success() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const type = state?.type || 'seguranca'
  const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--gray-light)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center'
    }}>
      <div style={{
        background: '#fff',
        borderRadius: '24px',
        padding: '40px 24px',
        boxShadow: 'var(--shadow)',
        width: '100%',
        maxWidth: '380px'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'rgba(67,160,71,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px'
        }}>
          <CheckCircle size={44} color="#43a047" strokeWidth={2} />
        </div>

        <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', marginBottom: '8px' }}>
          Enviado com sucesso!
        </div>
        <div style={{ fontSize: '14px', color: 'var(--gray)', lineHeight: 1.5, marginBottom: '8px' }}>
          {labels[type]} registrado e enviado para análise.
        </div>
        <div style={{
          display: 'inline-block',
          background: 'var(--gray-light)',
          borderRadius: '8px',
          padding: '6px 14px',
          fontSize: '12px',
          color: 'var(--gray)',
          fontWeight: 600,
          marginBottom: '32px'
        }}>
          {now}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => navigate(`/${type === 'seguranca' ? 'seguranca' : type === 'ambiental' ? 'ambiental' : type === 'ergonomia' ? 'ergonomia' : type === 'veiculo' ? 'veiculo' : type === 'turno' ? 'turno' : 'inspecao'}`)}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: '2px solid var(--orange)',
              background: 'rgba(255,94,20,0.06)',
              color: 'var(--orange)',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Plus size={18} /> Novo Registro
          </button>
          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: 'none',
              background: '#1a1a1a',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Home size={18} /> Início
          </button>
        </div>
      </div>
    </div>
  )
}
