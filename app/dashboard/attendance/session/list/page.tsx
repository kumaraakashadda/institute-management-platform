'use client'

import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge, Button, EmptyState, Spinner } from '@/components/ui'
import { useSessions } from '@/lib/attendance/useAttendance'
import { IS_DEMO } from '@/lib/gasClient'
import type { AttendanceSession } from '@/lib/attendance/types'

const STATUS_V = { Active: 'success', Closed: 'default', Expired: 'danger', Cancelled: 'danger' } as const

const DEMO_SESSIONS: AttendanceSession[] = [
  { Session_ID:'SES000001', Centre:'Delhi Rohini', Batch:'JEE-2026-A', Course:'JEE Advanced', Subject:'Physics', Teacher_ID:'TCH001', Classroom:'Room 201', Start_Time:new Date(Date.now()-3600000).toISOString(), Duration_Minutes:60, Grace_Minutes:5, Expiry_Time:new Date(Date.now()+1800000).toISOString(), QR_Token:'t1', Status:'Active', Created_At:new Date().toISOString(), present_count:32, absent_count:13, total_students:45 },
  { Session_ID:'SES000002', Centre:'Delhi Rohini', Batch:'NEET-2025-B', Course:'NEET', Subject:'Biology', Teacher_ID:'TCH001', Classroom:'Room 105', Start_Time:new Date(Date.now()-7200000).toISOString(), Duration_Minutes:90, Grace_Minutes:10, Expiry_Time:new Date(Date.now()-3600000).toISOString(), QR_Token:'t2', Status:'Closed', Created_At:new Date().toISOString(), present_count:28, absent_count:7, total_students:35 },
  { Session_ID:'SES000003', Centre:'Delhi Rohini', Batch:'JEE-2026-A', Course:'JEE Advanced', Subject:'Maths', Teacher_ID:'TCH001', Classroom:'Room 201', Start_Time:new Date(Date.now()-86400000).toISOString(), Duration_Minutes:60, Grace_Minutes:5, Expiry_Time:new Date(Date.now()-82800000).toISOString(), QR_Token:'t3', Status:'Closed', Created_At:new Date().toISOString(), present_count:40, absent_count:5, total_students:45 },
]

export default function SessionListPage() {
  const { data, isLoading } = useSessions()
  const sessions = data ?? (IS_DEMO ? DEMO_SESSIONS : [])

  return (
    <DashboardShell title="My Sessions">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📋 My Sessions</h1>
            <p className="text-sm text-gray-500 mt-0.5">{sessions.length} sessions</p>
          </div>
          <Link href="/dashboard/attendance/session/new">
            <Button>+ New Session</Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12"><Spinner size="lg"/></div>
        ) : sessions.length === 0 ? (
          <Card><CardBody><EmptyState icon="📋" title="No sessions yet" message="Start your first attendance session." /></CardBody></Card>
        ) : (
          <div className="space-y-3">
            {sessions.map(s => {
              const pct = s.total_students ? Math.round(((s.present_count||0)/s.total_students)*100) : 0
              const date = new Date(s.Start_Time)
              return (
                <Link key={s.Session_ID} href={`/dashboard/attendance/session/${s.Session_ID}`}>
                  <div className="bg-white dark:bg-[#0d1426] rounded-2xl border border-gray-100 dark:border-gray-800 p-4 hover:shadow-md transition-all cursor-pointer">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant={STATUS_V[s.Status]}>{s.Status}</Badge>
                          <Badge variant="info">{s.Subject}</Badge>
                          {s.Status === 'Active' && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">{s.Batch} · {s.Course}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{s.Classroom} · {date.toLocaleDateString()} {date.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} · {s.Duration_Minutes}min</p>
                      </div>
                      <div className="flex items-center gap-6 shrink-0">
                        <div className="text-center">
                          <p className="text-2xl font-black text-emerald-600">{s.present_count||0}</p>
                          <p className="text-[10px] text-gray-500">present</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-black text-red-500">{s.absent_count||0}</p>
                          <p className="text-[10px] text-gray-500">absent</p>
                        </div>
                        <div className="text-center">
                          <p className={`text-2xl font-black ${pct>=75?'text-emerald-600':pct>=60?'text-amber-500':'text-red-500'}`}>{pct}%</p>
                          <p className="text-[10px] text-gray-500">rate</p>
                        </div>
                        <span className="text-gray-400 text-sm hidden sm:block">→</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
