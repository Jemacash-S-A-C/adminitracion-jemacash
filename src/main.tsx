import { createRoot } from 'react-dom/client'
import { useEffect, useState, type FormEvent } from 'react'
import AdminDashboard from './pages/AdminDashboard'
import { api, clearTokens, getAccessToken, getRefreshToken, setTokens } from './utils/api'
import { profileToSession, type AuthResponse, type UserProfile, type UserSession } from './types/api.types'
import './login.css'

function App() {
  const [user, setUser] = useState<UserSession | null>(null)
  const [loading, setLoading] = useState(!!getAccessToken())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  function staffSession(profile: UserProfile) {
    if (profile.role !== 'admin' && profile.role !== 'moderator') {
      clearTokens()
      throw new Error('El acceso está reservado al equipo de Jemacash.')
    }
    return profileToSession(profile)
  }

  useEffect(() => {
    const expired = () => setUser(null)
    window.addEventListener('auth:logout', expired)
    if (getAccessToken()) {
      api.get<UserProfile>('/auth/me').then(profile => setUser(staffSession(profile)))
        .catch(() => clearTokens()).finally(() => setLoading(false))
    }
    return () => window.removeEventListener('auth:logout', expired)
  }, [])

  async function login(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const fields = new FormData(event.currentTarget)
    setBusy(true)
    setError('')
    try {
      const data = await api.post<AuthResponse>('/auth/login', {
        identifier: String(fields.get('email')).trim(), password: fields.get('password'),
      })
      const session = staffSession(data.user)
      setTokens(data.access_token, data.refresh_token)
      setUser(session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally { setBusy(false) }
  }

  async function logout() {
    try { await api.post('/auth/logout', { refresh_token: getRefreshToken() }) }
    finally { clearTokens(); setUser(null) }
  }

  if (loading) return <main className="staff-entry">Cargando panel…</main>
  if (user) return <AdminDashboard user={user} onLogout={() => void logout().catch(() => {})} />
  return <main className="staff-entry"><form onSubmit={login}>
    <strong>Jemacash</strong><h1>Acceso del equipo</h1>
    <label>Correo electrónico<input name="email" type="email" autoComplete="username" required /></label>
    <label>Contraseña<input name="password" type="password" autoComplete="current-password" required /></label>
    {error && <p role="alert">{error}</p>}
    <button disabled={busy}>{busy ? 'Ingresando…' : 'Ingresar al panel'}</button>
  </form></main>
}

createRoot(document.getElementById('root')!).render(<App />)
