'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { gasLogin } from '@/lib/gasClient'
import { useAuthStore, ROLE_ROUTES } from '@/store/authStore'

const DEMOS = [
  { email:'admin@demo.com',role:'Super Admin',colour:'bg-purple-500' },
  { email:'manager@demo.com',role:'Centre Manager',colour:'bg-blue-500' },
  { email:'teacher@demo.com',role:'Teacher',colour:'bg-green-500' },
  { email:'counsellor@demo.com',role:'Counsellor',colour:'bg-yellow-500' },
  { email:'student@demo.com',role:'Student',colour:'bg-orange-500' },
  { email:'parent@demo.com',role:'Parent',colour:'bg-pink-500' },
]

export default function LoginPage() {
  const [id, setId] = useState(''); const [pw, setPw] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState('')
  const { login } = useAuthStore(); const router = useRouter()
  const isDemo = !process.env.NEXT_PUBLIC_GAS_URL

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const d = await gasLogin(id, pw)
      login(d.token, d.role, d.id, d.name)
      router.push(ROLE_ROUTES[d.role] || '/dashboard/admin')
    } catch(err) { setError(err instanceof Error ? err.message : 'Login failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white text-3xl font-black mb-4 shadow-lg">I</div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Institute Management</h1>
          <p className="text-sm text-gray-500 mt-1">Sign in to your account</p>
        </div>
        {isDemo && (
          <div className="mb-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 p-4">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-3">Demo Accounts — click to auto-fill</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMOS.map(a => (
                <button key={a.email} onClick={() => { setId(a.email); setPw('Demo@1234'); setError('') }}
                  className="flex items-center gap-2 rounded-lg p-2 hover:bg-blue-100 dark:hover:bg-blue-800/30 transition-colors text-left">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${a.colour}`} />
                  <span className="text-xs text-gray-700 dark:text-gray-300 font-medium truncate">{a.role}</span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-800 p-8">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email / Phone</label>
              <input type="text" value={id} onChange={e=>setId(e.target.value)} required placeholder="admin@demo.com"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Password</label>
              <input type="password" value={pw} onChange={e=>setPw(e.target.value)} required placeholder="Demo@1234"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
          {isDemo && <p className="text-center text-xs text-gray-400 mt-4">All demo passwords: <strong>Demo@1234</strong></p>}
        </div>
      </div>
    </div>
  )
}
