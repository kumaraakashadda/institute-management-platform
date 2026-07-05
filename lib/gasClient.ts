const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL || ''

export interface GasResponse<T = unknown> { success: boolean; data?: T; error?: string; code?: string }

const tok = () => typeof window !== 'undefined' ? localStorage.getItem('imp_token') || '' : ''

export async function gasPost<T = unknown>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  if (!GAS_URL) throw new Error('Backend not configured — add NEXT_PUBLIC_GAS_URL to Vercel environment variables.')
  const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action, token: tok(), data }), headers: { 'Content-Type': 'text/plain' } })
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const json: GasResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error || 'Backend error')
  return json.data as T
}

export async function gasGet<T = unknown>(action: string, data: Record<string, unknown> = {}): Promise<T> {
  if (!GAS_URL) throw new Error('Backend not configured — add NEXT_PUBLIC_GAS_URL to Vercel environment variables.')
  const params = new URLSearchParams({ action, token: tok(), data: JSON.stringify(data) })
  const res = await fetch(`${GAS_URL}?${params}`)
  if (!res.ok) throw new Error(`Network error: ${res.status}`)
  const json: GasResponse<T> = await res.json()
  if (!json.success) throw new Error(json.error || 'Backend error')
  return json.data as T
}

const DEMO_ACCOUNTS: Record<string, { role: string; name: string }> = {
  'admin@demo.com':      { role: 'SUPER_ADMIN',      name: 'Super Admin' },
  'manager@demo.com':    { role: 'CENTRE_MANAGER',   name: 'Centre Manager' },
  'teacher@demo.com':    { role: 'TEACHER',          name: 'Demo Teacher' },
  'counsellor@demo.com': { role: 'COUNSELLOR',       name: 'Demo Counsellor' },
  'student@demo.com':    { role: 'STUDENT',          name: 'Demo Student' },
  'parent@demo.com':     { role: 'PARENT',           name: 'Demo Parent' },
}

export async function gasLogin(identifier: string, password: string) {
  if (!GAS_URL) {
    const acc = DEMO_ACCOUNTS[identifier]
    if (acc && password === 'Demo@1234') return { token: 'demo-token', role: acc.role, id: 'DEMO001', name: acc.name, mustResetPassword: false }
    throw new Error('Invalid email or password. Try admin@demo.com / Demo@1234')
  }
  const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify({ action: 'login', data: { identifier, password } }), headers: { 'Content-Type': 'text/plain' } })
  const json: GasResponse = await res.json()
  if (!json.success) throw new Error(json.error || 'Login failed')
  return json.data as { token: string; role: string; id: string; name: string; mustResetPassword: boolean }
}
