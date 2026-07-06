'use client'

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, StatCard, Alert, Spinner } from '@/components/ui'
import { useMyAttendance } from '@/lib/attendance/useAttendance'
import { IS_DEMO } from '@/lib/gasClient'
import type { StudentAttendanceSummary } from '@/lib/attendance/types'

const DEMO_MY: StudentAttendanceSummary = {
  student_id: 'STU000001',
  student_name: 'Demo Student',
  overall_pct: 78,
  total_classes: 120,
  present: 94,
  absent: 20,
  late: 6,
  threshold_pct: 75,
  is_defaulter: false,
  by_subject: [
    { subject:'Physics',  course:'JEE Advanced', total:40, present:32, absent:6, late:2, pct:80, status:'good' },
    { subject:'Maths',    course:'JEE Advanced', total:40, present:35, absent:4, late:1, pct:88, status:'good' },
    { subject:'Chemistry',course:'JEE Advanced', total:40, present:27, absent:10,late:3, pct:68, status:'warning' },
  ],
  calendar: [],
  monthly: [
    { year:2025, month:9, month_name:'September', total:35, present:29, pct:83 },
    { year:2025, month:10,month_name:'October',   total:38, present:30, pct:79 },
    { year:2025, month:11,month_name:'November',  total:30, present:23, pct:77 },
    { year:2025, month:12,month_name:'December',  total:17, present:12, pct:71 },
  ],
}

const DAYS_OF_WEEK = ['S','M','T','W','T','F','S']

function BigPctRing({ pct, threshold }: { pct: number; threshold: number }) {
  const r = 60; const c = 2 * Math.PI * r
  const fill = (pct / 100) * c
  const colour = pct >= threshold ? (pct >= 85 ? '#10b981' : '#3b82f6') : pct >= threshold - 10 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="160" height="160" viewBox="0 0 160 160" className="mx-auto">
      <circle cx="80" cy="80" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" className="dark:stroke-gray-700"/>
      <circle cx="80" cy="80" r={r} fill="none" stroke={colour} strokeWidth="10"
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round" transform="rotate(-90 80 80)"
        style={{ transition: 'stroke-dasharray 1s ease' }}/>
      <text x="80" y="72" textAnchor="middle" fontSize="30" fontWeight="900" fill={colour}>{pct}%</text>
      <text x="80" y="92" textAnchor="middle" fontSize="11" fill="#9ca3af">attendance</text>
      <text x="80" y="108" textAnchor="middle" fontSize="9" fill={colour}>min {threshold}%</text>
    </svg>
  )
}

export default function StudentAttendancePage() {
  const { data, isLoading } = useMyAttendance()
  const d = data ?? (IS_DEMO ? DEMO_MY : null)

  if (isLoading) return <DashboardShell><div className="flex justify-center py-20"><Spinner size="lg"/></div></DashboardShell>
  if (!d) return <DashboardShell><div className="p-6 text-center text-gray-500">Could not load attendance data. Make sure your backend is connected.</div></DashboardShell>

  return (
    <DashboardShell title="My Attendance">
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">📊 My Attendance</h1>
          <p className="text-sm text-gray-500">Your complete attendance record — {d.student_name}</p>
        </div>

        {d.is_defaulter && (
          <Alert variant="danger">
            ⚠️ <strong>Attendance Warning:</strong> Your attendance ({d.overall_pct}%) is below the required threshold ({d.threshold_pct}%).
            Contact your centre manager immediately or submit a leave application for absences.
          </Alert>
        )}

        <div className="grid md:grid-cols-2 gap-5">
          {/* Big ring */}
          <Card>
            <CardBody className="flex flex-col items-center py-6">
              <BigPctRing pct={d.overall_pct} threshold={d.threshold_pct} />
              <div className="grid grid-cols-3 gap-4 text-center mt-4 w-full">
                <div><p className="text-2xl font-black text-emerald-600">{d.present}</p><p className="text-xs text-gray-500">Present</p></div>
                <div><p className="text-2xl font-black text-red-500">{d.absent}</p><p className="text-xs text-gray-500">Absent</p></div>
                <div><p className="text-2xl font-black text-amber-500">{d.late}</p><p className="text-xs text-gray-500">Late</p></div>
              </div>
              <p className="text-xs text-gray-400 mt-3">Total classes: {d.total_classes}</p>
              <Badge variant={d.is_defaulter ? 'danger' : d.overall_pct >= 85 ? 'success' : 'info'} className="mt-2">
                {d.is_defaulter ? '⚠ Below Threshold' : d.overall_pct >= 85 ? '✓ Excellent' : '✓ Above Threshold'}
              </Badge>
            </CardBody>
          </Card>

          {/* Monthly trend */}
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Monthly Trend</h2></CardHeader>
            <CardBody>
              <div className="space-y-3">
                {d.monthly.map(m => {
                  const colour = m.pct >= d.threshold_pct ? 'bg-emerald-500' : m.pct >= d.threshold_pct - 10 ? 'bg-amber-400' : 'bg-red-500'
                  return (
                    <div key={`${m.year}-${m.month}`}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600 dark:text-gray-400 font-medium">{m.month_name} {m.year}</span>
                        <span className={`font-bold ${m.pct>=d.threshold_pct?'text-emerald-600':m.pct>=d.threshold_pct-10?'text-amber-500':'text-red-500'}`}>{m.pct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                        <div className={`h-2 rounded-full transition-all ${colour}`} style={{width:`${m.pct}%`}}/>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-0.5">{m.present}/{m.total} classes</p>
                    </div>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Subject-wise breakdown */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Subject-wise Attendance</h2></CardHeader>
          <CardBody>
            <div className="space-y-4">
              {d.by_subject.map(s => {
                const colour = s.pct >= d.threshold_pct ? 'bg-emerald-500' : s.pct >= d.threshold_pct - 10 ? 'bg-amber-400' : 'bg-red-500'
                const textColour = s.pct >= d.threshold_pct ? 'text-emerald-600' : s.pct >= d.threshold_pct - 10 ? 'text-amber-500' : 'text-red-500'
                return (
                  <div key={s.subject}>
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">{s.subject}</span>
                        <Badge variant={s.status==='good'?'success':s.status==='warning'?'warning':'danger'} className="ml-2 text-[10px]">
                          {s.status}
                        </Badge>
                      </div>
                      <span className={`text-sm font-black ${textColour}`}>{s.pct}%</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                      <div className={`h-2.5 rounded-full transition-all ${colour}`} style={{width:`${s.pct}%`}}/>
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-gray-400">
                      <span>✅ {s.present} present</span>
                      <span>❌ {s.absent} absent</span>
                      <span>⏰ {s.late} late</span>
                      <span>📚 {s.total} total</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardBody>
        </Card>

        {/* Need to attend */}
        {d.overall_pct < d.threshold_pct + 5 && (
          <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
            <p className="text-sm font-bold text-blue-700 dark:text-blue-300 mb-1">📐 Classes needed to reach {d.threshold_pct}%</p>
            {(() => {
              const needed = Math.ceil((d.threshold_pct / 100 * d.total_classes - d.present) / (1 - d.threshold_pct / 100))
              return <p className="text-sm text-blue-600 dark:text-blue-400">You need to attend approximately <strong>{Math.max(0, needed)} more consecutive classes</strong> without any absence to reach the threshold.</p>
            })()}
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
