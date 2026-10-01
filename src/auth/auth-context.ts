import { createContext } from 'react'
import type { UserRole } from './AuthContext'

export interface AuthContextValue {
  userEmail: string | null
  role: UserRole | null
  loading: boolean
  roleError: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
