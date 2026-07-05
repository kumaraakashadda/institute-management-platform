'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore, ROLE_ROUTES } from '@/store/authStore'

const NAV: Record<string, { href: string; label: string; icon: string }[]> = {
  SUPER_ADMIN:      [{ href:'/dashboard/admin',label:'Dashboard',icon:'📊' },{ href:'/dashboard/fees',label:'Fee Mgmt',icon:'💰' },{ href:'/dashboard/fees/crm',label:'CRM Pipeline',icon:'🎯' },{ href:'/dashboard/fees/plans',label:'Fee Plans',icon:'📋' },{ href:'/dashboard/fees/reports',label:'Reports',icon:'📈' },{ href:'/dashboard/attendance',label:'Attendance',icon:'✅' }],
  CENTRE_MANAGER:   [{ href:'/dashboard/centre',label:'Dashboard',icon:'🏫' },{ href:'/dashboard/fees',label:'Fee Mgmt',icon:'💰' },{ href:'/dashboard/fees/crm',label:'CRM Pipeline',icon:'🎯' },{ href:'/dashboard/attendance',label:'Attendance',icon:'✅' }],
  TEACHER:          [{ href:'/dashboard/teacher',label:'Dashboard',icon:'👨‍🏫' },{ href:'/dashboard/attendance',label:'Attendance',icon:'✅' }],
  COUNSELLOR:       [{ href:'/dashboard/counsellor',label:'Dashboard',icon:'🤝' },{ href:'/dashboard/fees',label:'Fee Mgmt',icon:'💰' },{ href:'/dashboard/fees/crm',label:'CRM Pipeline',icon:'🎯' }],
  STUDENT:          [{ href:'/dashboard/student',label:'Dashboard',icon:'🎓' },{ href:'/dashboard/fees/student',label:'My Fees',icon:'💳' }],
  PARENT:           [{ href:'/dashboard/parent',label:'Dashboard',icon:'👨‍👩‍👧' },{ href:'/dashboard/fees/student',label:'Fee Status',icon:'💳' }],
  REGIONAL_MANAGER: [{ href:'/dashboard/regional',label:'Dashboard',icon:'🗺️' },{ href:'/dashboard/fees/reports',label:'Reports',icon:'📈' }],
}

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')) }, [])
  return (
    <button onClick={() => { const n=!dark; setDark(n); document.documentElement.classList.toggle('dark',n); localStorage.setItem('imp_theme',n?'dark':'light') }}
      className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" aria-label="Toggle dark mode">
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

export function DashboardShell({ children, title }: { children: React.ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  const { role, name, logout } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const nav = NAV[role || ''] || []

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {open && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-transform duration-200 ${open?'translate-x-0':'-translate-x-full'} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="h-16 flex items-center px-5 border-b border-gray-200 dark:border-gray-800 shrink-0">
          <span className="text-blue-600 text-xl font-black tracking-tight">IMP</span>
          <span className="ml-2 text-xs text-gray-400 font-medium uppercase tracking-wider">Platform</span>
        </div>
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {nav.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href+'/')
            return (
              <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-colors ${active?'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300':'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100'}`}>
                <span className="text-base">{item.icon}</span><span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 shrink-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0"><p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{name}</p><p className="text-xs text-gray-400 truncate">{role?.replace(/_/g,' ')}</p></div>
            <button onClick={() => { logout(); router.push('/auth/login') }} className="ml-2 text-xs text-gray-400 hover:text-red-500 transition-colors shrink-0">Sign out</button>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center px-4 gap-4 shrink-0">
          <button onClick={() => setOpen(o=>!o)} className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><span className="text-xl">☰</span></button>
          {title && <h1 className="text-lg font-semibold text-gray-800 dark:text-gray-200 hidden sm:block">{title}</h1>}
          <div className="ml-auto flex items-center gap-2"><ThemeToggle /></div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
