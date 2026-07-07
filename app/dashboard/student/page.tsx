'use client'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, StatCard, Alert } from '@/components/ui'
import { IS_DEMO } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'
import { useAuthStore } from '@/store/authStore'

const DEMO = { student_id:'STU000001', full_name:'Demo Student', batch:'JEE-2026-A', course:'JEE Advanced', centre:'Delhi Rohini', target_year:'2026',
  attendance_pct:78, total_classes:120, present:94, absent:26, is_defaulter:false, threshold_pct:75,
  fee_net:150000, fee_paid:90000, fee_pending:60000, collection_pct:60, next_due_date:'2025-12-15', next_due_amount:25000 }

const CLASSES = [
  {time:'9:00 AM',subject:'Physics',teacher:'Dr. Sharma',room:'201'},
  {time:'11:00 AM',subject:'Maths',teacher:'Prof. Gupta',room:'202'},
  {time:'2:00 PM',subject:'Chemistry',teacher:'Dr. Reddy',room:'103'},
]

export default function StudentDashboardPage() {
  const { name } = useAuthStore()
  const p = DEMO

  return (
    <DashboardShell title="Student Portal">
      <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
            {(name||'S').charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">Welcome, {name||p.full_name}!</h1>
            <p className="text-sm text-gray-500">{p.course} · {p.batch} · {p.centre}</p>
            <p className="text-xs text-gray-400 font-mono">{p.student_id}</p>
          </div>
        </div>

        {IS_DEMO&&<Alert variant="info">Demo student portal. Connect backend to see your real data.</Alert>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Attendance"  value={`${p.attendance_pct}%`}   colour={p.attendance_pct>=p.threshold_pct?'green':'red'}  icon="📊" sub={`${p.present}/${p.total_classes} classes`}/>
          <StatCard label="Fee Paid"    value={fmt(p.fee_paid)}           colour="blue"   icon="✅" sub={`${p.collection_pct}%`}/>
          <StatCard label="Fee Due"     value={fmt(p.fee_pending)}        colour="orange" icon="💰" sub={p.next_due_date?`Due ${p.next_due_date}`:'No pending'}/>
          <StatCard label="Today Classes" value="3"                       colour="purple" icon="📚" sub="Physics, Maths, Chem"/>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800 dark:text-gray-200">📊 My Attendance</h2>
                <Link href="/dashboard/student/attendance"><span className="text-xs text-blue-600 hover:underline">Details →</span></Link>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 shrink-0">
                  <svg viewBox="0 0 80 80" className="w-20 h-20 -rotate-90">
                    <circle cx="40" cy="40" r="32" fill="none" stroke="#f3f4f6" strokeWidth="8"/>
                    <circle cx="40" cy="40" r="32" fill="none" stroke={p.attendance_pct>=75?'#10b981':'#ef4444'} strokeWidth="8"
                      strokeDasharray={`${(p.attendance_pct/100)*201} 201`} strokeLinecap="round"/>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`text-lg font-black ${p.attendance_pct>=75?'text-emerald-600':'text-red-500'}`}>{p.attendance_pct}%</span>
                  </div>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex gap-2"><span className="text-gray-500">Present:</span><span className="font-bold text-emerald-600">{p.present}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500">Absent:</span><span className="font-bold text-red-500">{p.absent}</span></div>
                  <div className="flex gap-2"><span className="text-gray-500">Required:</span><span className="font-bold">{p.threshold_pct}%</span></div>
                  <Badge variant={p.is_defaulter?'danger':p.attendance_pct>=85?'success':'info'}>
                    {p.is_defaulter?'⚠ Below threshold':p.attendance_pct>=85?'✓ Excellent':'✓ On track'}
                  </Badge>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800 dark:text-gray-200">💰 My Fees</h2>
                <Link href="/dashboard/fees/student"><span className="text-xs text-blue-600 hover:underline">Details →</span></Link>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2.5">
                {[['Total Fee',fmt(p.fee_net),''],['Paid',fmt(p.fee_paid),'text-emerald-600'],['Pending',fmt(p.fee_pending),'text-red-500']].map(([l,v,cls])=>(
                  <div key={l} className="flex justify-between text-sm"><span className="text-gray-500">{l}</span><span className={`font-bold ${cls}`}>{v}</span></div>
                ))}
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{width:`${p.collection_pct}%`}}/>
                </div>
                {p.next_due_date&&<div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">Next due: <strong>{fmt(p.next_due_amount)}</strong> on {p.next_due_date}</div>}
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">📚 Today&apos;s Classes</h2></CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {CLASSES.map((cls,i)=>(
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div><p className="font-semibold text-sm text-gray-900 dark:text-white">{cls.subject}</p><p className="text-xs text-gray-400">{cls.teacher} · Room {cls.room}</p></div>
                <p className="text-sm font-bold text-blue-600">{cls.time}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            {href:'/dashboard/student/attendance',label:'Attendance',icon:'📊',c:'text-blue-600 bg-blue-50 dark:bg-blue-900/20'},
            {href:'/dashboard/attendance/scan',label:'Scan QR',icon:'📷',c:'text-purple-600 bg-purple-50 dark:bg-purple-900/20'},
            {href:'/dashboard/fees/student',label:'My Fees',icon:'💰',c:'text-orange-600 bg-orange-50 dark:bg-orange-900/20'},
            {href:'/dashboard/attendance/leave',label:'Leave',icon:'🏖️',c:'text-pink-600 bg-pink-50 dark:bg-pink-900/20'},
            {href:'/dashboard/student/id-card',label:'ID Card',icon:'🪪',c:'text-teal-600 bg-teal-50 dark:bg-teal-900/20'},
            {href:'/dashboard/student/profile',label:'Profile',icon:'👤',c:'text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20'},
          ].map(({href,label,icon,c})=>(
            <Link key={href} href={href} className="flex flex-col items-center gap-2 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center card-hover">
              <span className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${c}`}>{icon}</span>
              <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 leading-tight">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
