'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

interface NavItem { href: string; label: string; icon: string; badge?: string }

const NAV: Record<string, NavItem[]> = {
  SUPER_ADMIN: [
    { href: '/dashboard/admin',         label: 'Overview',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/dashboard/fees',           label: 'Fee Mgmt',     icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/dashboard/fees/crm',       label: 'CRM Pipeline', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { href: '/dashboard/fees/plans',     label: 'Fee Plans',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
    { href: '/dashboard/fees/reports',   label: 'Reports',      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { href: '/dashboard/attendance',     label: 'Attendance',   icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', badge: 'M4' },
  ],
  CENTRE_MANAGER: [
    { href: '/dashboard/centre',         label: 'Overview',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/dashboard/fees',           label: 'Fee Mgmt',     icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/dashboard/fees/crm',       label: 'CRM Pipeline', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { href: '/dashboard/attendance',     label: 'Attendance',   icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
  TEACHER: [
    { href: '/dashboard/teacher',        label: 'Overview',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/dashboard/attendance',     label: 'Attendance',   icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  ],
  COUNSELLOR: [
    { href: '/dashboard/counsellor',     label: 'Overview',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/dashboard/fees',           label: 'Fee Mgmt',     icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { href: '/dashboard/fees/crm',       label: 'CRM Pipeline', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ],
  STUDENT: [
    { href: '/dashboard/student',        label: 'My Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/dashboard/fees/student',   label: 'My Fees',      icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ],
  PARENT: [
    { href: '/dashboard/parent',         label: 'Overview',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/dashboard/fees/student',   label: 'Fee Status',   icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  ],
  REGIONAL_MANAGER: [
    { href: '/dashboard/regional',       label: 'Overview',     icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { href: '/dashboard/fees/reports',   label: 'Reports',      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  ],
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin', REGIONAL_MANAGER: 'Regional Manager',
  CENTRE_MANAGER: 'Centre Manager', TEACHER: 'Teacher',
  COUNSELLOR: 'Counsellor', STUDENT: 'Student', PARENT: 'Parent',
}

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: '#7C3AED', REGIONAL_MANAGER: '#0369A1', CENTRE_MANAGER: '#2563EB',
  TEACHER: '#059669', COUNSELLOR: '#D97706', STUDENT: '#DC2626', PARENT: '#DB2777',
}

function SvgIcon({ path, size = 18 }: { path: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])
  function toggle() {
    const n = !dark; setDark(n)
    document.documentElement.classList.toggle('dark', n)
    localStorage.setItem('imp_theme', n ? 'dark' : 'light')
  }
  return (
    <button onClick={toggle} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {dark
          ? <path d="M12 3v1m0 16v1M4.22 4.22l.707.707m12.728 12.728l.707.707M3 12h1m16 0h1M4.927 19.073l.707-.707M18.366 5.634l.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          : <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        }
      </svg>
    </button>
  )
}

export function DashboardShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [notifOpen, setNotifOpen]     = useState(false)
  const { role, name, logout } = useAuthStore()
  const pathname = usePathname()
  const router   = useRouter()
  const nav      = NAV[role || ''] || []
  const roleColor = ROLE_COLORS[role || ''] || '#2563EB'
  const initials  = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  // Close notification panel when clicking outside
  useEffect(() => {
    if (!notifOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('#notif-panel') && !target.closest('#notif-btn')) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [notifOpen])

  // Demo notifications — role-specific
  const DEMO_NOTIFS: Record<string, { icon: string; title: string; body: string; time: string; unread: boolean }[]> = {
    TEACHER: [
      { icon: '📋', title: 'Session auto-closed', body: 'JEE-2026-A Physics session closed — 42/45 present', time: '2 min ago', unread: true },
      { icon: '⚠️', title: 'Low attendance alert', body: 'Student Ravi Kumar is below 75% threshold', time: '1 hr ago', unread: true },
      { icon: '✅', title: 'Leave approved', body: 'Your leave request for Jul 10 was approved', time: '3 hrs ago', unread: false },
    ],
    STUDENT: [
      { icon: '📢', title: 'Attendance marked', body: 'Your attendance for Physics (today) is confirmed', time: '5 min ago', unread: true },
      { icon: '💰', title: 'Fee reminder', body: 'Installment 2 of ₹8,500 is due on Jul 15', time: '2 hrs ago', unread: true },
      { icon: '📅', title: 'Class rescheduled', body: 'Chemistry class moved to 11:00 AM tomorrow', time: 'Yesterday', unread: false },
    ],
    PARENT: [
      { icon: '📊', title: "Child attendance update", body: 'Arjun attended 4/5 classes this week (80%)', time: '30 min ago', unread: true },
      { icon: '💰', title: 'Fee due soon', body: 'Installment of ₹8,500 due in 3 days', time: '1 day ago', unread: true },
    ],
    SUPER_ADMIN: [
      { icon: '🏫', title: 'New admission', body: '12 new admissions recorded this month', time: '1 hr ago', unread: true },
      { icon: '⚠️', title: 'System alert', body: '3 students below 60% attendance — needs action', time: '3 hrs ago', unread: true },
      { icon: '💰', title: 'Collection milestone', body: 'Monthly collection crossed ₹3.8L today', time: 'Today', unread: false },
      { icon: '📋', title: 'Report ready', body: 'July monthly attendance report generated', time: 'Yesterday', unread: false },
    ],
    CENTRE_MANAGER: [
      { icon: '👥', title: 'Session started', body: 'Teacher Meera started Physics session — Room 201', time: '5 min ago', unread: true },
      { icon: '⚠️', title: 'Defaulter alert', body: '5 students are below attendance threshold', time: '2 hrs ago', unread: true },
      { icon: '💰', title: 'Payment received', body: '₹12,000 collected — Rahul Sharma Installment 2', time: '4 hrs ago', unread: false },
    ],
    COUNSELLOR: [
      { icon: '💰', title: 'Fee due today', body: '4 students have installments due today', time: '1 hr ago', unread: true },
      { icon: '📞', title: 'Follow-up reminder', body: 'Call Priya Singh — overdue since Jul 1', time: '2 hrs ago', unread: true },
    ],
    REGIONAL_MANAGER: [
      { icon: '📊', title: 'Weekly summary', body: 'Delhi region: 83% avg attendance this week', time: '2 hrs ago', unread: true },
      { icon: '🏆', title: 'Top performer', body: 'Delhi Rohini centre: 91% attendance rate', time: 'Today', unread: false },
    ],
  }
  const notifs = DEMO_NOTIFS[role || ''] || DEMO_NOTIFS['SUPER_ADMIN']
  const unreadCount = notifs.filter(n => n.unread).length

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0f1e] flex">

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ─────────────────────────────────────────────── */}
      <aside className={`
        fixed top-0 left-0 z-30 h-full w-64 flex flex-col
        bg-white dark:bg-[#0d1426]
        border-r border-gray-100 dark:border-gray-800/60
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:z-auto
        shadow-xl lg:shadow-none
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 shrink-0 border-b border-gray-100 dark:border-gray-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-black shrink-0"
              style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)' }}>
              I
            </div>
            <div>
              <p className="text-sm font-black text-gray-900 dark:text-white tracking-tight leading-none">IMP</p>
              <p className="text-[9px] text-blue-600 dark:text-blue-400 font-bold tracking-[0.15em] uppercase leading-none mt-0.5">Platform</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">Live</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {/* Section label */}
          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-2">Navigation</p>

          {nav.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard/admin' && item.href !== '/dashboard/centre' && item.href !== '/dashboard/teacher' && item.href !== '/dashboard/student' && item.href !== '/dashboard/counsellor' && item.href !== '/dashboard/regional' && item.href !== '/dashboard/parent' && pathname.startsWith(item.href))
            return (
              <Link key={item.href} href={item.href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-xl mb-0.5 text-sm font-medium transition-all duration-150 group
                  ${isActive
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800/60'
                  }
                `}
                style={isActive ? { background: `linear-gradient(135deg, ${roleColor}ee, ${roleColor}cc)` } : {}}>
                <span className={`shrink-0 transition-colors ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}>
                  <SvgIcon path={item.icon} size={17} />
                </span>
                <span className="truncate">{item.label}</span>
                {item.badge && (
                  <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isActive ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                    {item.badge}
                  </span>
                )}
                {isActive && <span className="ml-auto text-white/60 text-xs">→</span>}
              </Link>
            )
          })}

          {/* Divider + Settings */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60">
            <p className="text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase tracking-widest px-3 mb-2">Account</p>
            <button onClick={() => { logout(); router.push('/auth/login') }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-500 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Sign Out</span>
            </button>
          </div>
        </nav>

        {/* User card */}
        <div className="p-3 border-t border-gray-100 dark:border-gray-800/60 shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-xl bg-gray-50 dark:bg-gray-800/50">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ background: roleColor }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate">{name || 'User'}</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-500 truncate">{ROLE_LABELS[role || ''] || role}</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />
          </div>
        </div>
      </aside>

      {/* ── MAIN ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="h-16 bg-white dark:bg-[#0d1426] border-b border-gray-100 dark:border-gray-800/60 flex items-center px-4 gap-3 shrink-0">
          <button onClick={() => setSidebarOpen(o => !o)}
            className="lg:hidden w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {title && (
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-gray-900 dark:text-white">{title}</h1>
            </div>
          )}

          {/* Breadcrumb on desktop */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-gray-400">
            <span>IMP</span>
            <span>/</span>
            <span className="text-gray-600 dark:text-gray-300 font-medium capitalize">
              {pathname.split('/').filter(Boolean).slice(-1)[0]?.replace(/-/g, ' ') || 'Dashboard'}
            </span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* Notification bell + dropdown */}
            <div className="relative">
              <button id="notif-btn"
                onClick={() => setNotifOpen(o => !o)}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all relative">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification panel */}
              {notifOpen && (
                <div id="notif-panel"
                  className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden">
                  {/* Header */}
                  <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-gray-900 dark:text-white">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                          {unreadCount} new
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      Mark all read
                    </button>
                  </div>

                  {/* Notification items */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-800">
                    {notifs.map((n, i) => (
                      <div key={i}
                        className={`px-4 py-3 flex gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/60 transition-all ${n.unread ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                        <div className="w-8 h-8 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-base shrink-0">
                          {n.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white leading-tight">{n.title}</p>
                            {n.unread && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 mt-1" />}
                          </div>
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 leading-snug">{n.body}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-600 mt-1">{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-center">
                    <button
                      onClick={() => { setNotifOpen(false); router.push('/dashboard/student/notifications') }}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium">
                      View all notifications →
                    </button>
                  </div>
                </div>
              )}
            </div>

            <ThemeToggle />

            {/* Avatar */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-black"
              style={{ background: roleColor }}>
              {initials}
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
