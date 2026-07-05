'use client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardHeader, CardBody, Badge, EmptyState } from '@/components/ui'

export default function AttendancePage() {
  return (
    <DashboardShell title="Attendance">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📋 Attendance Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Hybrid QR-based attendance system</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Today Present"  value="—" colour="green"  icon="✅" />
          <StatCard label="Today Absent"   value="—" colour="red"    icon="❌" />
          <StatCard label="Live Sessions"  value="—" colour="blue"   icon="📡" />
          <StatCard label="Avg Attendance" value="—" colour="purple" icon="📊" />
        </div>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-800 dark:text-gray-200">Active Sessions</h2>
              <Badge variant="info">Milestone 4</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <EmptyState icon="📡" title="Attendance Module — Milestone 4" message="The hybrid QR attendance system builds on top of this foundation in the next milestone." />
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  )
}
