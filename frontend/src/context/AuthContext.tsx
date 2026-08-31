import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api, AuthUser, DashboardSectionLayout } from '../api/client'

interface AuthContextValue {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, displayName?: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (body: { date_format?: string; unit_system?: string; notifications_enabled?: boolean; dashboard_layout?: DashboardSectionLayout[]; dashboard_stats?: string[] }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.auth.me()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    setUser(await api.auth.login({ email, password }))
  }

  async function register(email: string, password: string, displayName?: string) {
    setUser(await api.auth.register({ email, password, display_name: displayName }))
  }

  async function logout() {
    await api.auth.logout()
    setUser(null)
  }

  async function updateProfile(body: { date_format?: string; unit_system?: string; notifications_enabled?: boolean; dashboard_layout?: DashboardSectionLayout[]; dashboard_stats?: string[] }) {
    setUser(await api.auth.updateProfile(body))
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
