'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardBody, CardHeader, Badge, Alert } from '@/components/ui'
import { gasGet, IS_DEMO, DEMO_ADMIN_STATS } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

interface AdminStats {
  total_students: number
  active_students: number
  today_attendance_pct: number
  present_today: number
  absent_today: number
  active_sessions: number
  total_centres: number
  fee_collected_month: number
  fee_pending: number
  collection_pct: number
  overdue_students: number
  new_admissions_month: number
}

const QUICK_LINKS = [
  { href: '/dashboard/fees',         label: 'Fee Management',  icon: '💰', colour: 'text-blue-600   bg-blue-50   dark:bg-blue-900/20   dark:text-blue-400' },
  { href: '/dashboard/fees/crm',     label: 'CRM Pipeline',    icon: '🎯', colour: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-400' },
  { href: '/dashboard/fees/calendar',label: 'Fee Calendar',    icon: '📅', colour: 'text-teal-600   bg-teal-50   dark:bg-teal-900/20   dark:text-teal-400' },
  { href: '/dashboard/fees/reports', label: 'Reports',         icon: '📊', colour: 'text-green-600  bg-green-50  dark:bg-green-900/20  dark:text-green-400' },
  { href: '/dashboard/fees/plans',   label: 'Fee Plans',       icon: '📋', colour: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400' },
  { href: '/dashboard/attendance',   label: 'Attendance',      icon: '✅', colour: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-400' },
]

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['adminStats'],
    queryFn: () => gasGet<AdminStats>('getAdminDashboard', {}),
    retry: 1,
    enabled: !IS_DEMO,
  })

  const stats = data ?? DEMO_ADMIN_STATS
  const showDemoBanner = IS_DEMO
  const showErrorBanner = !IS_DEMO && isError

  return (
    <DashboardShell title="Admin Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">Admin Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {showDemoBanner ? 'Demo mode — 6 demo accounts active' : isLoading ? 'Loading live data…' : 'Live data from your database'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showDemoBanner && <Badge variant="warning">Demo Mode</Badge>}
            {!showDemoBanner && !isLoading && !isError && <Badge variant="success">● Live</Badge>}
            {isLoading && <Badge variant="info">Loading…</Badge>}
          </div>
        </div>

        {/* Banners */}
        {showDemoBanner && (
          <Alert variant="info">
            <span className="font-semibold">Demo mode active.</span> All 6 role accounts work (password: Demo@1234).
            To connect your real backend, add <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded text-xs">NEXT_PUBLIC_GAS_URL</code> in
            Vercel → Settings → Environment Variables, then redeploy.
          </Alert>
        )}
        {showErrorBanner && (
          <Alert variant="danger">
            <span className="font-semibold">Backend error:</span> {String(error).replace('Error: ', '')}
            <span className="ml-2 text-xs opacity-75">Check your GAS URL and make sure the backend is deployed.</span>
          </Alert>
        )}

        {/* Primary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Students"  value={isLoading ? '…' : String(stats.total_students)}  colour="blue"   icon="🎓" sub={`${stats.active_students} active`} />
          <StatCard label="Present Today"   value={isLoading ? '…' : String(stats.present_today)}   colour="green"  icon="✅" sub={`${stats.today_attendance_pct}% attendance`} />
          <StatCard label="Fee Collected"   value={isLoading ? '…' : fmt(stats.fee_collected_month)} colour="teal"  icon="💰" sub="This month" />
          <StatCard label="New Admissions"  value={isLoading ? '…' : String(stats.new_admissions_month)} colour="indigo" icon="🎉" sub="This month" />
        </div>

        {/* Secondary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Absent Today"    value={isLoading ? '…' : String(stats.absent_today)}    colour="red"    icon="❌" />
          <StatCard label="Active Sessions" value={isLoading ? '…' : String(stats.active_sessions)} colour="purple" icon="📡" sub="Live QR sessions" />
          <StatCard label="Fee Pending"     value={isLoading ? '…' : fmt(stats.fee_pending)}        colour="orange" icon="⏳" sub={`${100 - stats.collection_pct}% uncollected`} />
          <StatCard label="Overdue Fees"    value={isLoading ? '…' : String(stats.overdue_students)} colour="amber" icon="🔴" sub="students overdue" />
        </div>

        {/* Collection progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">Overall Fee Collection Rate</h2>
              <span className="text-2xl font-black text-blue-600">{stats.collection_pct}%</span>
            </div>
          </CardHeader>
          <CardBody>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 mb-3">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
                style={{ width: `${stats.collection_pct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500">
              <span>Collected: {fmt(stats.fee_collected_month)}</span>
              <span>Pending: {fmt(stats.fee_pending)}</span>
            </div>
          </CardBody>
        </Card>

        {/* Quick access */}
        <div>
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {QUICK_LINKS.map(({ href, label, icon, colour }) => (
              <Link key={href} href={href}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center group card-hover`}>
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colour}`}>{icon}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Milestone completion status */}
        <Card>
          <CardHeader>
            <h2 className="font-bold text-gray-800 dark:text-gray-200">Platform Completion Status</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {[
                { ms: 'Milestone 1', label: 'Auth + RBAC + 7 Role Dashboards', status: 'complete', pct: 100 },
                { ms: 'Milestone 2', label: 'Database + GAS Backend API',        status: IS_DEMO ? 'partial' : 'complete', pct: IS_DEMO ? 70 : 100 },
                { ms: 'Milestone 3', label: 'Fee Management + CRM Pipeline',     status: IS_DEMO ? 'partial' : 'complete', pct: IS_DEMO ? 80 : 100 },
                { ms: 'Milestone 4', label: 'Attendance QR System',              status: 'pending', pct: 0 },
              ].map(({ ms, label, status, pct }) => (
                <div key={ms}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={status === 'complete' ? 'success' : status === 'partial' ? 'warning' : 'default'}>
                        {status === 'complete' ? '✓' : status === 'partial' ? '~' : '○'} {ms}
                      </Badge>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-500">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full transition-all duration-500 ${
                      status === 'complete' ? 'bg-emerald-500' : status === 'partial' ? 'bg-amber-400' : 'bg-gray-200 dark:bg-gray-700'
                    }`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {IS_DEMO && (
              <p className="text-xs text-gray-400 mt-4">
                M2 and M3 show as partial because GAS URL is not connected. Once you add NEXT_PUBLIC_GAS_URL, these will show as complete.
              </p>
            )}
          </CardBody>
        </Card>

      </div>
    </DashboardShell>
  )
}
