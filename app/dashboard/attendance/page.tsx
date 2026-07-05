'use client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardHeader, CardBody, Badge, EmptyState } from '@/components/ui'
import { IS_DEMO } from '@/lib/gasClient'

export default function AttendancePage() {
  return (
    <DashboardShell title="Attendance">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">📋 Attendance Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Hybrid QR-based attendance system</p>
          </div>
          <Badge variant="info">Milestone 4</Badge>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Present Today"   value="—" colour="green"  icon="✅" sub="Live in M4" />
          <StatCard label="Absent Today"    value="—" colour="red"    icon="❌" sub="Live in M4" />
          <StatCard label="Live Sessions"   value="—" colour="blue"   icon="📡" sub="Live in M4" />
          <StatCard label="Avg Attendance"  value="—" colour="purple" icon="📊" sub="Live in M4" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">Attendance Module — Coming in Milestone 4</h2>
              <Badge variant="warning">In Progress</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm">What M4 delivers</h3>
                <div className="space-y-2">
                  {[
                    'Teacher starts a session → selects Centre, Batch, Course, Subject',
                    'System generates encrypted QR code with JWT + expiry',
                    'Students scan QR → all validations run server-side',
                    'Validates: session active, student in batch, not already marked, QR not expired',
                    'Optional: GPS, device fingerprint, Wi-Fi network check',
                    'After session: auto-marks absent, generates summary, notifies teacher',
                    'Teacher can manually override with full audit trail',
                    'Student portal shows attendance calendar + percentage by subject',
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5 shrink-0 text-xs">→</span>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300 mb-3 text-sm">Database tables ready</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {['Attendance_Sessions','Attendance_Log','Attendance_Corrections','Student_Devices','QR_Sessions','Leave_Requests'].map(t => (
                    <div key={t} className="text-[10px] font-mono bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 px-2 py-1 rounded-lg border border-emerald-100 dark:border-emerald-800">
                      ✓ {t}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-3">All 6 attendance tables were created in Milestone 2 and are ready for the M4 business logic.</p>

                {!IS_DEMO && (
                  <div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">✅ Backend connected</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Your GAS URL is set. M4 will plug directly into your live database.</p>
                  </div>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  )
}
