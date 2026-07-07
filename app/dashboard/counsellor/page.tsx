'use client'
import Link from 'next/link'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui'
import { fmt } from '@/lib/utils/helpers'

export default function CounsellorDashboardPage() {
  return (
    <DashboardShell title="Counsellor Dashboard">
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">🤝 Counsellor Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="My Students"    value="45"         colour="blue"   icon="🎓"/>
          <StatCard label="Follow-ups Due" value="8"          colour="orange" icon="📞" sub="today"/>
          <StatCard label="Pending Fees"   value={fmt(185000)} colour="red"   icon="💰"/>
          <StatCard label="This Month Admission" value="5"    colour="green"  icon="🎉"/>
        </div>
        <Card>
          <CardHeader><h2 className="font-bold">Quick Access</h2></CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                {href:'/dashboard/fees/crm',label:'CRM Pipeline',icon:'🎯'},
                {href:'/dashboard/fees',label:'Fee Dashboard',icon:'💰'},
                {href:'/dashboard/fees/student',label:'Student Lookup',icon:'🔍'},
                {href:'/dashboard/fees/reports',label:'Reports',icon:'📊'},
                {href:'/dashboard/attendance/leave',label:'Leave Requests',icon:'🏖️'},
                {href:'/dashboard/fees/calendar',label:'Fee Calendar',icon:'📅'},
              ].map(({href,label,icon})=>(
                <Link key={href} href={href} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:shadow-md transition-all text-center">
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
