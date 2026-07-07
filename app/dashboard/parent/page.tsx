'use client'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, StatCard, Alert } from '@/components/ui'
import { IS_DEMO } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'
import { useAuthStore } from '@/store/authStore'

const CHILD = { name:'Rahul Verma', student_id:'STU000001', course:'JEE Advanced', batch:'JEE-2026-A', centre:'Delhi Rohini',
  attendance_pct:78, present:94, absent:26, threshold_pct:75,
  fee_net:150000, fee_paid:90000, fee_pending:60000, collection_pct:60, next_due:'2025-12-15', next_due_amount:25000 }

const RECENT_ATTENDANCE = [
  {date:'Dec 05',subject:'Physics',status:'Present'},{date:'Dec 05',subject:'Maths',status:'Absent'},
  {date:'Dec 04',subject:'Chemistry',status:'Present'},{date:'Dec 04',subject:'Physics',status:'Present'},
  {date:'Dec 03',subject:'Maths',status:'Late'},
]

export default function ParentDashboardPage() {
  const { name } = useAuthStore()
  return (
    <DashboardShell title="Parent Portal">
      <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">👨‍👩‍👧 Parent Portal</h1>
          <p className="text-sm text-gray-500 mt-0.5">Monitoring: <strong>{CHILD.name}</strong></p>
        </div>

        {IS_DEMO&&<Alert variant="info">Demo parent portal. Connect backend to see your child&apos;s real data.</Alert>}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Child Attendance" value={`${CHILD.attendance_pct}%`} colour={CHILD.attendance_pct>=CHILD.threshold_pct?'green':'red'} icon="📊" sub={`${CHILD.present}/${CHILD.present+CHILD.absent} classes`}/>
          <StatCard label="Fee Paid"    value={fmt(CHILD.fee_paid)}    colour="blue"   icon="✅"/>
          <StatCard label="Fee Pending" value={fmt(CHILD.fee_pending)} colour="orange" icon="💰" sub={`Due ${CHILD.next_due}`}/>
          <StatCard label="Total Course" value={fmt(CHILD.fee_net)}   colour="purple" icon="💼"/>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {/* Child summary */}
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">👤 Child Summary</h2></CardHeader>
            <CardBody>
              <div className="space-y-2 text-sm">
                {[['Name',CHILD.name],['ID',CHILD.student_id],['Course',CHILD.course],['Batch',CHILD.batch],['Centre',CHILD.centre]].map(([l,v])=>(
                  <div key={l} className="flex justify-between"><span className="text-gray-500">{l}</span><span className="font-semibold text-gray-800 dark:text-gray-200">{v}</span></div>
                ))}
                <div className="pt-2 flex justify-between items-center">
                  <span className="text-gray-500">Status</span>
                  <Badge variant={CHILD.attendance_pct>=CHILD.threshold_pct?'success':'danger'}>
                    {CHILD.attendance_pct>=CHILD.threshold_pct?'✓ On Track':'⚠ Below Threshold'}
                  </Badge>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Fee status */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800 dark:text-gray-200">💰 Fee Status</h2>
                <Link href="/dashboard/fees/student"><span className="text-xs text-blue-600 hover:underline">Details →</span></Link>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-2.5">
                {[['Total Fee',fmt(CHILD.fee_net),''],['Paid',fmt(CHILD.fee_paid),'text-emerald-600'],['Pending',fmt(CHILD.fee_pending),'text-red-500']].map(([l,v,cls])=>(
                  <div key={l} className="flex justify-between text-sm"><span className="text-gray-500">{l}</span><span className={`font-bold ${cls}`}>{v}</span></div>
                ))}
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{width:`${CHILD.collection_pct}%`}}/>
                </div>
                <div className="p-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                  Next: <strong>{fmt(CHILD.next_due_amount)}</strong> due on {CHILD.next_due}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Recent attendance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">Recent Attendance</h2>
              <Link href="/dashboard/student/attendance"><span className="text-xs text-blue-600 hover:underline">Full history →</span></Link>
            </div>
          </CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {RECENT_ATTENDANCE.map((r,i)=>(
              <div key={i} className="px-5 py-3 flex items-center justify-between">
                <div><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{r.subject}</p><p className="text-xs text-gray-400">{r.date}</p></div>
                <Badge variant={r.status==='Present'?'success':r.status==='Late'?'warning':'danger'}>{r.status}</Badge>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            {href:'/dashboard/student/attendance',label:'Attendance',icon:'📊',c:'text-blue-600 bg-blue-50 dark:bg-blue-900/20'},
            {href:'/dashboard/fees/student',label:'Fee Details',icon:'💰',c:'text-orange-600 bg-orange-50 dark:bg-orange-900/20'},
            {href:'/dashboard/attendance/leave',label:'Leave Request',icon:'🏖️',c:'text-pink-600 bg-pink-50 dark:bg-pink-900/20'},
            {href:'/dashboard/student/id-card',label:'Child ID Card',icon:'🪪',c:'text-teal-600 bg-teal-50 dark:bg-teal-900/20'},
          ].map(({href,label,icon,c})=>(
            <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md transition-all text-center card-hover">
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${c}`}>{icon}</span>
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
