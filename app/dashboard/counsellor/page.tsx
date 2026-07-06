'use client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardBody, Alert } from '@/components/ui'
import { IS_DEMO } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'
import Link from 'next/link'

export default function Page() {
  return (
    <DashboardShell title="Counsellor Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">🤝 Counsellor Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {IS_DEMO ? 'Demo mode — connect backend to see live data' : 'Live data'}
          </p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Students" value="—" colour="blue" icon="🎓" sub="Connect backend" />
          <StatCard label="Today" value="—" colour="green" icon="✅" />
          <StatCard label="Fees" value="—" colour="orange" icon="💰" />
          <StatCard label="Actions" value="—" colour="purple" icon="⏳" />
        </div>
        <Card>
          <CardBody>
            <div className="text-center py-8">
              <p className="text-4xl mb-3">🤝</p>
              <h2 className="text-lg font-bold text-gray-700 dark:text-gray-300">Counsellor Dashboard</h2>
              <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto">
                {IS_DEMO
                  ? 'Add NEXT_PUBLIC_GAS_URL in Vercel environment variables, then redeploy to see live data.'
                  : 'Live dashboard data will appear here once backend API endpoint is ready.'}
              </p>
              {IS_DEMO && (
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-lg text-gray-600 dark:text-gray-400">
                  Vercel → Settings → Environment Variables → NEXT_PUBLIC_GAS_URL
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  )
}
