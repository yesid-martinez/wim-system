import {
  useEffect,
  useReducer,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { AuthContext } from './auth-context'

export type UserRole = 'admin' | 'marketing'

interface ProfileState {
  userId: string | null
  role: UserRole | null
  loading: boolean
  error: string | null
}

interface AuthState {
  session: Session | null
  sessionLoading: boolean
  profile: ProfileState
}

type AuthAction =
  | { type: 'session_changed'; session: Session | null }
  | { type: 'profile_loaded'; userId: string; role: UserRole }
  | { type: 'profile_failed'; userId: string; error: string }

const initialState: AuthState = {
  session: null,
  sessionLoading: true,
  profile: { userId: null, role: null, loading: true, error: null },
}

function authReducer(state: AuthState, action: AuthAction): AuthState {
  if (action.type === 'session_changed') {
    const userId = action.session?.user.id ?? null
    const sameUser = state.session?.user.id === userId

    return {
      session: action.session,
      sessionLoading: false,
      profile: sameUser
        ? state.profile
        : {
            userId,
            role: null,
            loading: userId !== null,
            error: null,
          },
    }
  }

  if (state.profile.userId !== action.userId) return state

  if (action.type === 'profile_loaded') {
    return {
      ...state,
      profile: {
        userId: action.userId,
        role: action.role,
        loading: false,
        error: null,
      },
    }
  }

  return {
    ...state,
    profile: {
      userId: action.userId,
      role: null,
      loading: false,
      error: action.error,
    },
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState)

  useEffect(() => {
    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      dispatch({ type: 'session_changed', session: nextSession })
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !state.session) return
    const client = supabase
    const userId = state.session.user.id
    let active = true

    async function loadProfile() {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('role')
          .eq('user_id', userId)
          .maybeSingle()
        const role = data?.role

        if (!active) return

        if (error) {
          dispatch({
            type: 'profile_failed',
            userId,
            error: `No se pudo cargar tu rol: ${error.message}`,
          })
          return
        }

        if (role !== 'admin' && role !== 'marketing') {
          dispatch({
            type: 'profile_failed',
            userId,
            error: 'Tu usuario no tiene un rol válido asignado en profiles.',
          })
          return
        }

        dispatch({ type: 'profile_loaded', userId, role })
      } catch (caughtError) {
        if (!active) return
        dispatch({
          type: 'profile_failed',
          userId,
          error: `No se pudo cargar tu rol: ${caughtError instanceof Error ? caughtError.message : 'error desconocido.'}`,
        })
      }
    }

    void loadProfile()

    return () => {
      active = false
    }
  }, [state.session])

  async function signIn(email: string, password: string) {
    if (!supabase) return 'Falta configurar la conexión con Supabase.'

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (!error) return null

      if (error.message === 'Invalid login credentials') {
        return 'El correo o la contraseña no son correctos.'
      }

      return `No se pudo iniciar sesión: ${error.message}`
    } catch (caughtError) {
      return `No se pudo iniciar sesión: ${caughtError instanceof Error ? caughtError.message : 'error desconocido.'}`
    }
  }

  async function signOut() {
    if (!supabase) return 'Falta configurar la conexión con Supabase.'

    try {
      const { error } = await supabase.auth.signOut()
      return error ? `No se pudo cerrar la sesión: ${error.message}` : null
    } catch (caughtError) {
      return `No se pudo cerrar la sesión: ${caughtError instanceof Error ? caughtError.message : 'error desconocido.'}`
    }
  }

  const session = state.session
  const profile = state.profile

  return (
    <AuthContext.Provider
      value={{
        userEmail: session?.user.email ?? null,
        role: profile.role,
        loading: state.sessionLoading || profile.loading,
        roleError: profile.error,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
