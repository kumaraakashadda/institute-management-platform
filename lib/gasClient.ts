/**
 * gasClient.ts — single point of contact with the GAS backend.
 * 
 * When NEXT_PUBLIC_GAS_URL is NOT set   → demo mode (hardcoded accounts, mock data)
 * When NEXT_PUBLIC_GAS_URL IS set       → real mode (live GAS API calls)
 * 
 * Every page uses gasGet() / gasPost() — never fetch() directly.
 */

export const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || ''

// IS_DEMO is evaluated at call-time (not module load time) so it correctly
// reflects whether the current user logged in with a demo account.
// Called as IS_DEMO or isDemo() — both patterns work.
export function isDemo(): boolean {
  if (!GAS_URL) return true
  if (typeof window === 'undefined') return true
  return tok().startsWith('demo-token')
}
// Backward-compat constant for SSR/static contexts — components that need
// reactivity should call isDemo() inside useEffect / event handlers.
export const IS_DEMO = !GAS_URL

export interface GasResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
}

function tok() {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('imp_token') || ''
}

function isDemoToken() {
  return tok().startsWith('demo-token-') || tok() === 'demo-token'
}

export async function gasPost<T = unknown>(
  action: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  if (!GAS_URL || isDemoToken()) throw new Error('DEMO_MODE')
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action, token: tok(), data }),
    headers: { 'Content-Type': 'text/plain' },
  })
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const json: GasResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error || 'Backend error')
  return json.data as T
}

export async function gasGet<T = unknown>(
  action: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  if (!GAS_URL || isDemoToken()) throw new Error('DEMO_MODE')
  const params = new URLSearchParams({ action, token: tok(), data: JSON.stringify(data) })
  const res = await fetch(`${GAS_URL}?${params}`)
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const json: GasResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error || 'Backend error')
  return json.data as T
}

// ── Demo accounts for when GAS_URL is not set ─────────────────────────────────
const DEMO_ACCOUNTS: Record<string, { role: string; name: string; centre: string }> = {
  'admin@demo.com':      { role: 'SUPER_ADMIN',      name: 'Super Admin',     centre: '' },
  'manager@demo.com':    { role: 'CENTRE_MANAGER',   name: 'Centre Manager',  centre: 'Delhi Rohini' },
  'teacher@demo.com':    { role: 'TEACHER',          name: 'Demo Teacher',    centre: 'Delhi Rohini' },
  'counsellor@demo.com': { role: 'COUNSELLOR',       name: 'Demo Counsellor', centre: 'Delhi Rohini' },
  'student@demo.com':    { role: 'STUDENT',          name: 'Demo Student',    centre: 'Delhi Rohini' },
  'parent@demo.com':     { role: 'PARENT',           name: 'Demo Parent',     centre: 'Delhi Rohini' },
}

export async function gasLogin(identifier: string, password: string) {
  // Demo accounts always work — even when GAS backend is connected.
  // This lets you test every role without needing sheet entries for them.
  const acc = DEMO_ACCOUNTS[identifier]
  if (acc && password === 'Demo@1234') {
    return { token: 'demo-token-' + acc.role, role: acc.role, id: 'DEMO001', name: acc.name, centre: acc.centre, mustResetPassword: false }
  }

  // Real login via GAS backend
  if (!GAS_URL) {
    throw new Error('No backend configured. Use a demo account (e.g. admin@demo.com / Demo@1234) to explore.')
  }
  const res = await fetch(GAS_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'login', data: { identifier, password } }),
    headers: { 'Content-Type': 'text/plain' },
  })
  const json: GasResponse = await res.json()
  if (!json.success) throw new Error(json.error || 'Login failed')
  return json.data as { token: string; role: string; id: string; name: string; centre: string; mustResetPassword: boolean }
}

// ── Demo data for dashboard pages when GAS_URL is set but data is loading ─────
export const DEMO_FEE_DASHBOARD = {
  cards: {
    total_fees: 4250000, total_collected: 2975000, total_pending: 1275000,
    today_collection: 45000, month_collection: 385000, upcoming_dues_count: 23,
    overdue_installments: 8, overdue_amount: 156000, students_with_pending: 47,
    collection_pct: 70, total_students: 120,
  },
  status_breakdown: { Paid: 73, Partial: 32, Pending: 15 },
}

export const DEMO_ADMIN_STATS = {
  total_students: 124,
  active_students: 118,
  today_attendance_pct: 84,
  present_today: 99,
  absent_today: 19,
  active_sessions: 3,
  total_centres: 4,
  fee_collected_month: 385000,
  fee_pending: 1275000,
  collection_pct: 70,
  overdue_students: 8,
  new_admissions_month: 12,
}
