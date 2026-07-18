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

const routes = {
  seguranca: '/seguranca',
  ambiental: '/ambiental',
  ergonomia: '/ergonomia',
  veiculo: '/veiculo',
  turno: '/turno',
  inspecao: '/inspecao',
}

export default function Success() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const type = state?.type || 'seguranca'
  const emailSent = state?.emailSent
  const emailTo = state?.emailTo
  const emailError = state?.emailError
  const now = new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const typeIcon = {
    seguranca: '/icons/seguranca.png',
    ambiental: '/icons/ambiental.png',
    ergonomia: '/icons/ergonomia.png',
    veiculo: '/icons/veiculo.png',
    turno: '/icons/turno.png',
    inspecao: '/icons/inspecao.png',
  }[type]

  return (
    <div className="app-shell" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 24px',
      textAlign: 'center',
      minHeight: '100dvh',
    }}>
      <div style={{
        background: 'var(--white)',
        borderRadius: '24px',
        padding: '40px 24px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid var(--gray-line)',
        width: '100%',
        maxWidth: '380px'
      }}>
        {typeIcon && (
          <img
            src={typeIcon}
            alt=""
            width={80}
            height={80}
            style={{
              width: 80,
              height: 80,
              borderRadius: 0,
              objectFit: 'contain',
              objectPosition: 'center',
              margin: '0 auto 16px',
              background: 'transparent',
              filter: 'drop-shadow(0 8px 20px rgba(0,0,0,0.18))',
            }}
          />
        )}
        <div style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(67,160,71,0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 16px'
        }}>
          <CheckCircle size={32} color="#43a047" strokeWidth={2} />
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
          marginBottom: '12px'
        }}>
          {now}
        </div>
        {emailSent ? (
          <div style={{
            background: '#F0FDF4',
            border: '1px solid #BBF7D0',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 12,
            color: '#166534',
            lineHeight: 1.45,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            E-mail de notificação enviado para <strong>{emailTo || 'destino configurado'}</strong>.
          </div>
        ) : emailError ? (
          <div style={{
            background: '#FFF7ED',
            border: '1px solid #FED7AA',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: 12,
            color: '#9A3412',
            lineHeight: 1.45,
            marginBottom: 24,
            textAlign: 'left',
          }}>
            Registro salvo, mas o e-mail não foi enviado: {emailError}
            {String(emailError).toLowerCase().includes('confirm') || String(emailError).toLowerCase().includes('activat')
              ? ' (confirme o e-mail no FormSubmit se for o 1º envio).'
              : ''}
          </div>
        ) : (
          <div style={{ height: 16, marginBottom: 8 }} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => navigate(routes[type] || '/')}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '12px',
              border: '1.5px solid #FFD4B8',
              background: 'var(--orange-wash)',
              color: 'var(--orange-deep)',
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
            className="btn-primary"
            style={{
              marginTop: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Home size={18} /> Início
          </button>
        </div>
      </div>
    </div>
  )
}
