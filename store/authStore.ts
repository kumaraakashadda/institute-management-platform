import { create } from 'zustand'

interface AuthState {
  token: string | null; role: string | null; userId: string | null
  name: string | null; centre: string | null; isAuthenticated: boolean
  login: (token: string, role: string, userId: string, name: string, centre?: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('imp_token') : null,
  role: typeof window !== 'undefined' ? localStorage.getItem('imp_role') : null,
  userId: typeof window !== 'undefined' ? localStorage.getItem('imp_user_id') : null,
  name: typeof window !== 'undefined' ? localStorage.getItem('imp_name') : null,
  centre: typeof window !== 'undefined' ? localStorage.getItem('imp_centre') : null,
  isAuthenticated: typeof window !== 'undefined' ? !!localStorage.getItem('imp_token') : false,
  login: (token, role, userId, name, centre = '') => {
    ;['imp_token','imp_role','imp_user_id','imp_name','imp_centre'].forEach((k,i) =>
      localStorage.setItem(k, [token,role,userId,name,centre][i]))
    set({ token, role, userId, name, centre, isAuthenticated: true })
  },
  logout: () => {
    ;['imp_token','imp_role','imp_user_id','imp_name','imp_centre'].forEach(k => localStorage.removeItem(k))
    set({ token: null, role: null, userId: null, name: null, centre: null, isAuthenticated: false })
  },
}))

/** Hook alias used by legacy layout components */
export const useCurrentUser = () => useAuthStore(s => ({
  token: s.token, role: s.role, userId: s.userId,
  name: s.name, centre: s.centre, isAuthenticated: s.isAuthenticated,
}))

export const ROLE_ROUTES: Record<string, string> = {
  SUPER_ADMIN: '/dashboard/admin', REGIONAL_MANAGER: '/dashboard/regional',
  CENTRE_MANAGER: '/dashboard/centre', TEACHER: '/dashboard/teacher',
  COUNSELLOR: '/dashboard/counsellor', STUDENT: '/dashboard/student',
  PARENT: '/dashboard/parent',
}
