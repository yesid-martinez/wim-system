import { useState, type FormEvent } from 'react'
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { AuthProvider, type UserRole } from './auth/AuthContext'
import { useAuth } from './auth/useAuth'
import { NewWatchPage } from './catalog/NewWatchPage'
import { WatchCatalogPage, WatchReferencePage } from './catalog/WatchCatalogPage'
import { supabase } from './lib/supabase'
import './App.css'

interface NavigationItem {
  label: string
  description: string
  path: string
}

function LoadingState() {
  return (
    <main className="status-page" aria-live="polite">
      <span className="status-mark" aria-hidden="true" />
      <p>Comprobando la sesión…</p>
    </main>
  )
}

function ConfigurationNotice() {
  return (
    <main className="status-page">
      <section className="notice-panel" role="alert">
        <p className="notice-kicker">Configuración necesaria</p>
        <h1>Conecta la base local</h1>
        <p>
          Copia <code>.env.example</code> a <code>.env.local</code> y configura
          la URL y la clave pública de tu proyecto Supabase.
        </p>
      </section>
    </main>
  )
}

function RoleProblem() {
  const { roleError, signOut } = useAuth()
  const [signOutError, setSignOutError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    const error = await signOut()
    setSigningOut(false)
    setSignOutError(error)
  }

  return (
    <main className="status-page">
      <section className="notice-panel" role="alert">
        <p className="notice-kicker">Acceso pendiente</p>
        <h1>No se pudo validar tu perfil</h1>
        <p>{roleError}</p>
        {signOutError && <p className="form-error">{signOutError}</p>}
        <button
          className="button button-secondary"
          disabled={signingOut}
          onClick={handleSignOut}
          type="button"
        >
          {signingOut ? 'Cerrando sesión…' : 'Cerrar sesión'}
        </button>
      </section>
    </main>
  )
}

function LoginPage() {
  const { userEmail, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) return <LoadingState />
  if (userEmail) return <Navigate to="/home" replace />

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const signInError = await signIn(email.trim(), password)
      if (signInError) {
        setError(signInError)
        return
      }

      navigate('/home', { replace: true })
    } catch (caughtError) {
      setError(
        `No se pudo iniciar sesión: ${caughtError instanceof Error ? caughtError.message : 'error desconocido.'}`,
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-panel" aria-labelledby="login-title">
        <Link className="brand" to="/login" aria-label="WIM, inicio de sesión">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>WIM / Inventario de relojes</span>
        </Link>

        <div className="login-copy">
          <p className="eyebrow">Acceso al inventario</p>
          <h1 id="login-title">Inicia sesión</h1>
          <p>Usa las credenciales de tu cuenta para continuar.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Correo electrónico</label>
          <input
            autoComplete="username"
            id="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nombre@empresa.com"
            required
            type="email"
            value={email}
          />

          <label htmlFor="password">Contraseña</label>
          <input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="button button-primary"
            disabled={submitting || !email.trim() || !password}
            type="submit"
          >
            {submitting ? 'Validando…' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="login-footnote">Acceso para usuarios autorizados.</p>
      </section>
      <aside className="login-aside" aria-label="WIM inventario">
        <div className="dial" aria-hidden="true">
          <span className="dial-hand" />
          <span className="dial-center" />
        </div>
        <p>Una vista clara de cada referencia.</p>
      </aside>
    </main>
  )
}

function ProtectedRoute({
  allowedRole,
}: {
  allowedRole?: UserRole
}) {
  const { userEmail, role, loading, roleError } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingState />
  if (!userEmail) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (roleError || !role) return <RoleProblem />
  if (allowedRole && role !== allowedRole) {
    return <Navigate to="/home" replace />
  }

  return <Outlet />
}

function HomePage() {
  const { userEmail, role, signOut } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  if (!role) return <RoleProblem />

  const items: NavigationItem[] =
    role === 'admin'
      ? [
          {
            label: 'Ver catálogo',
            description: 'Consulta las referencias del inventario.',
            path: '/watches',
          },
          {
            label: 'Crear referencia',
            description: 'Añade una referencia al catálogo.',
            path: '/new',
          },
          {
            label: 'Editar referencia',
            description: 'Actualiza una referencia existente.',
            path: '/watches-ref-edit',
          },
        ]
      : [
          {
            label: 'Ver catálogo',
            description: 'Consulta las referencias disponibles.',
            path: '/watches',
          },
        ]

  async function handleSignOut() {
    setSigningOut(true)
    const signOutError = await signOut()
    setSigningOut(false)

    if (signOutError) {
      setError(signOutError)
      return
    }

    navigate('/login', { replace: true })
  }

  return (
    <main className="home-page">
      <header className="topbar">
        <Link className="brand" to="/home" aria-label="WIM, inicio">
          <span className="brand-mark" aria-hidden="true">
            W
          </span>
          <span>WIM / Inventario de relojes</span>
        </Link>
        <div className="account">
          <span className="account-email">{userEmail}</span>
          <button
            className="text-button"
            disabled={signingOut}
            onClick={handleSignOut}
            type="button"
          >
            {signingOut ? 'Cerrando…' : 'Cerrar sesión'}
          </button>
        </div>
      </header>

      <section className="home-content">
        <div className="home-heading">
          <p className="eyebrow">Panel de trabajo</p>
          <h1>Inicio</h1>
          <p>
            Accede a las herramientas disponibles para tu perfil de{' '}
            <strong>{role === 'admin' ? 'administración' : 'marketing'}</strong>.
          </p>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <nav className="action-list" aria-label="Acciones disponibles">
          {items.map((item) => (
            <Link className="action-link" key={item.path} to={item.path}>
              <span>
                <strong>{item.label}</strong>
                <span className="action-description">{item.description}</span>
              </span>
              <span className="action-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          ))}
        </nav>
      </section>
    </main>
  )
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <main className="status-page">
      <section className="notice-panel">
        <p className="notice-kicker">Módulo disponible próximamente</p>
        <h1>{title}</h1>
        <Link className="button button-secondary" to="/home">
          Volver al inicio
        </Link>
      </section>
    </main>
  )
}

function UnknownRoute() {
  const { userEmail, loading } = useAuth()

  if (loading) return <LoadingState />
  return <Navigate to={userEmail ? '/home' : '/login'} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/watches" element={<WatchCatalogPage />} />
        <Route path="/watches-ref" element={<WatchReferencePage />} />
      </Route>
      <Route element={<ProtectedRoute allowedRole="admin" />}>
        <Route path="/new" element={<NewWatchPage />} />
        <Route
          path="/watches-ref-edit"
          element={<PlaceholderPage title="Editar referencia" />}
        />
      </Route>
      <Route path="/" element={<UnknownRoute />} />
      <Route path="*" element={<UnknownRoute />} />
    </Routes>
  )
}

function App() {
  if (!supabase) return <ConfigurationNotice />

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
