'use client'

import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardBody, Badge, Alert, Spinner, EmptyState } from '@/components/ui'
import { useAttendanceDashboard, useActiveSessions } from '@/lib/attendance/useAttendance'
import { useAuthStore } from '@/store/authStore'
import { IS_DEMO } from '@/lib/gasClient'
import type { AttendanceSession } from '@/lib/attendance/types'

function PctRing({ pct }: { pct: number }) {
  const r = 20; const c = 2 * Math.PI * r
  const fill = ((pct || 0) / 100) * c
  const colour = pct >= 75 ? '#10b981' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx="28" cy="28" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4" />
      <circle cx="28" cy="28" r={r} fill="none" stroke={colour} strokeWidth="4"
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round" transform="rotate(-90 28 28)" />
      <text x="28" y="32" textAnchor="middle" fontSize="10" fontWeight="bold" fill={colour}>{pct}%</text>
    </svg>
  )
}

function SessionCard({ s }: { s: AttendanceSession }) {
  const pct = s.total_students ? Math.round(((s.present_count||0)/s.total_students)*100) : 0
  const mins = Math.max(0, Math.floor((new Date(s.Expiry_Time).getTime()-Date.now())/60000))
  return (
    <Link href={`/dashboard/attendance/session/${s.Session_ID}`}>
      <div className="bg-white dark:bg-[#0d1426] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:shadow-md transition-all cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shrink-0" />
              <span className="text-xs font-bold text-green-600 dark:text-green-400">LIVE</span>
              <Badge variant="info" className="text-[10px]">{s.Subject}</Badge>
            </div>
            <p className="font-bold text-gray-900 dark:text-white text-sm">{s.Batch} · {s.Course}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.Classroom} · expires in {mins}m</p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="text-emerald-600 font-semibold">✅ {s.present_count||0} present</span>
              <span className="text-red-500 font-semibold">❌ {s.absent_count||0} absent</span>
              <span className="text-gray-400">/ {s.total_students||'—'} total</span>
            </div>
          </div>
          <PctRing pct={pct} />
        </div>
      </div>
    </Link>
  )
}

export default function AttendancePage() {
  const { role } = useAuthStore()
  const { data: dashboard, isLoading, isError } = useAttendanceDashboard()
  const { data: activeSessions } = useActiveSessions()
  const isTeacher = ['TEACHER','SUPER_ADMIN','CENTRE_MANAGER'].includes(role||'')
  const today = dashboard?.today
  const month = dashboard?.month

  return (
    <DashboardShell title="Attendance">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">📋 Attendance</h1>
            <p className="text-sm text-gray-500 mt-0.5">Hybrid QR-based attendance management</p>
          </div>
          {isTeacher && (
            <Link href="/dashboard/attendance/session/new">
              <button className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold"
                style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)',boxShadow:'0 4px 14px rgba(37,99,235,.35)'}}>
                <span>+</span> Start Session
              </button>
            </Link>
          )}
        </div>

        {IS_DEMO && <Alert variant="info"><strong>Demo mode.</strong> Add NEXT_PUBLIC_GAS_URL in Vercel to see live attendance data.</Alert>}
        {!IS_DEMO && isError && <Alert variant="danger">Backend error. Check your GAS URL.</Alert>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Present Today"  value={isLoading?'…':String(today?.present??'—')}  colour="green"  icon="✅" sub={`${today?.attendance_pct??0}% rate`} />
          <StatCard label="Absent Today"   value={isLoading?'…':String(today?.absent??'—')}   colour="red"    icon="❌" sub="auto-marked" />
          <StatCard label="Live Sessions"  value={isLoading?'…':String(today?.active_sessions??activeSessions?.length??0)} colour="blue" icon="📡" />
          <StatCard label="Month Average"  value={isLoading?'…':`${month?.avg_pct??0}%`}      colour="purple" icon="📊" sub={`${month?.total_sessions??0} sessions`} />
        </div>

        {isTeacher && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Active Sessions</h2>
              <Link href="/dashboard/attendance/session/list" className="text-xs text-blue-600 hover:underline font-medium">View all →</Link>
            </div>
            {isLoading ? <div className="flex justify-center py-8"><Spinner size="lg"/></div>
            : activeSessions && activeSessions.length > 0
              ? <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">{activeSessions.map(s=><SessionCard key={s.Session_ID} s={s}/>)}</div>
              : <Card><CardBody><EmptyState icon="📡" title="No active sessions" message="Start a session to generate a QR code."/></CardBody></Card>
            }
          </div>
        )}

        <div>
          <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-3">Quick Access</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              ...(isTeacher?[
                {href:'/dashboard/attendance/session/new',label:'Start Session',icon:'▶️',colour:'text-blue-600 bg-blue-50 dark:bg-blue-900/20'},
                {href:'/dashboard/attendance/session/list',label:'My Sessions',icon:'📋',colour:'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'},
                {href:'/dashboard/attendance/corrections',label:'Corrections',icon:'✏️',colour:'text-orange-600 bg-orange-50 dark:bg-orange-900/20'},
              ]:[]),
              {href:'/dashboard/attendance/calendar',label:'Calendar',icon:'📅',colour:'text-teal-600 bg-teal-50 dark:bg-teal-900/20'},
              {href:'/dashboard/attendance/reports',label:'Reports',icon:'📊',colour:'text-green-600 bg-green-50 dark:bg-green-900/20'},
              {href:'/dashboard/attendance/scan',label:'Scan QR',icon:'📷',colour:'text-purple-600 bg-purple-50 dark:bg-purple-900/20'},
              {href:'/dashboard/attendance/leave',label:'Leave Requests',icon:'🏖️',colour:'text-pink-600 bg-pink-50 dark:bg-pink-900/20'},
            ].map(({href,label,icon,colour})=>(
              <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center group card-hover">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${colour}`}>{icon}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {month && (month.defaulters||0) > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-red-700 dark:text-red-400">{month.defaulters} students below attendance threshold</p>
              <p className="text-xs text-red-500 mt-0.5">Review the defaulters report</p>
            </div>
            <Link href="/dashboard/attendance/reports" className="text-xs font-bold text-red-600 hover:underline">View →</Link>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
