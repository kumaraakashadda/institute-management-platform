'use client'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardHeader, CardBody, Badge, Button, Alert } from '@/components/ui'
import { DailyBarChart, SubjectBarChart, AttendanceTrendChart } from '@/components/charts'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

const DAILY   = ['Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>({day:d,present:80+Math.round(Math.random()*30),absent:5+Math.round(Math.random()*15)}))
const SUBJ    = [{subject:'Physics',pct:87},{subject:'Maths',pct:91},{subject:'Chemistry',pct:72},{subject:'Biology',pct:68}]
const TREND   = Array.from({length:14},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-13+i); const pct=70+Math.round(Math.random()*20); return {date:`${d.getDate()}/${d.getMonth()+1}`,present:Math.round(pct*1.2),absent:Math.round((100-pct)*1.2),pct} })
const BATCHES = [{name:'JEE-2026-A',students:45,present:38,pct:84},{name:'JEE-2026-B',students:42,present:35,pct:83},{name:'NEET-2026-A',students:38,present:29,pct:76},{name:'FND-2025-A',students:28,present:20,pct:71}]
const DEFAULTERS = [{name:'Arjun Kumar',id:'STU000003',phone:'9876543212',batch:'JEE-2026-A',att:62},{name:'Vikram Yadav',id:'STU000005',phone:'9876543214',batch:'NEET-2026-A',att:55},{name:'Meera Gupta',id:'STU000006',phone:'9876543215',batch:'JEE-2027-A',att:0}]
const LIVE_SESSIONS = [{id:'SES000001',teacher:'Dr. Meera Sharma',subject:'Physics',batch:'JEE-2026-A',room:'201',present:32,total:45},{id:'SES000002',teacher:'Prof. Rakesh Singh',subject:'Maths',batch:'JEE-2026-B',room:'202',present:28,total:42}]

export default function CentreDashboardPage() {
  const { data } = useQuery({ queryKey:['centreStats'], queryFn:()=>gasGet<Record<string,number>>('getCentreStats',{}), enabled:!IS_DEMO, retry:false })
  return (
    <DashboardShell title="Centre Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">🏫 Centre Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">Delhi Rohini · Today {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/attendance/session/new"><Button>▶ Start Session</Button></Link>
            <Link href="/dashboard/reports"><Button variant="secondary">📊 Reports</Button></Link>
          </div>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — showing sample centre data. Connect backend for live stats.</Alert>}

        {/* Live sessions */}
        {LIVE_SESSIONS.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <h2 className="font-bold text-gray-800 dark:text-gray-200">Live Sessions ({LIVE_SESSIONS.length})</h2>
              </div>
            </CardHeader>
            <div className="divide-y dark:divide-gray-800">
              {LIVE_SESSIONS.map(s => (
                <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.subject} — {s.batch}</p>
                    <p className="text-xs text-gray-400">{s.teacher} · Room {s.room}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-lg font-black text-emerald-600">{s.present}<span className="text-gray-400 text-sm font-normal">/{s.total}</span></p>
                      <p className="text-[10px] text-gray-400">{Math.round(s.present/s.total*100)}% present</p>
                    </div>
                    <Link href={`/dashboard/attendance/session/${s.id}`}><Button size="sm" variant="secondary">Monitor →</Button></Link>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Students"   value="124"         colour="blue"   icon="🎓" sub="118 active" />
          <StatCard label="Present Today"    value="99"          colour="green"  icon="✅" sub="80% rate" />
          <StatCard label="Fee Pending"      value={fmt(275000)} colour="orange" icon="💰" sub="8 overdue" />
          <StatCard label="Active Teachers"  value="12"          colour="purple" icon="👨‍🏫" />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <DailyBarChart data={DAILY} />
          <AttendanceTrendChart data={TREND} />
        </div>

        {/* Batch performance */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Batch Performance Today</h2></CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {BATCHES.map(b => (
              <div key={b.name} className="px-5 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.name}</p>
                    <span className={`text-sm font-black ${b.pct>=80?'text-emerald-600':b.pct>=70?'text-amber-500':'text-red-500'}`}>{b.pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div className={`h-2 rounded-full ${b.pct>=80?'bg-emerald-500':b.pct>=70?'bg-amber-400':'bg-red-500'}`} style={{width:`${b.pct}%`}} />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{b.present}/{b.students} present</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <SubjectBarChart data={SUBJ} />

        {/* Defaulters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">⚠️ Attendance Defaulters ({DEFAULTERS.length})</h2>
              <Link href="/dashboard/reports"><span className="text-xs text-blue-600 font-medium hover:underline">View full report →</span></Link>
            </div>
          </CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {DEFAULTERS.map(d => (
              <div key={d.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.id} · {d.phone} · {d.batch}</p>
                </div>
                <Badge variant={d.att<60?'danger':'warning'}>{d.att}%</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {href:'/dashboard/attendance/reports',label:'Defaulters Report',icon:'⚠️'},
            {href:'/dashboard/fees',label:'Fee Dashboard',icon:'💰'},
            {href:'/dashboard/attendance/corrections',label:'Corrections',icon:'✏️'},
            {href:'/dashboard/attendance/leave',label:'Leave Requests',icon:'🏖️'},
          ].map(({href,label,icon})=>(
            <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center">
              <span className="text-2xl">{icon}</span>
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
