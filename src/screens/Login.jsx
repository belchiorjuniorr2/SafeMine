import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldAlert, LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--gray)', letterSpacing: '0.4px', textTransform: 'uppercase', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '13px 14px', borderRadius: '10px', border: '1.5px solid var(--gray-mid)', fontSize: '14px', color: 'var(--text-dark)', outline: 'none', background: '#fff', boxSizing: 'border-box' }

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error: err } = await signIn(email, password)
    setLoading(false)
    if (err) setError('E-mail ou senha incorretos. Tente novamente.')
    else navigate('/')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{ marginBottom: '36px', textAlign: 'center' }}>
        <div style={{
          background: 'var(--orange)',
          borderRadius: '18px',
          width: '64px', height: '64px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 14px',
          boxShadow: '0 8px 24px rgba(255,94,20,0.4)'
        }}>
          <ShieldAlert size={32} color="#fff" />
        </div>
        <div style={{ color: '#fff', fontWeight: 800, fontSize: '28px', letterSpacing: '-0.5px' }}>SafeMine</div>
        <div style={{ color: 'var(--orange)', fontSize: '12px', fontWeight: 500, marginTop: '4px', letterSpacing: '0.5px' }}>
          SEGURANÇA EM CAMPO
        </div>
      </div>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ background: '#fff', borderRadius: '20px', padding: '24px', boxShadow: '0 8px 40px rgba(0,0,0,0.4)' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)', marginBottom: '6px' }}>
            Entrar no sistema
          </div>
          <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '24px' }}>
            Acesso restrito a colaboradores autorizados
          </div>

          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: '10px',
              padding: '10px 14px',
              fontSize: '13px',
              color: '#e53935',
              marginBottom: '16px',
              fontWeight: 500
            }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '14px' }}>
            <label style={labelStyle}>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu@email.com"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Senha</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              border: 'none',
              background: loading ? '#ccc' : 'var(--orange)',
              color: '#fff',
              fontSize: '15px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(255,94,20,0.4)',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Entrando...' : <><LogIn size={18} /> Entrar</>}
          </button>
        </div>
      </form>
    </div>
  )
}
