import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogIn } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

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
    <div className="login-page">
      <div className="login-brand">
        <img
          src="/icons/logo.png"
          alt="SafeMine"
          className="login-brand__logo"
          width={88}
          height={88}
        />
        <div className="login-brand__name">SafeMine</div>
        <div className="login-brand__tag">SEGURANÇA EM CAMPO</div>
      </div>

      <form onSubmit={handleSubmit} className="login-card" noValidate>
        <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-dark)', marginBottom: 6 }}>
          Entrar no sistema
        </div>
        <div style={{ fontSize: '0.8125rem', color: 'var(--gray)', marginBottom: 22, lineHeight: 1.45 }}>
          Acesso restrito a colaboradores autorizados
        </div>

        {error && (
          <div
            role="alert"
            style={{
              background: '#fef2f2',
              border: '1.5px solid #fecaca',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 13,
              color: '#e53935',
              marginBottom: 16,
              fontWeight: 500,
            }}
          >
            {error}
          </div>
        )}

        <div className="field">
          <label className="field-label" htmlFor="login-email">E-mail</label>
          <input
            id="login-email"
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            inputMode="email"
            placeholder="seu@email.com"
          />
        </div>

        <div className="field" style={{ marginBottom: 22 }}>
          <label className="field-label" htmlFor="login-password">Senha</label>
          <input
            id="login-password"
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="••••••••"
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? (
            'Entrando...'
          ) : (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <LogIn size={18} /> Entrar
            </span>
          )}
        </button>
      </form>
    </div>
  )
}
