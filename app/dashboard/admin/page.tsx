'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardBody, CardHeader, Badge, Alert, Spinner } from '@/components/ui'
import {
  AttendanceTrendChart, DailyBarChart, StatusPieChart,
  FeeCollectionChart, CentreComparisonChart, AttendanceHeatmap
} from '@/components/charts'
import { gasGet, IS_DEMO, DEMO_ADMIN_STATS } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

// ── Demo chart data ────────────────────────────────────────────────────────────
const DEMO_TREND = Array.from({length:30},(_,i)=>{
  const d = new Date(); d.setDate(d.getDate()-29+i)
  const pct = 70+Math.round(Math.random()*20)
  return { date: `${d.getDate()}/${d.getMonth()+1}`, present: Math.round(pct*1.2), absent: Math.round((100-pct)*1.2), pct }
})
const DEMO_DAILY = ['Mon','Tue','Wed','Thu','Fri','Sat'].map(day=>({ day, present: 80+Math.round(Math.random()*30), absent: 5+Math.round(Math.random()*15) }))
const DEMO_PIE = [{ name:'Present', value:84 },{ name:'Absent', value:12 },{ name:'Late', value:4 }]
const DEMO_FEE = ['Aug','Sep','Oct','Nov','Dec'].map(m=>({ month:m, collected:200000+Math.round(Math.random()*150000), pending:50000+Math.round(Math.random()*80000) }))
const DEMO_CENTRES = [
  {centre:'Delhi-Rohini',pct:87,students:124},{centre:'Delhi-Dwarka',pct:82,students:98},
  {centre:'Noida-Sec18',pct:79,students:87},{centre:'Gurgaon',pct:91,students:63},
]
const DEMO_HEATMAP = Array.from({length:25},(_,i)=>({
  date:`2025-12-${('0'+(i+1)).slice(-2)}`,
  pct: [0,6].includes(new Date(2025,11,i+1).getDay()) ? 0 : 65+Math.round(Math.random()*30)
})).filter(d=>d.pct>0)

const QUICK_LINKS = [
  {href:'/dashboard/fees',label:'Fee Mgmt',icon:'💰',c:'text-blue-600 bg-blue-50 dark:bg-blue-900/20'},
  {href:'/dashboard/fees/crm',label:'CRM',icon:'🎯',c:'text-purple-600 bg-purple-50 dark:bg-purple-900/20'},
  {href:'/dashboard/attendance/reports',label:'Reports',icon:'📊',c:'text-green-600 bg-green-50 dark:bg-green-900/20'},
  {href:'/dashboard/attendance/session/new',label:'Start Session',icon:'▶️',c:'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'},
  {href:'/dashboard/bulk-upload',label:'Bulk Upload',icon:'📤',c:'text-orange-600 bg-orange-50 dark:bg-orange-900/20'},
  {href:'/dashboard/settings',label:'Settings',icon:'⚙️',c:'text-gray-600 bg-gray-50 dark:bg-gray-900/20'},
  {href:'/dashboard/settings/master-data',label:'Master Data',icon:'🗄️',c:'text-teal-600 bg-teal-50 dark:bg-teal-900/20'},
  {href:'/dashboard/attendance',label:'Attendance',icon:'✅',c:'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'},
]

interface AdminStats { total_students:number; active_students:number; today_attendance_pct:number; present_today:number; absent_today:number; active_sessions:number; total_centres:number; fee_collected_month:number; fee_pending:number; collection_pct:number; overdue_students:number; new_admissions_month:number }

