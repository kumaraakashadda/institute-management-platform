'use client'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui'
import { DailyBarChart, SubjectBarChart, AttendanceTrendChart } from '@/components/charts'
import { fmt } from '@/lib/utils/helpers'

const DAILY = ['Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>({day:d,present:80+Math.round(Math.random()*30),absent:5+Math.round(Math.random()*15)}))
const SUBJ = [{subject:'Physics',pct:87},{subject:'Maths',pct:91},{subject:'Chemistry',pct:72},{subject:'Biology',pct:68}]
const TREND = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-13+i); const pct=70+Math.round(Math.random()*20); return {date:`${d.getDate()}/${d.getMonth()+1}`,present:Math.round(pct*1.2),absent:Math.round((100-pct)*1.2),pct} })

export default function CentreDashboardPage() {
  return (
    <DashboardShell title="Centre Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">🏫 Centre Dashboard</h1>
          <Link href="/dashboard/attendance/session/new"><button className="px-4 py-2 rounded-xl text-white text-sm font-bold" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>+ Start Session</button></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Students"        value="124"        colour="blue"   icon="🎓"/>
          <StatCard label="Present Today"   value="99"         colour="green"  icon="✅" sub="80% attendance"/>
          <StatCard label="Fee Pending"     value={fmt(275000)} colour="orange" icon="💰"/>
          <StatCard label="Active Teachers" value="12"         colour="purple" icon="👨‍🏫"/>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <DailyBarChart data={DAILY}/>
          <AttendanceTrendChart data={TREND}/>
        </div>
        <SubjectBarChart data={SUBJ}/>
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Quick Actions</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                {href:'/dashboard/attendance/reports',label:'Defaulters Report',icon:'⚠️'},
                {href:'/dashboard/fees',label:'Fee Dashboard',icon:'💰'},
                {href:'/dashboard/attendance/corrections',label:'Corrections',icon:'✏️'},
                {href:'/dashboard/attendance/leave',label:'Leave Requests',icon:'🏖️'},
              ].map(({href,label,icon})=>(
                <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:shadow-md transition-all text-center">
                  <span className="text-2xl">{icon}</span>
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  )
}
