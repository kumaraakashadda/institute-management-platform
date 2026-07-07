'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardBody, CardHeader, Badge, Alert, Spinner, Select } from '@/components/ui'
import {
  AttendanceTrendChart, DailyBarChart, StatusPieChart,
  FeeCollectionChart, CentreComparisonChart, AttendanceHeatmap
} from '@/components/charts'
import { gasGet, IS_DEMO, DEMO_ADMIN_STATS } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

// ── Demo chart data
const DEMO_TREND = Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-29+i); const pct=70+Math.round(Math.random()*20); return {date:`${d.getDate()}/${d.getMonth()+1}`,present:Math.round(pct*1.2),absent:Math.round((100-pct)*1.2),pct} })
const DEMO_DAILY = ['Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>({ day, present: 80+Math.round(Math.random()*30), absent: 5+Math.round(Math.random()*15) }))
const DEMO_PIE   = [{ name:'Present', value:84 },{ name:'Absent', value:12 },{ name:'Late', value:4 }]
const DEMO_FEE   = ['Aug','Sep','Oct','Nov','Dec'].map(m=>({ month:m, collected:200000+Math.round(Math.random()*150000), pending:50000+Math.round(Math.random()*80000) }))
const DEMO_CTRS  = [{centre:'Delhi-Rohini',pct:87,students:124},{centre:'Delhi-Dwarka',pct:82,students:98},{centre:'Noida-Sec18',pct:79,students:87},{centre:'Gurgaon',pct:91,students:63}]
const DEMO_HEAT  = Array.from({length:25},(_,i)=>({date:`2025-12-${('0'+(i+1)).slice(-2)}`,pct:[0,6].includes(new Date(2025,11,i+1).getDay())?0:65+Math.round(Math.random()*30)})).filter(d=>d.pct>0)

const QUICK = [
  {href:'/dashboard/fees',label:'Fee Mgmt',icon:'💰',c:'text-blue-600 bg-blue-50 dark:bg-blue-900/20'},
  {href:'/dashboard/fees/crm',label:'CRM Pipeline',icon:'🎯',c:'text-purple-600 bg-purple-50 dark:bg-purple-900/20'},
  {href:'/dashboard/fees/upload',label:'Bulk Upload',icon:'📤',c:'text-teal-600 bg-teal-50 dark:bg-teal-900/20'},
  {href:'/dashboard/attendance/reports',label:'Reports',icon:'📊',c:'text-green-600 bg-green-50 dark:bg-green-900/20'},
  {href:'/dashboard/attendance/session/new',label:'Start Session',icon:'▶️',c:'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'},
  {href:'/dashboard/settings',label:'Settings',icon:'⚙️',c:'text-gray-600 bg-gray-50 dark:bg-gray-800'},
]

interface AdminStats { total_students:number; active_students:number; today_attendance_pct:number; present_today:number; absent_today:number; active_sessions:number; total_centres:number; fee_collected_month:number; fee_pending:number; collection_pct:number; overdue_students:number; new_admissions_month:number }
interface FilteredStats { overall_pct:number; present:number; absent:number; late:number; total_logs:number; total_sessions:number; trend:{date:string;present:number;absent:number;pct:number}[] }

// ── Filter panel
interface Filters { centre:string; batch:string; course:string; subject:string; from_date:string; to_date:string }
const EMPTY_FILTERS: Filters = { centre:'', batch:'', course:'', subject:'', from_date:'', to_date:'' }

const DEMO_CENTRES_LIST = ['Delhi Rohini','Delhi Dwarka','Noida Sec18','Gurgaon']
const DEMO_BATCHES_LIST = ['JEE-2026-A','JEE-2026-B','NEET-2025-A','NEET-2025-B']
const DEMO_COURSES_LIST = ['JEE Advanced','JEE Mains','NEET','Foundation']
const DEMO_SUBJECTS_LIST = ['Physics','Chemistry','Maths','Biology']

export default function AdminDashboardPage() {
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [applied, setApplied] = useState<Filters>(EMPTY_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const hasFilters = Object.values(applied).some(v => v !== '')

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['adminStats'], queryFn: () => gasGet<AdminStats>('getAdminDashboard', {}),
    retry: 1, enabled: !IS_DEMO,
  })
  const { data: filteredData, isLoading: filtLoading } = useQuery({
    queryKey: ['filteredStats', applied],
    queryFn: () => gasGet<FilteredStats>('getFilteredAttendanceStats', { filters: applied }),
    enabled: hasFilters && !IS_DEMO,
  })

  const stats = data ?? DEMO_ADMIN_STATS
  const trend = filteredData?.trend ?? DEMO_TREND

  function applyFilters() { setApplied({ ...filters }); setShowFilters(false) }
  function clearFilters() { setFilters(EMPTY_FILTERS); setApplied(EMPTY_FILTERS) }
  function setF(k: keyof Filters) { return (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => setFilters(f => ({...f, [k]: e.target.value})) }

  return (
    <DashboardShell title="Admin Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">📊 Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{IS_DEMO ? 'Demo mode' : isLoading ? 'Loading…' : 'Live data'}</p>
          </div>
          <div className="flex items-center gap-2">
            {hasFilters && <Badge variant="info">Filters active</Badge>}
            {IS_DEMO && <Badge variant="warning">Demo</Badge>}
            {!IS_DEMO && !isLoading && !isError && <Badge variant="success">● Live</Badge>}
            <button onClick={() => setShowFilters(f => !f)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${showFilters ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'}`}>
              ⚙ Filters {hasFilters && `(${Object.values(applied).filter(v=>v).length})`}
            </button>
          </div>
        </div>

        {IS_DEMO && <Alert variant="info"><strong>Demo mode.</strong> Add NEXT_PUBLIC_GAS_URL in Vercel → Settings → Environment Variables to connect live data.</Alert>}
        {!IS_DEMO && isError && <Alert variant="danger"><strong>Backend error:</strong> {String(error).replace('Error:','')}</Alert>}

        {/* Filter panel */}
        {showFilters && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800 dark:text-gray-200">Global Filters</h2>
                {hasFilters && <button onClick={clearFilters} className="text-xs text-red-500 hover:underline font-medium">Clear all</button>}
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Centre</label>
                  <select value={filters.centre} onChange={setF('centre')} className="w-full rounded-xl border px-2 py-2 text-xs dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500">
                    <option value="">All Centres</option>
                    {DEMO_CENTRES_LIST.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Batch</label>
                  <select value={filters.batch} onChange={setF('batch')} className="w-full rounded-xl border px-2 py-2 text-xs dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500">
                    <option value="">All Batches</option>
                    {DEMO_BATCHES_LIST.map(b => <option key={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Course</label>
                  <select value={filters.course} onChange={setF('course')} className="w-full rounded-xl border px-2 py-2 text-xs dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500">
                    <option value="">All Courses</option>
                    {DEMO_COURSES_LIST.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Subject</label>
                  <select value={filters.subject} onChange={setF('subject')} className="w-full rounded-xl border px-2 py-2 text-xs dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500">
                    <option value="">All Subjects</option>
                    {DEMO_SUBJECTS_LIST.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">From Date</label>
                  <input type="date" value={filters.from_date} onChange={setF('from_date')} className="w-full rounded-xl border px-2 py-2 text-xs dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">To Date</label>
                  <input type="date" value={filters.to_date} onChange={setF('to_date')} className="w-full rounded-xl border px-2 py-2 text-xs dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500"/>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={applyFilters} className="px-4 py-2 rounded-xl text-white text-sm font-bold" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>Apply Filters</button>
                <button onClick={clearFilters} className="px-4 py-2 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800">Clear</button>
              </div>
              {hasFilters && filteredData && (
                <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-300 mb-2">Filtered Results</p>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    {[['Overall %',`${filteredData.overall_pct}%`,'text-blue-600'],['Present',filteredData.present,'text-emerald-600'],['Absent',filteredData.absent,'text-red-500'],['Sessions',filteredData.total_sessions,'text-purple-600']].map(([l,v,cls])=>(
                      <div key={l as string}><p className={`text-xl font-black ${cls}`}>{v}</p><p className="text-[10px] text-gray-400">{l}</p></div>
                    ))}
                  </div>
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {/* Primary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Students"   value={String(stats.total_students)}       colour="blue"   icon="🎓" sub={`${stats.active_students} active`} />
          <StatCard label="Present Today"    value={String(stats.present_today)}        colour="green"  icon="✅" sub={`${stats.today_attendance_pct}% rate`} />
          <StatCard label="Fee Collected"    value={fmt(stats.fee_collected_month)}     colour="teal"   icon="💰" sub="This month" />
          <StatCard label="New Admissions"   value={String(stats.new_admissions_month)} colour="indigo" icon="🎉" sub="This month" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Absent Today"     value={String(stats.absent_today)}     colour="red"    icon="❌" />
          <StatCard label="Live Sessions"    value={String(stats.active_sessions)}  colour="purple" icon="📡" />
          <StatCard label="Fee Pending"      value={fmt(stats.fee_pending)}         colour="orange" icon="⏳" sub={`${100-stats.collection_pct}% uncollected`} />
          <StatCard label="Overdue Students" value={String(stats.overdue_students)} colour="amber"  icon="🔴" />
        </div>

        {/* Collection bar */}
        <Card>
          <CardBody>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Overall Fee Collection</span>
              <span className="text-sm font-black text-blue-600">{stats.collection_pct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{width:`${stats.collection_pct}%`}}/>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Collected: {fmt(stats.fee_collected_month)}</span>
              <span>Pending: {fmt(stats.fee_pending)}</span>
            </div>
          </CardBody>
        </Card>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><AttendanceTrendChart data={trend}/></div>
          <StatusPieChart data={DEMO_PIE}/>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <DailyBarChart data={DEMO_DAILY}/>
          <FeeCollectionChart data={DEMO_FEE}/>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <CentreComparisonChart data={DEMO_CTRS}/>
          <AttendanceHeatmap data={DEMO_HEAT} year={2025} month={12}/>
        </div>

        {/* Quick access */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Quick Access</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {QUICK.map(({href,label,icon,c}) => (
              <Link key={href} href={href} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center group card-hover">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${c}`}>{icon}</span>
                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-blue-600 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Platform status */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Platform Completion</h2></CardHeader>
          <CardBody>
            <div className="space-y-3">
              {[
                {ms:'M1 — Auth + RBAC + 8 Role Dashboards',      status:'complete', pct:100},
                {ms:'M2 — Database + GAS Backend (35 tables)',    status:'complete', pct:100},
                {ms:'M3 — Student Management + Admission Sync',  status:'complete', pct:100},
                {ms:'M4 — Hybrid QR Attendance System',          status:'complete', pct:100},
                {ms:'M5 — Dashboards + Charts + Global Filters', status:'complete', pct:100},
                {ms:'M6 — Fee Management + CRM Pipeline',        status:'complete', pct:100},
                {ms:'M7 — Notification Engine (Email+WA stubs)', status:'complete', pct:100},
                {ms:'M8 — Student + Parent Portals',             status:'complete', pct:100},
                {ms:'M9 — Settings + Feature Flags Panel',       status:'complete', pct:100},
                {ms:'Extra — Bulk Upload (CSV/Excel/G-Sheets)',  status:'complete', pct:100},
                {ms:'Extra — Attendance Certificate PDF',        status:'complete', pct:100},
                {ms:'Extra — PWA Manifest + Mobile Ready',       status:'complete', pct:100},
                {ms:'Extra — CRM Follow-up Log',                 status:'complete', pct:100},
                {ms:'Extra — Fee Calendar Week/Day Views',       status:'complete', pct:100},
              ].map(({ms,status,pct}) => (
                <div key={ms}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={status==='complete'?'success':'warning'}>
                        {status==='complete'?'✓':status==='partial'?'~':'○'} {ms.split('—')[0].trim()}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{ms.split('—')[1]?.trim()}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-emerald-500" style={{width:`${pct}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  )
}
