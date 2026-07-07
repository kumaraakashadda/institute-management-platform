'use client'

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, StatCard, Badge, EmptyState, Spinner } from '@/components/ui'
import { useDefaulters, useSessions } from '@/lib/attendance/useAttendance'
import { IS_DEMO } from '@/lib/gasClient'
import type { DefaulterStudent } from '@/lib/attendance/types'

const DEMO_DEFAULTERS: DefaulterStudent[] = [
  { student_id:'STU000002', student_name:'Priya Sharma',   phone:'9876543211', centre:'Delhi Rohini', batch:'JEE-2026-A', course:'JEE Advanced', overall_pct:58, total_classes:50, present:29, absent:21, days_absent_last_7:4, is_continuous_absentee:false },
  { student_id:'STU000007', student_name:'Arjun Mehta',    phone:'9876543217', centre:'Delhi Rohini', batch:'NEET-2025-B', course:'NEET',        overall_pct:51, total_classes:45, present:23, absent:22, days_absent_last_7:6, is_continuous_absentee:true  },
  { student_id:'STU000012', student_name:'Kavya Reddy',    phone:'9876543222', centre:'Delhi Rohini', batch:'JEE-2026-A', course:'JEE Advanced', overall_pct:63, total_classes:50, present:31, absent:19, days_absent_last_7:3, is_continuous_absentee:false },
  { student_id:'STU000015', student_name:'Rohit Kumar',    phone:'9876543225', centre:'Delhi Rohini', batch:'JEE-2026-B', course:'JEE Advanced', overall_pct:44, total_classes:48, present:21, absent:27, days_absent_last_7:7, is_continuous_absentee:true  },
]

function exportCsv(rows: DefaulterStudent[], filename: string) {
  if (!rows.length) return
  const keys = ['student_id','student_name','phone','centre','batch','course','overall_pct','total_classes','present','absent','days_absent_last_7','is_continuous_absentee']
  const csv = [keys.join(','), ...rows.map(r => keys.map(k => `"${String((r as unknown as Record<string,unknown>)[k]??'').replace(/"/g,'""')}"`).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
  const a = document.createElement('a'); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url)
}

export default function AttendanceReportsPage() {
  const [tab, setTab] = useState<'defaulters'|'sessions'>('defaulters')

  const { data: defaulters, isLoading: loadDef } = useDefaulters()
  const { data: sessions,   isLoading: loadSes } = useSessions()

  const defData = defaulters ?? (IS_DEMO ? DEMO_DEFAULTERS : [])
  const sesList = sessions   ?? []

  const continuous = defData.filter(d => d.is_continuous_absentee)

  return (
    <DashboardShell title="Reports">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📊 Attendance Reports</h1>
            <p className="text-sm text-gray-500">Defaulters, session summaries, and subject-wise breakdown</p>
          </div>
          <button onClick={() => exportCsv(defData, 'defaulters.csv')}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 transition-all">
            ↓ Export CSV
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Defaulters"    value={String(defData.length)}      colour="red"    icon="⚠️" sub="below threshold" />
          <StatCard label="Continuous"    value={String(continuous.length)}   colour="orange" icon="🔴" sub="absent 5+ days" />
          <StatCard label="Total Sessions" value={String(sesList.length)}     colour="blue"   icon="📋" />
          <StatCard label="Avg Attendance" value={defData.length ? `${Math.round(defData.reduce((s,d)=>s+d.overall_pct,0)/defData.length)}%` : '—'} colour="purple" icon="📊" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {(['defaulters','sessions'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab===t?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500'}`}>
              {t==='defaulters'?'⚠️ Defaulters':'📋 Sessions'}
            </button>
          ))}
        </div>

        {/* Defaulters tab */}
        {tab === 'defaulters' && (
          <div className="space-y-3">
            {continuous.length > 0 && (
              <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <p className="text-sm font-bold text-red-700 dark:text-red-300">🔴 {continuous.length} continuous absentees — absent for 5+ consecutive days</p>
              </div>
            )}
            {loadDef ? <div className="flex justify-center py-8"><Spinner size="lg"/></div>
            : defData.length === 0 ? <Card><CardBody><EmptyState icon="✅" title="No defaulters" message="All students are above the attendance threshold."/></CardBody></Card>
            : defData.map(d => (
              <Card key={d.student_id}>
                <CardBody>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-bold text-gray-900 dark:text-white">{d.student_name}</p>
                        {d.is_continuous_absentee && <Badge variant="danger">Continuous Absentee</Badge>}
                      </div>
                      <p className="text-xs text-gray-500">{d.phone} · {d.centre} · {d.batch} · {d.course}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                          <div className={`h-2 rounded-full ${d.overall_pct>=75?'bg-emerald-500':d.overall_pct>=60?'bg-amber-400':'bg-red-500'}`}
                            style={{width:`${d.overall_pct}%`}}/>
                        </div>
                        <span className={`text-xs font-bold shrink-0 ${d.overall_pct>=75?'text-emerald-600':d.overall_pct>=60?'text-amber-500':'text-red-500'}`}>{d.overall_pct}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-center">
                      <div><p className="text-xl font-black text-emerald-600">{d.present}</p><p className="text-[10px] text-gray-500">present</p></div>
                      <div><p className="text-xl font-black text-red-500">{d.absent}</p><p className="text-[10px] text-gray-500">absent</p></div>
                      <div><p className="text-xl font-black text-orange-500">{d.days_absent_last_7}</p><p className="text-[10px] text-gray-500">last 7d</p></div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Sessions tab */}
        {tab === 'sessions' && (
          <div>
            {loadSes ? <div className="flex justify-center py-8"><Spinner size="lg"/></div>
            : sesList.length === 0 ? <Card><CardBody><EmptyState icon="📋" title="No sessions yet"/></CardBody></Card>
            : <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase">
                      <tr>{['Subject','Batch','Course','Date','Duration','Present','Absent','%'].map(h=><th key={h} className="px-4 py-3 text-left font-bold">{h}</th>)}</tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                      {sesList.map(s => {
                        const pct = s.total_students ? Math.round(((s.present_count||0)/s.total_students)*100) : 0
                        return (
                          <tr key={s.Session_ID} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                            <td className="px-4 py-3 font-medium">{s.Subject}</td>
                            <td className="px-4 py-3 text-gray-500">{s.Batch}</td>
                            <td className="px-4 py-3 text-gray-500">{s.Course}</td>
                            <td className="px-4 py-3 text-gray-500">{new Date(s.Start_Time).toLocaleDateString()}</td>
                            <td className="px-4 py-3 text-gray-500">{s.Duration_Minutes}m</td>
                            <td className="px-4 py-3 font-semibold text-emerald-600">{s.present_count||0}</td>
                            <td className="px-4 py-3 font-semibold text-red-500">{s.absent_count||0}</td>
                            <td className="px-4 py-3"><span className={`font-bold ${pct>=75?'text-emerald-600':pct>=60?'text-amber-500':'text-red-500'}`}>{pct}%</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            }
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
