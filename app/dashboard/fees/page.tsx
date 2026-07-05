'use client'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardBody, Alert } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { gasGet } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

interface Dashboard { cards: { total_fees:number; total_collected:number; total_pending:number; today_collection:number; month_collection:number; upcoming_dues_count:number; overdue_installments:number; overdue_amount:number; students_with_pending:number; collection_pct:number; total_students:number }; status_breakdown: Record<string,number> }

const DEMO: Dashboard = { cards: { total_fees:4250000,total_collected:2975000,total_pending:1275000,today_collection:45000,month_collection:385000,upcoming_dues_count:23,overdue_installments:8,overdue_amount:156000,students_with_pending:47,collection_pct:70,total_students:120 }, status_breakdown: { Paid:73,Partial:32,Pending:15 } }

export default function FeesPage() {
  const { data, isError } = useQuery({ queryKey:['feeDashboard'], queryFn:()=>gasGet<Dashboard>('getFeeDashboard',{}), retry:false })
  const d = data ?? DEMO; const c = d.cards; const isDemo = !data

  return (
    <DashboardShell title="Fee Management">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">💰 Fee Management</h1>
            {isDemo && <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">⚠ Demo data — add NEXT_PUBLIC_GAS_URL to Vercel to see live figures</p>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {[['📅 Calendar','/dashboard/fees/calendar','blue'],['📋 Plans','/dashboard/fees/plans','purple'],['📊 Reports','/dashboard/fees/reports','green'],['🎯 CRM','/dashboard/fees/crm','orange']].map(([l,h,c])=>(
              <Link key={h as string} href={h as string} className={`px-3 py-1.5 text-sm rounded-lg font-medium bg-${c}-50 text-${c}-700 hover:bg-${c}-100 dark:bg-${c}-900/30 dark:text-${c}-300`}>{l}</Link>
            ))}
          </div>
        </div>
        {isError && <Alert variant="warning">Backend not connected — showing demo data. Set NEXT_PUBLIC_GAS_URL in Vercel environment variables.</Alert>}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Fees"      value={fmt(c.total_fees)}       colour="blue"   icon="💼" />
          <StatCard label="Collected"        value={fmt(c.total_collected)}   colour="green"  icon="✅" sub={`${c.collection_pct}% rate`} />
          <StatCard label="Pending"          value={fmt(c.total_pending)}     colour="orange" icon="⏳" />
          <StatCard label="Today"            value={fmt(c.today_collection)}  colour="indigo" icon="📅" />
          <StatCard label="This Month"       value={fmt(c.month_collection)}  colour="teal"   icon="📆" />
          <StatCard label="Due in 7 Days"    value={String(c.upcoming_dues_count)} colour="yellow" icon="🔔" sub="installments" />
          <StatCard label="Overdue"          value={String(c.overdue_installments)} colour="red" icon="🔴" sub={fmt(c.overdue_amount)} />
          <StatCard label="Pending Students" value={String(c.students_with_pending)} colour="pink" icon="👥" sub={`of ${c.total_students}`} />
        </div>
        <Card>
          <CardBody>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Collection Rate</span>
              <span className="text-sm font-bold">{c.collection_pct}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
              <div className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all" style={{width:`${c.collection_pct}%`}} />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-400">
              <span>Collected: {fmt(c.total_collected)}</span><span>Pending: {fmt(c.total_pending)}</span>
            </div>
          </CardBody>
        </Card>
        <div className="grid grid-cols-3 gap-4">
          {([['Fully Paid','Paid','text-green-600 bg-green-50 dark:bg-green-900/20'],['Partial','Partial','text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20'],['Pending','Pending','text-red-600 bg-red-50 dark:bg-red-900/20']] as const).map(([label,key,cls])=>(
            <div key={key} className={`rounded-xl p-4 text-center ${cls}`}><p className="text-3xl font-bold">{d.status_breakdown[key]??0}</p><p className="text-xs font-medium mt-1">{label}</p></div>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
