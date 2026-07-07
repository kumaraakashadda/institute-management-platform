'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { gasLogin } from '@/lib/gasClient'
import { useAuthStore, ROLE_ROUTES } from '@/store/authStore'

const ROLES = [
  { email: 'admin@demo.com',      label: 'Super Admin',     abbr: 'SA', color: '#7C3AED' },
  { email: 'manager@demo.com',    label: 'Centre Manager',  abbr: 'CM', color: '#2563EB' },
  { email: 'teacher@demo.com',    label: 'Teacher',         abbr: 'TC', color: '#059669' },
  { email: 'counsellor@demo.com', label: 'Counsellor',      abbr: 'CO', color: '#D97706' },
  { email: 'student@demo.com',    label: 'Student',         abbr: 'ST', color: '#DC2626' },
  { email: 'parent@demo.com',     label: 'Parent',          abbr: 'PR', color: '#DB2777' },
]

const STATS = [
  { value: '1,24,850', label: 'Students Enrolled', icon: '🎓' },
  { value: '48',       label: 'Active Centres',    icon: '🏫' },
  { value: '87.3%',    label: 'Avg Attendance',    icon: '📊' },
]

export default function LoginPage() {
  const [id, setId]         = useState('')
  const [pw, setPw]         = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const [active, setActive] = useState<number | null>(null)
  const [tick, setTick]     = useState(0)
  const { login }           = useAuthStore()
  const router              = useRouter()
  const isDemo = true // always show demo roles on login

  // Subtle shimmer animation tick
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 3000)
    return () => clearInterval(t)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const d = await gasLogin(id, pw)
      login(d.token, d.role, d.id, d.name)
      router.push(ROLE_ROUTES[d.role] || '/dashboard/admin')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  function pickRole(idx: number) {
    setActive(idx)
    setId(ROLES[idx].email)
    setPw('Demo@1234')
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div
        className="relative hidden lg:flex lg:w-[52%] flex-col justify-between overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #0a1628 0%, #0f2147 50%, #0d1a38 100%)' }}
      >
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#60a5fa 1px, transparent 1px), linear-gradient(90deg, #60a5fa 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }} />

        {/* Glowing orbs */}
        <div className="absolute top-[-80px] left-[-80px] w-80 h-80 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-60px] right-[-60px] w-64 h-64 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }} />
        <div
          className="absolute top-[40%] right-[10%] w-40 h-40 rounded-full opacity-10 transition-all duration-3000"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)', transform: `translateY(${tick % 2 === 0 ? '-8px' : '8px'})`, transition: 'transform 3s ease-in-out' }} />

        {/* Brand */}
        <div className="relative z-10 p-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>
              I
            </div>
            <div>
              <p className="text-white font-bold text-lg leading-none tracking-tight">IMP</p>
              <p className="text-blue-400 text-xs font-medium tracking-widest uppercase">Platform</p>
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 px-10 py-6 flex-1 flex flex-col justify-center">
          <div className="mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full border"
              style={{ color: '#f59e0b', borderColor: 'rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.08)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Live Platform
            </span>
          </div>
          <h1 className="text-white font-black leading-[1.1] mb-4"
            style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', letterSpacing: '-0.03em' }}>
            Institute<br/>
            <span style={{ background: 'linear-gradient(90deg, #60a5fa, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Management
            </span><br/>
            Platform
          </h1>
          <p className="text-blue-200 text-sm leading-relaxed max-w-xs" style={{ opacity: 0.75 }}>
            Complete operations platform for coaching institutes — attendance, fees, admissions and analytics in one place.
          </p>

          {/* Stat cards */}
          <div className="mt-8 space-y-3">
            {STATS.map((s, i) => (
              <div key={i}
                className="flex items-center gap-4 rounded-xl px-4 py-3 border transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(8px)',
                  animationDelay: `${i * 200}ms`,
                }}>
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className="text-white font-bold text-lg leading-none">{s.value}</p>
                  <p className="text-blue-300 text-xs mt-0.5" style={{ opacity: 0.7 }}>{s.label}</p>
                </div>
                <div className="ml-auto">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tag */}
        <div className="relative z-10 px-10 pb-8">
          <p className="text-xs" style={{ color: 'rgba(148,163,184,0.5)' }}>
            Trusted by coaching institutes across India
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50 dark:bg-gray-950 min-h-screen lg:min-h-0">
        <div className="w-full max-w-[420px]">

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)' }}>I</div>
            <div>
              <p className="font-black text-gray-900 dark:text-white text-lg leading-none">IMP</p>
              <p className="text-xs text-blue-600 font-medium tracking-widest uppercase">Platform</p>
            </div>
          </div>

          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Welcome back</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Sign in to your account to continue</p>
          </div>

          {/* Role picker */}
          {isDemo && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">Quick access — pick a role</p>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map((r, i) => (
                  <button key={i} onClick={() => pickRole(i)}
                    className="relative flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-center transition-all duration-150 group"
                    style={{
                      background: active === i ? r.color + '12' : 'white',
                      borderColor: active === i ? r.color + '60' : '#e5e7eb',
                      boxShadow: active === i ? `0 0 0 2px ${r.color}30` : 'none',
                    }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-black shrink-0"
                      style={{ background: r.color }}>
                      {r.abbr}
                    </span>
                    <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 leading-tight">{r.label}</span>
                    {active === i && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                All demo accounts use password <span className="font-semibold text-gray-500">Demo@1234</span>
              </p>
            </div>
          )}

          {/* Divider */}
          {isDemo && (
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              <span className="text-xs text-gray-400">or enter manually</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
            </div>
          )}

          {/* Form card */}
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
            <form onSubmit={submit} className="space-y-4">
              {/* Email field */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  Email or Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                  <input
                    type="text" value={id} onChange={e => setId(e.target.value)} required
                    placeholder="admin@demo.com"
                    className="w-full pl-8 pr-3 py-2.5 rounded-xl border text-sm outline-none transition-all
                      border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                      text-gray-900 dark:text-gray-100 placeholder-gray-400
                      focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Password field */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-gray-700 dark:text-gray-300">Password</label>
                  <button type="button" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Forgot?</button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔒</span>
                  <input
                    type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)} required
                    placeholder="••••••••"
                    className="w-full pl-8 pr-10 py-2.5 rounded-xl border text-sm outline-none transition-all
                      border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800
                      text-gray-900 dark:text-gray-100 placeholder-gray-400
                      focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-medium">
                    {showPw ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2.5">
                  <span className="text-red-500 text-sm shrink-0">⚠</span>
                  <p className="text-xs text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl text-white text-sm font-bold transition-all disabled:opacity-60 relative overflow-hidden group"
                style={{ background: loading ? '#3b82f6' : 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      Sign In
                      <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                    </>
                  )}
                </span>
              </button>
            </form>
          </div>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Institute Management Platform · v2.0 · Secure Login
          </p>
        </div>
      </div>
    </div>
  )
}