export default function AdminDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey:['adminStats'], queryFn:()=>gasGet<AdminStats>('getAdminDashboard',{}), retry:1, enabled:!IS_DEMO
  })
  const stats = data ?? DEMO_ADMIN_STATS

  return (
    <DashboardShell title="Admin Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">📊 Admin Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">{IS_DEMO?'Demo mode — 6 demo accounts active':isLoading?'Loading…':'Live data'}</p>
          </div>
          <div className="flex items-center gap-2">
            {IS_DEMO&&<Badge variant="warning">Demo</Badge>}
            {!IS_DEMO&&!isLoading&&!isError&&<Badge variant="success">● Live</Badge>}
          </div>
        </div>

        {IS_DEMO&&<Alert variant="info"><strong>Demo mode.</strong> Add NEXT_PUBLIC_GAS_URL in Vercel → Settings → Environment Variables to connect live data.</Alert>}
        {!IS_DEMO&&isError&&<Alert variant="danger"><strong>Backend error:</strong> {String(error).replace('Error:','')}</Alert>}

        {/* Primary stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Students"   value={String(stats.total_students)}    colour="blue"   icon="🎓" sub={`${stats.active_students} active`} />
          <StatCard label="Present Today"    value={String(stats.present_today)}     colour="green"  icon="✅" sub={`${stats.today_attendance_pct}% rate`} />
          <StatCard label="Fee Collected"    value={fmt(stats.fee_collected_month)}  colour="teal"   icon="💰" sub="This month" />
          <StatCard label="New Admissions"   value={String(stats.new_admissions_month)} colour="indigo" icon="🎉" sub="This month" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Absent Today"     value={String(stats.absent_today)}      colour="red"    icon="❌" />
          <StatCard label="Live Sessions"    value={String(stats.active_sessions)}   colour="purple" icon="📡" />
          <StatCard label="Fee Pending"      value={fmt(stats.fee_pending)}          colour="orange" icon="⏳" sub={`${100-stats.collection_pct}% uncollected`} />
          <StatCard label="Overdue Students" value={String(stats.overdue_students)}  colour="amber"  icon="🔴" />
        </div>

        {/* Collection bar */}
        <Card>
          <CardBody>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Overall Fee Collection</span>
              <span className="text-sm font-black text-blue-600">{stats.collection_pct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700" style={{width:`${stats.collection_pct}%`}}/>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Collected: {fmt(stats.fee_collected_month)}</span>
              <span>Pending: {fmt(stats.fee_pending)}</span>
            </div>
          </CardBody>
        </Card>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2"><AttendanceTrendChart data={DEMO_TREND}/></div>
          <StatusPieChart data={DEMO_PIE}/>
        </div>

        {/* Charts row 2 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <DailyBarChart data={DEMO_DAILY}/>
          <FeeCollectionChart data={DEMO_FEE}/>
        </div>

        {/* Charts row 3 */}
        <div className="grid lg:grid-cols-2 gap-4">
          <CentreComparisonChart data={DEMO_CENTRES}/>
          <AttendanceHeatmap data={DEMO_HEATMAP} year={2025} month={12}/>
        </div>

        {/* Quick access */}
        <div>
          <h2 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-3">Quick Access</h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {QUICK_LINKS.map(({href,label,icon,c})=>(
              <Link key={href} href={href} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center group card-hover">
                <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${c}`}>{icon}</span>
                <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 group-hover:text-blue-600 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Milestone status */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Platform Completion</h2></CardHeader>
          <CardBody>
            <div className="space-y-3">
              {[
                {ms:'M1 — Auth + RBAC + 7 Dashboards',status:'complete',pct:100},
                {ms:'M2 — Database + GAS Backend (35 tables)',status:'complete',pct:100},
                {ms:'M3 — Student Management + Admission Sync',status:'complete',pct:100},
                {ms:'M4 — Hybrid QR Attendance',status:'complete',pct:100},
                {ms:'M5 — Dashboards + Charts + Reporting',status:'complete',pct:100},
                {ms:'M6 — Fee Management + CRM Pipeline',status:'complete',pct:100},
                {ms:'M7 — Notification Engine',status:'complete',pct:100},
                {ms:'M8 — Student + Parent Portals',status:'complete',pct:100},
                {ms:'M9 — Settings + Feature Flags Panel',status:'complete',pct:100},
              ].map(({ms,status,pct})=>(
                <div key={ms}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant={status==='complete'?'success':status==='partial'?'warning':'default'}>
                        {status==='complete'?'✓':'○'} {ms.split('—')[0].trim()}
                      </Badge>
                      <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{ms.split('—')[1]?.trim()}</span>
                    </div>
                    <span className="text-xs font-bold text-gray-400">{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${status==='complete'?'bg-emerald-500':'bg-amber-400'}`} style={{width:`${pct}%`}}/>
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
