import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthToken, postJson, setAuthToken } from '../api'

type LoginResponse = {
  tokenType: string
  accessToken: string
  expiresIn: number
  refreshToken?: string
}

const DEMO_EMAIL = 'demo@stockflow.local'
const DEMO_PASSWORD = 'Demo!123'
const DEMO_CREDENTIALS_KEY = 'stockflow.demoCredentials'
const AUTH_PAGE_LOGIN_KEY = 'stockflow.authPageLoggedIn'

export default function HomePage() {
  const navigate = useNavigate()
  const [isLoggedIn, setIsLoggedIn] = useState(
    !!getAuthToken() && localStorage.getItem(AUTH_PAGE_LOGIN_KEY) === 'true',
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoggedIn(!!getAuthToken() && localStorage.getItem(AUTH_PAGE_LOGIN_KEY) === 'true')
  }, [])

  useEffect(() => {
    if (!message) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setMessage(null)
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [message])

  async function ensureDemoAccount() {
    try {
      // Try to register
      await postJson<void>('/register', { email: DEMO_EMAIL, password: DEMO_PASSWORD })
      return true
    } catch {
      // Account likely exists, which is fine
      return true
    }
  }

  async function handleDemoLogin() {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      // Ensure demo account exists
      await ensureDemoAccount()

      // Login
      const res = await postJson<LoginResponse>('/login', {
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
      })
      setAuthToken(res.accessToken)
      localStorage.setItem(AUTH_PAGE_LOGIN_KEY, 'true')
      localStorage.setItem(DEMO_CREDENTIALS_KEY, JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }))
      setIsLoggedIn(true)
      setMessage('Demo account logged in!')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const navItems = [
    { path: '/warehouses', icon: '🏢', title: 'Warehouses', desc: 'Manage locations' },
    { path: '/products', icon: '📦', title: 'Products', desc: 'Track inventory' },
    { path: '/orders', icon: '📋', title: 'Orders', desc: 'Manage transactions' },
  ]

  return (
    <section style={{ textAlign: 'center', paddingTop: '40px', paddingBottom: '60px' }}>
      <div style={{ marginBottom: '56px' }}>
        <h1
          style={{
            fontSize: '72px',
            fontWeight: 900,
            margin: '0 0 8px 0',
            paddingLeft: '24px',
            paddingRight: '24px',
            lineHeight: '1.2',
            background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-1px',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            width: '100%',
          }}
        >
          StockFlow Warehouse
        </h1>
        <p style={{ fontSize: '18px', color: '#6b7280', margin: '0', letterSpacing: '0.5px', fontWeight: 500, width: '100%', wordBreak: 'break-word' }}>Modern Inventory Management System</p>
      </div>

      {error ? (
        <p style={{ color: '#dc2626', background: '#fee2e2', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #fecaca', maxWidth: '480px', margin: '0 auto 24px' }}>
          {error}
        </p>
      ) : null}

      {message ? (
        <p style={{ color: '#166534', background: '#dcfce7', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', border: '1px solid #86efac', maxWidth: '480px', margin: '0 auto 24px' }}>
          {message}
        </p>
      ) : null}

      {!isLoggedIn ? (
        <div style={{ maxWidth: '480px', margin: '0 auto', marginBottom: '48px' }}>
          <p style={{ fontSize: '16px', color: '#4b5563', marginBottom: '24px', lineHeight: '1.6' }}>
            Welcome to StockFlow Warehouse. Start managing your inventory with our powerful warehouse management system.
          </p>
          <button
            onClick={handleDemoLogin}
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px 24px',
              background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)'
              ;(e.target as HTMLButtonElement).style.boxShadow = '0 10px 20px rgba(37, 99, 235, 0.3)'
            }}
            onMouseLeave={e => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0)'
              ;(e.target as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            {loading ? 'Loading...' : '✨ Start with Demo Account'}
          </button>
          <p style={{ fontSize: '13px', color: '#9ca3af', marginTop: '16px' }}>Or go to Auth page to register your own account</p>
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ fontSize: '18px', fontWeight: 600, color: '#1f2937', marginBottom: '40px' }}>✓ You're logged in! Ready to manage inventory.</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
            }}
          >
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                style={{
                  padding: '28px 24px',
                  background: item.path === '/warehouses' ? '#f0f9ff' : item.path === '/products' ? '#f0fdf4' : '#fef3c7',
                  border: item.path === '/warehouses' ? '2px solid #bfdbfe' : item.path === '/products' ? '2px solid #bbf7d0' : '2px solid #fde68a',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  textAlign: 'center',
                }}
                onMouseEnter={e => {
                  const btn = e.currentTarget
                  btn.style.transform = 'translateY(-4px)'
                  btn.style.boxShadow = '0 12px 24px rgba(0, 0, 0, 0.1)'
                }}
                onMouseLeave={e => {
                  const btn = e.currentTarget
                  btn.style.transform = 'translateY(0)'
                  btn.style.boxShadow = 'none'
                }}
              >
                <div style={{ fontSize: '40px', marginBottom: '12px', display: 'block' }}>{item.icon}</div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '18px',
                    color: item.path === '/warehouses' ? '#0c4a6e' : item.path === '/products' ? '#166534' : '#78350f',
                    marginBottom: '6px',
                  }}
                >
                  {item.title}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: item.path === '/warehouses' ? '#0284c7' : item.path === '/products' ? '#15803d' : '#a16207',
                  }}
                >
                  {item.desc}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}