'use client'

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge } from '@/components/ui'
import { useAttendanceCalendar } from '@/lib/attendance/useAttendance'
import { IS_DEMO } from '@/lib/gasClient'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

function pctColour(pct: number) {
  if (pct >= 90) return { dot: 'bg-emerald-500', badge: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-300', cell: 'hover:bg-emerald-50 dark:hover:bg-emerald-900/10' }
  if (pct >= 75) return { dot: 'bg-blue-400',    badge: 'text-blue-700 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300',    cell: 'hover:bg-blue-50 dark:hover:bg-blue-900/10' }
  if (pct >= 60) return { dot: 'bg-amber-400',   badge: 'text-amber-700 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-300',   cell: 'hover:bg-amber-50 dark:hover:bg-amber-900/10' }
  return { dot: 'bg-red-500', badge: 'text-red-700 bg-red-50 dark:bg-red-900/20 dark:text-red-300', cell: 'hover:bg-red-50 dark:hover:bg-red-900/10' }
}

// Generate demo calendar data
function demoCalendar(year: number, month: number) {
  const dim = new Date(year, month, 0).getDate()
  const data: Record<string, { present: number; absent: number; late: number; pct: number; sessions: number }> = {}
  for (let d = 1; d <= dim; d++) {
    const day = new Date(year, month - 1, d).getDay()
    if (day === 0 || day === 6) continue // skip weekends
    const present = Math.floor(30 + Math.random() * 15)
    const total = 45
    const pct = Math.round((present / total) * 100)
    const key = `${year}-${('0'+month).slice(-2)}-${('0'+d).slice(-2)}`
    data[key] = { present, absent: total - present, late: Math.floor(Math.random() * 3), pct, sessions: Math.ceil(Math.random() * 3) }
  }
  return data
}

export default function AttendanceCalendarPage() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [sel, setSel]     = useState<string | null>(null)

  const { data: calData } = useAttendanceCalendar(year, month)
  const calendar = calData ?? (IS_DEMO ? demoCalendar(year, month) : {})

  const firstDay = new Date(year, month - 1, 1).getDay()
  const dim      = new Date(year, month, 0).getDate()
  const cells    = Array.from({ length: firstDay + dim }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  function nav(d: 1 | -1) {
    setSel(null)
    if (d === 1) { if (month === 12) { setMonth(1); setYear(y => y+1) } else setMonth(m => m+1) }
    else         { if (month === 1)  { setMonth(12); setYear(y => y-1) } else setMonth(m => m-1) }
  }

  const selKey  = sel ?? ''
  const selData = calendar[selKey]

  // Monthly aggregate
  const allVals = Object.values(calendar)
  const avgPct  = allVals.length ? Math.round(allVals.reduce((s, v) => s + v.pct, 0) / allVals.length) : 0

  return (
    <DashboardShell title="Attendance Calendar">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📅 Attendance Calendar</h1>
            <p className="text-sm text-gray-500">Monthly average: <span className={`font-bold ${avgPct>=75?'text-emerald-600':avgPct>=60?'text-amber-500':'text-red-500'}`}>{avgPct}%</span></p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => nav(-1)} className="p-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">◀</button>
            <span className="font-bold min-w-[140px] text-center text-gray-800 dark:text-gray-200">{MONTHS[month-1]} {year}</span>
            <button onClick={() => nav(1)}  className="p-2 rounded-xl border hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">▶</button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4 text-xs">
          {[['bg-emerald-500','≥90% — Excellent'],['bg-blue-400','75–89% — Good'],['bg-amber-400','60–74% — Warning'],['bg-red-500','<60% — Critical'],['bg-gray-200 dark:bg-gray-700','No classes']].map(([cls,label])=>(
            <span key={label} className="flex items-center gap-1.5">
              <span className={`w-3 h-3 rounded-full ${cls}`}/>
              <span className="text-gray-600 dark:text-gray-400">{label}</span>
            </span>
          ))}
        </div>

        <Card>
          <CardBody>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={`e${i}`}/>
                const ds   = `${year}-${('0'+month).slice(-2)}-${('0'+day).slice(-2)}`
                const data = calendar[ds]
                const isToday = today.getDate()===day && today.getMonth()+1===month && today.getFullYear()===year
                const colours = data ? pctColour(data.pct) : null

                return (
                  <button key={day} onClick={() => data ? setSel(sel===ds?null:ds) : undefined}
                    className={`min-h-[68px] w-full p-1.5 rounded-xl text-left border transition-all
                      ${isToday ? 'ring-2 ring-blue-400' : ''}
                      ${sel===ds ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : data ? `border-gray-100 dark:border-gray-800 cursor-pointer ${colours?.cell}` : 'border-transparent cursor-default'}
                    `}>
                    <span className={`text-xs font-semibold block ${data ? 'text-gray-800 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>{day}</span>
                    {data && (
                      <div className="mt-1 space-y-0.5">
                        <div className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md inline-block ${colours?.badge}`}>{data.pct}%</div>
                        <div className="text-[9px] text-gray-400">{data.sessions} session{data.sessions>1?'s':''}</div>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </CardBody>
        </Card>

        {/* Selected date detail */}
        {sel && selData && (
          <Card>
            <CardBody>
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-gray-800 dark:text-gray-200">📅 {sel}</h2>
                <button onClick={() => setSel(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                {[['Present',selData.present,'text-emerald-600'],['Absent',selData.absent,'text-red-500'],['Late',selData.late,'text-amber-500'],['Attendance',`${selData.pct}%`,selData.pct>=75?'text-emerald-600':selData.pct>=60?'text-amber-500':'text-red-500']].map(([l,v,cls])=>(
                  <div key={l as string} className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3">
                    <p className={`text-2xl font-black ${cls}`}>{v}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{l}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
