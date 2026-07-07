'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardHeader, CardBody, Badge, Button, Alert } from '@/components/ui'
import { SubjectBarChart, DailyBarChart } from '@/components/charts'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { useAuthStore } from '@/store/authStore'

const DEMO_SESSIONS_TODAY = [
  {id:'SES000001',time:'09:00 AM',batch:'JEE-2026-A',subject:'Physics',room:'201',students:45,present:38,status:'Completed'},
  {id:'SES000002',time:'11:00 AM',batch:'JEE-2026-B',subject:'Maths',room:'202',students:42,present:35,status:'Completed'},
  {id:'SES000003',time:'02:00 PM',batch:'JEE-2027-A',subject:'Physics',room:'201',students:30,present:0,status:'Upcoming'},
]
const DEMO_SUBJECTS = [{subject:'Physics (JEE-A)',pct:87},{subject:'Maths (JEE-A)',pct:91},{subject:'Physics (JEE-B)',pct:83}]
const DEMO_DAILY   = ['Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>({day:d,present:35+Math.round(Math.random()*12),absent:2+Math.round(Math.random()*8)}))
const DEMO_STUDENTS_LOW = [
  {name:'Arjun Kumar',id:'STU000003',batch:'JEE-2026-A',att:62,phone:'9876543212'},
  {name:'Vikram Yadav',id:'STU000005',batch:'JEE-2026-A',att:58,phone:'9876543214'},
  {name:'Anjali Sharma',id:'STU000008',batch:'JEE-2026-B',att:66,phone:'9876543217'},
]

export default function TeacherDashboardPage() {
  const { name } = useAuthStore()

  return (
    <DashboardShell title="Teacher Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-5xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">👨‍🏫 {name ? `Welcome, ${name.split(' ')[0]}` : 'Teacher Dashboard'}</h1>
            <p className="text-sm text-gray-500 mt-0.5">Delhi Rohini · {new Date().toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}</p>
          </div>
          <Link href="/dashboard/attendance/session/new"><Button>▶ Start New Session</Button></Link>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — showing sample teacher data.</Alert>}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="My Batches"     value="3"   colour="blue"   icon="📚" sub="Active" />
          <StatCard label="Total Students" value="135" colour="green"  icon="🎓" />
          <StatCard label="Avg Attendance" value="87%" colour="purple" icon="📊" />
          <StatCard label="Sessions Today" value="3"   colour="indigo" icon="📡" sub="1 upcoming" />
        </div>

        {/* Today's sessions */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">📅 Today&apos;s Sessions</h2></CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {DEMO_SESSIONS_TODAY.map(s => (
              <div key={s.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${s.status==='Completed'?'bg-emerald-100 dark:bg-emerald-900/30':s.status==='Upcoming'?'bg-blue-100 dark:bg-blue-900/30':'bg-amber-100 dark:bg-amber-900/30'}`}>
                    {s.status==='Completed'?'✅':s.status==='Upcoming'?'⏳':'🔴'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{s.subject} — {s.batch}</p>
                    <p className="text-xs text-gray-400">{s.time} · Room {s.room} · {s.students} students</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {s.status === 'Completed' && (
                    <div className="text-right">
                      <p className="text-sm font-black text-emerald-600">{s.present}<span className="text-gray-400 font-normal text-xs">/{s.students}</span></p>
                      <p className="text-[11px] text-gray-400">{Math.round(s.present/s.students*100)}% present</p>
                    </div>
                  )}
                  <Badge variant={s.status==='Completed'?'success':s.status==='Upcoming'?'info':'warning'}>{s.status}</Badge>
                  {s.status === 'Upcoming'
                    ? <Link href="/dashboard/attendance/session/new"><Button size="sm">Start →</Button></Link>
                    : <Link href={`/dashboard/attendance/session/${s.id}`}><Button size="sm" variant="secondary">View</Button></Link>
                  }
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-4">
          <SubjectBarChart data={DEMO_SUBJECTS} />
          <DailyBarChart data={DEMO_DAILY} />
        </div>

        {/* Students needing attention */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">⚠️ Students Needing Attention</h2>
              <Link href="/dashboard/teacher/students"><span className="text-xs text-blue-600 font-medium hover:underline">View all →</span></Link>
            </div>
          </CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {DEMO_STUDENTS_LOW.map(s => (
              <div key={s.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.batch} · {s.phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={s.att<60?'danger':'warning'}>{s.att}%</Badge>
                  <Link href={`/dashboard/students/${s.id}`}><Button size="sm" variant="ghost">Profile →</Button></Link>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            {href:'/dashboard/attendance/session/new',   label:'Start Session',  icon:'▶️'},
            {href:'/dashboard/attendance/session/list',  label:'My Sessions',    icon:'📋'},
            {href:'/dashboard/teacher/students',         label:'My Students',    icon:'👥'},
            {href:'/dashboard/attendance/corrections',   label:'Corrections',    icon:'✏️'},
            {href:'/dashboard/teacher/performance',      label:'Performance',    icon:'📊'},
            {href:'/dashboard/attendance/leave',         label:'Leave',          icon:'🏖️'},
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
