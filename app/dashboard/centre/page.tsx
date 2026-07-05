'use client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard } from '@/components/ui'

export default function Page() {
  return (
    <DashboardShell>
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">centre Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Students" value="—" colour="blue" icon="🎓" sub="Connect backend" />
          <StatCard label="Attendance Today" value="—" colour="green" icon="✅" />
          <StatCard label="Fee Collected" value="—" colour="teal" icon="💰" sub="This month" />
          <StatCard label="Pending Actions" value="—" colour="orange" icon="⏳" />
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border p-8 text-center">
          <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">Add NEXT_PUBLIC_GAS_URL in Vercel environment variables to connect the live backend.</p>
        </div>
      </div>
    </DashboardShell>
  )
}
