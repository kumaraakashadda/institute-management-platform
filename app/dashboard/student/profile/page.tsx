'use client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Alert } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { IS_DEMO } from '@/lib/gasClient'

export default function StudentProfilePage() {
  const { name, userId, role } = useAuthStore()
  return (
    <DashboardShell title="My Profile">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">👤 My Profile</h1>
        {IS_DEMO&&<Alert variant="info">Demo mode — connect backend to see real profile data.</Alert>}
        <Card>
          <CardBody>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
                {(name||'S').charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">{name||'Demo Student'}</h2>
                <p className="text-sm text-gray-500 font-mono">{userId||'STU000001'}</p>
                <Badge variant="info" className="mt-1">{role?.replace('_',' ')}</Badge>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                ['Full Name',name||'Demo Student'],['Student ID',userId||'STU000001'],
                ['Course','JEE Advanced'],['Batch','JEE-2026-A'],
                ['Centre','Delhi Rohini'],['Target Year','2026'],
                ['Segment','Classroom'],['Phone','9876543210'],
                ['Email','student@demo.com'],['Admission Date','01 Sep 2024'],
              ].map(([l,v])=>(
                <div key={l} className="space-y-0.5">
                  <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{l}</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{v}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Change Password</h2></CardHeader>
          <CardBody>
            <div className="space-y-3">
              {['Current Password','New Password','Confirm New Password'].map(label=>(
                <div key={label}>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                  <input type="password" placeholder="••••••••" className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                </div>
              ))}
              <button className="w-full py-2.5 rounded-xl text-white font-bold text-sm" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>Update Password</button>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  )
}
