import { useState } from 'react'
import { clearAuthToken, postJson, setAuthToken } from '../api'

type LoginResponse = {
  tokenType: string
  accessToken: string
  expiresIn: number
  refreshToken?: string
}

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
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
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const res = await postJson<LoginResponse>('/login', { email, password })
      setAuthToken(res.accessToken)
      setMessage('Logged in successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    clearAuthToken()
    setMessage('Logged out.')
    setError(null)
  }

  return (
    <section className="auth-page">
      <h2>Auth</h2>
      <p>Create account and log in to use protected write endpoints.</p>

      {error ? <p className="error">{error}</p> : null}
      {message ? <p className="auth-message">{message}</p> : null}

      <form className="auth-form" onSubmit={handleLogin}>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
        />

        <div className="auth-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Working...' : 'Log in'}
          </button>
          <button type="button" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </form>

      <form className="auth-form" onSubmit={handleRegister}>
        <button type="submit" disabled={loading}>
          {loading ? 'Working...' : 'Register account'}
        </button>
      </form>
    </section>
  )
}
