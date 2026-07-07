'use client'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardHeader, CardBody, Badge, Button, Alert } from '@/components/ui'
import { IS_DEMO } from '@/lib/gasClient'
import { fmt, fmtDate } from '@/lib/utils/helpers'
import { useAuthStore } from '@/store/authStore'

const FOLLOW_UPS = [
  {name:'Arjun Kumar',   phone:'9876543212',course:'JEE Advanced',due:30000, overdue:5,  status:'Contacted',     next:'2025-12-16'},
  {name:'Meera Gupta',   phone:'9876543215',course:'JEE Advanced',due:115000,overdue:30, status:'Not Contacted',  next:'2025-12-15'},
  {name:'Vikram Yadav',  phone:'9876543214',course:'NEET',        due:0,     overdue:0,  status:'Promise to Pay', next:'2025-12-18'},
  {name:'Anjali Sharma', phone:'9876543217',course:'NEET',        due:35000, overdue:12, status:'Contacted',     next:'2025-12-17'},
]
const TODAY_DUES = [
  {name:'Priya Singh',phone:'9876543211',amount:25000,inst:'#3',batch:'NEET-2026-B'},
  {name:'Rohan Verma',phone:'9876543216',amount:30000,inst:'#2',batch:'JEE-2026-A'},
]
const STATUS_V:{[k:string]:'success'|'warning'|'danger'|'info'} = {'Contacted':'info','Not Contacted':'danger','Promise to Pay':'warning','Paid':'success'}

export default function CounsellorDashboardPage() {
  const { name } = useAuthStore()
  return (
    <DashboardShell title="Counsellor Dashboard">
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">🤝 {name ? `Welcome, ${name.split(' ')[0]}` : 'Counsellor Dashboard'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your collection & follow-up workspace</p>
          </div>
          <Link href="/dashboard/admissions/new"><Button>+ New Admission</Button></Link>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — showing sample counsellor data.</Alert>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="My Students"     value="45"          colour="blue"   icon="🎓" />
          <StatCard label="Follow-ups Today" value="8"          colour="orange" icon="📞" sub="4 overdue" />
          <StatCard label="Pending Fees"    value={fmt(185000)} colour="red"    icon="💰" />
          <StatCard label="This Month"      value="5"           colour="green"  icon="🎉" sub="admissions" />
        </div>

        {/* Today's dues */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">💰 Due Today ({TODAY_DUES.length})</h2>
              <Link href="/dashboard/fees/calendar"><span className="text-xs text-blue-600 font-medium hover:underline">Fee Calendar →</span></Link>
            </div>
          </CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {TODAY_DUES.map((d,i) => (
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.phone} · {d.batch} · Installment {d.inst}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-sm font-black text-orange-600">{fmt(d.amount)}</p>
                  <Button size="sm" variant="secondary">Record</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Follow-up list */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">📞 My Follow-up List</h2>
              <Link href="/dashboard/fees/crm"><span className="text-xs text-blue-600 font-medium hover:underline">CRM Pipeline →</span></Link>
            </div>
          </CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {FOLLOW_UPS.map((f,i) => (
              <div key={i} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.name}</p>
                    <Badge variant={STATUS_V[f.status]}>{f.status}</Badge>
                    {f.overdue > 0 && <Badge variant="danger">{f.overdue}d overdue</Badge>}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{f.phone} · {f.course} · Next follow-up: {fmtDate(f.next)}</p>
                </div>
                {f.due > 0 && <p className="text-sm font-black text-red-600 shrink-0">{fmt(f.due)} due</p>}
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="secondary">Log Call</Button>
                  <Link href="/dashboard/fees/student"><Button size="sm" variant="ghost">Fee →</Button></Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick access */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            {href:'/dashboard/fees/crm',      label:'CRM Pipeline',   icon:'🎯'},
            {href:'/dashboard/fees',           label:'Fee Dashboard',  icon:'💰'},
            {href:'/dashboard/fees/student',   label:'Student Lookup', icon:'🔍'},
            {href:'/dashboard/fees/reports',   label:'Reports',        icon:'📊'},
            {href:'/dashboard/admissions/new', label:'New Admission',  icon:'📋'},
            {href:'/dashboard/fees/calendar',  label:'Fee Calendar',   icon:'📅'},
          ].map(({href,label,icon})=>(
            <Link key={href} href={href} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center">
              <span className="text-xl">{icon}</span>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
