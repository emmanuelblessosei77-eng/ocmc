import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { apiRequest } from './api'

export type AuthUser = {
  id: number
  name: string
  email: string
  roles: Array<{ name: string }>
}

type AuthContextValue = {
  token: string | null
  user: AuthUser | null
  roles: string[]
  loading: boolean
  isAuthenticated: boolean
  hasRole: (role: string) => boolean
  signIn: (token: string, user: AuthUser) => void
  signOutLocal: () => void
  refreshMe: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_KEY = 'ocmc_access_token'
const ROLES_KEY = 'ocmc_roles'
const USER_KEY = 'ocmc_user'

function readRoles(): string[] {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(ROLES_KEY) ?? '[]')
    return Array.isArray(value) ? value.filter((role): role is string => typeof role === 'string') : []
  } catch {
    return []
  }
}

function readUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState<AuthUser | null>(() => readUser())
  const [roles, setRoles] = useState<string[]>(() => readRoles())
  const [loading, setLoading] = useState(Boolean(sessionStorage.getItem(TOKEN_KEY)))

  const signIn = useCallback((nextToken: string, nextUser: AuthUser) => {
    const nextRoles = nextUser.roles.map((role) => role.name)
    sessionStorage.setItem(TOKEN_KEY, nextToken)
    sessionStorage.setItem(ROLES_KEY, JSON.stringify(nextRoles))
    sessionStorage.setItem(USER_KEY, JSON.stringify(nextUser))
    setToken(nextToken)
    setUser(nextUser)
    setRoles(nextRoles)
  }, [])

  const signOutLocal = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY)
    sessionStorage.removeItem(ROLES_KEY)
    sessionStorage.removeItem(USER_KEY)
    setToken(null)
    setUser(null)
    setRoles([])
  }, [])

  const refreshMe = useCallback(async () => {
    const current = sessionStorage.getItem(TOKEN_KEY)
    if (!current) {
      setLoading(false)
      return
    }
    try {
      const me = await apiRequest<AuthUser>('/auth/me', { token: current })
      signIn(current, me)
    } catch {
      signOutLocal()
    } finally {
      setLoading(false)
    }
  }, [signIn, signOutLocal])

  useEffect(() => {
    void refreshMe()
  }, [refreshMe])

  const value = useMemo<AuthContextValue>(() => ({
    token,
    user,
    roles,
    loading,
    isAuthenticated: Boolean(token),
    hasRole: (role: string) => roles.includes(role),
    signIn,
    signOutLocal,
    refreshMe,
  }), [token, user, roles, loading, signIn, signOutLocal, refreshMe])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}

export function RequireAuth({ children, role }: { children: ReactNode; role?: string }) {
  const auth = useAuth()
  const location = useLocation()

  if (auth.loading) {
    return <div className="container-width py-20" role="status">Checking your session…</div>
  }

  if (!auth.isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (role && !auth.hasRole(role) && !auth.hasRole('Super Administrator')) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export function getAccessToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? ''
}
