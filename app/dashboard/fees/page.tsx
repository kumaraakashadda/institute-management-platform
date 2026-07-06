'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardBody, Alert, Badge } from '@/components/ui'
import { FeeCollectionChart } from '@/components/charts'
import { gasGet, IS_DEMO, DEMO_FEE_DASHBOARD } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

const FEE_TREND = ['Aug','Sep','Oct','Nov','Dec'].map(m=>({month:m,collected:200000+Math.round(Math.random()*150000),pending:50000+Math.round(Math.random()*80000)}))

export default function FeesPage() {
  const { data, isError } = useQuery({
    queryKey:['feeDashboard'], queryFn:()=>gasGet<typeof DEMO_FEE_DASHBOARD>('getFeeDashboard',{}), retry:false, enabled:!IS_DEMO
  })
  const d = data ?? DEMO_FEE_DASHBOARD
  const c = d.cards

  return (
    <DashboardShell title="Fee Management">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">💰 Fee Management</h1>
            {IS_DEMO&&<p className="text-xs text-yellow-600 mt-0.5">Demo data — add NEXT_PUBLIC_GAS_URL to see live figures</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Link href="/dashboard/fees/calendar" className="px-3 py-1.5 text-sm rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 font-semibold">📅 Calendar</Link>
            <Link href="/dashboard/fees/crm"      className="px-3 py-1.5 text-sm rounded-xl bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-300 font-semibold">🎯 CRM</Link>
            <Link href="/dashboard/fees/plans"    className="px-3 py-1.5 text-sm rounded-xl bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 font-semibold">📋 Plans</Link>
            <Link href="/dashboard/fees/reports"  className="px-3 py-1.5 text-sm rounded-xl bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300 font-semibold">📊 Reports</Link>
          </div>
        </div>

        {isError&&<Alert variant="danger">Backend error — showing demo data.</Alert>}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Fees"       value={fmt(c.total_fees)}       colour="blue"   icon="💼"/>
          <StatCard label="Collected"        value={fmt(c.total_collected)}   colour="green"  icon="✅" sub={`${c.collection_pct}% rate`}/>
          <StatCard label="Pending"          value={fmt(c.total_pending)}     colour="orange" icon="⏳"/>
          <StatCard label="Today Collection" value={fmt(c.today_collection)}  colour="indigo" icon="📅"/>
          <StatCard label="This Month"       value={fmt(c.month_collection)}  colour="teal"   icon="📆"/>
          <StatCard label="Due in 7 Days"    value={String(c.upcoming_dues_count)} colour="yellow" icon="🔔" sub="installments"/>
          <StatCard label="Overdue"          value={String(c.overdue_installments)} colour="red" icon="🔴" sub={fmt(c.overdue_amount)}/>
          <StatCard label="Students Pending" value={String(c.students_with_pending)} colour="pink" icon="👥" sub={`of ${c.total_students}`}/>
        </div>

        <Card>
          <CardBody>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Collection Rate</span>
              <span className="text-sm font-black text-blue-600">{c.collection_pct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{width:`${c.collection_pct}%`}}/>
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Collected: {fmt(c.total_collected)}</span><span>Pending: {fmt(c.total_pending)}</span>
            </div>
          </CardBody>
        </Card>

        <FeeCollectionChart data={FEE_TREND}/>

        <div className="grid grid-cols-3 gap-4">
          {([['Fully Paid','Paid','text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20'],['Partial','Partial','text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'],['Pending','Pending','text-red-600 bg-red-50 dark:bg-red-900/20']] as const).map(([label,key,cls])=>(
            <div key={key} className={`rounded-2xl p-4 text-center ${cls}`}>
              <p className="text-3xl font-black">{d.status_breakdown[key]??0}</p>
              <p className="text-xs font-semibold mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div>
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              {href:'/dashboard/fees/student',label:'Student Lookup',icon:'🔍',c:'text-blue-600 bg-blue-50 dark:bg-blue-900/20'},
              {href:'/dashboard/fees/calendar',label:'Fee Calendar',icon:'📅',c:'text-teal-600 bg-teal-50 dark:bg-teal-900/20'},
              {href:'/dashboard/fees/crm',label:'CRM Pipeline',icon:'🎯',c:'text-purple-600 bg-purple-50 dark:bg-purple-900/20'},
              {href:'/dashboard/fees/reports',label:'Reports',icon:'📊',c:'text-green-600 bg-green-50 dark:bg-green-900/20'},
            ].map(({href,label,icon,c})=>(
              <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center card-hover">
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c}`}>{icon}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
