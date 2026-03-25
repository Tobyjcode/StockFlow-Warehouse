import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearAuthToken, postJson, setAuthToken } from '../api'

const AUTH_PAGE_LOGIN_KEY = 'stockflow.authPageLoggedIn'

type LoginResponse = {
  tokenType: string
  accessToken: string
  expiresIn: number
  refreshToken?: string
}

export default function AuthPage() {
  const TRANSFER_MESSAGE = 'Now transferring to homepage...'
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTransferring, setIsTransferring] = useState(false)

  useEffect(() => {
    if (!isTransferring) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      navigate('/')
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isTransferring, navigate])

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isTransferring) {
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      await postJson<void>('/register', { email, password })
      setMessage('Account created. You can now log in.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (isTransferring) {
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const res = await postJson<LoginResponse>('/login', { email, password })
      setAuthToken(res.accessToken)
      localStorage.setItem(AUTH_PAGE_LOGIN_KEY, 'true')
      setIsTransferring(true)
      setMessage(TRANSFER_MESSAGE)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsTransferring(false)
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    if (isTransferring) {
      return
    }

    clearAuthToken()
    localStorage.removeItem(AUTH_PAGE_LOGIN_KEY)
    setIsTransferring(false)
    setMessage('Logged out.')
    setError(null)
  }

  return (
    <section className="auth-page">
      <h2>Auth</h2>
      <p>Create account and log in to use protected write endpoints.</p>

      {error ? <p className="error">{error}</p> : null}
      {message ? (
        <p
          className="auth-message"
          style={
            isTransferring
              ? {
                  color: '#1d4ed8',
                  background: '#dbeafe',
                  border: '1px solid #93c5fd',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  transition: 'all 0.2s ease',
                }
              : undefined
          }
        >
          {isTransferring ? 'Now transferring to homepage in 3 seconds...' : message}
        </p>
      ) : null}

      <form className="auth-form" onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          disabled={loading || isTransferring}
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          disabled={loading || isTransferring}
          required
          minLength={6}
        />

        <div className="auth-actions">
          <button type="submit" disabled={loading || isTransferring}>
            {isTransferring ? 'Redirecting...' : loading ? 'Working...' : 'Log in'}
          </button>
          <button type="button" onClick={handleLogout} disabled={loading || isTransferring}>
            Log out
          </button>
        </div>
      </form>

      <form className="auth-form" onSubmit={handleRegister}>
        <button type="submit" disabled={loading || isTransferring}>
          {isTransferring ? 'Please wait...' : loading ? 'Working...' : 'Register account'}
        </button>
      </form>
    </section>
  )
}
