'use client'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardHeader, CardBody, Badge } from '@/components/ui'
import { SubjectBarChart, DailyBarChart } from '@/components/charts'

const SUBJ = [{subject:'Physics',pct:87},{subject:'Maths',pct:91},{subject:'Chemistry',pct:72}]
const DAILY = ['Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>({day:d,present:35+Math.round(Math.random()*12),absent:2+Math.round(Math.random()*8)}))

export default function TeacherDashboardPage() {
  return (
    <DashboardShell title="Teacher Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">👨‍🏫 Teacher Dashboard</h1>
          <Link href="/dashboard/attendance/session/new"><button className="px-4 py-2 rounded-xl text-white text-sm font-bold" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>▶ Start Session</button></Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="My Batches"     value="3"   colour="blue"   icon="📚"/>
          <StatCard label="Total Students" value="135" colour="green"  icon="🎓"/>
          <StatCard label="Avg Attendance" value="84%" colour="purple" icon="📊"/>
          <StatCard label="Today Sessions" value="2"   colour="indigo" icon="📡"/>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <SubjectBarChart data={SUBJ}/>
          <DailyBarChart data={DAILY}/>
        </div>
        <Card>
          <CardHeader><h2 className="font-bold">Today&apos;s Sessions</h2></CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {[{time:'9:00 AM',batch:'JEE-2026-A',subj:'Physics',room:'201',students:45},{time:'11:00 AM',batch:'JEE-2026-B',subj:'Maths',room:'202',students:42}].map((s,i)=>(
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.subj} — {s.batch}</p>
                  <p className="text-xs text-gray-400">{s.time} · Room {s.room} · {s.students} students</p>
                </div>
                <Link href="/dashboard/attendance/session/new"><Badge variant="info">Start →</Badge></Link>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  )
}
