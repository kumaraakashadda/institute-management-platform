'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Button, Alert, Badge } from '@/components/ui'
import { gasPost, IS_DEMO } from '@/lib/gasClient'
import { useAuthStore } from '@/store/authStore'

interface CertResult {
  url: string
  cert_no: string
  pct: number
  present: number
  total: number
}

export default function AttendanceCertificatePage() {
  const { userId, name, role } = useAuthStore()
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate]     = useState(new Date().toISOString().split('T')[0])
  const [targetStudentId, setTargetStudentId] = useState('')
  const [result, setResult]     = useState<CertResult | null>(null)

  const isStudent = role === 'STUDENT'
  const studentId = isStudent ? (userId ?? '') : targetStudentId

  const { mutateAsync: generate, isPending, error } = useMutation({
    mutationFn: () => gasPost<CertResult>('generateAttendanceCertificate', {
      student_id: studentId,
      filters: {
        from_date: fromDate || undefined,
        to_date:   toDate || undefined,
      },
    }),
    onSuccess: setResult,
  })

  const colourClass = result
    ? result.pct >= 75 ? 'text-emerald-600' : result.pct >= 60 ? 'text-amber-500' : 'text-red-500'
    : ''

  return (
    <DashboardShell title="Attendance Certificate">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">🎓 Attendance Certificate</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate an official attendance certificate PDF stored in Google Drive
          </p>
        </div>

        {IS_DEMO && (
          <Alert variant="info">
            Demo mode — connect backend to generate real certificates. The certificate is generated as a PDF and stored in Google Drive with a shareable link.
          </Alert>
        )}

        <Card>
          <CardHeader>
            <h2 className="font-bold text-gray-800 dark:text-gray-200">Certificate Details</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-4">
              {/* Admin/Manager can specify any student */}
              {!isStudent && (
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Student ID *</label>
                  <input value={targetStudentId} onChange={e => setTargetStudentId(e.target.value)}
                    placeholder="e.g. STU000001"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                </div>
              )}

              {isStudent && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Generating for</p>
                  <p className="font-black text-blue-900 dark:text-blue-100 mt-0.5">{name}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-mono">{userId}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">From Date (optional)</label>
                  <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                  <p className="text-[10px] text-gray-400 mt-1">Leave blank for all-time</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">To Date</label>
                  <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                </div>
              </div>

              {error && <Alert variant="danger">{String(error).replace('Error: ', '')}</Alert>}

              <Button
                disabled={isPending || (!isStudent && !targetStudentId.trim())}
                onClick={() => generate()}
                className="w-full"
              >
                {isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Generating PDF…
                  </span>
                ) : '🎓 Generate Attendance Certificate PDF'}
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Result card */}
        {result && (
          <Card>
            <CardBody>
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-4xl mx-auto">🎓</div>
                <div>
                  <p className="text-xl font-black text-gray-900 dark:text-white">Certificate Generated!</p>
                  <p className="text-xs text-gray-400 font-mono mt-1">Cert No: {result.cert_no}</p>
                </div>

                {/* Attendance stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                    <p className={`text-3xl font-black ${colourClass}`}>{result.pct}%</p>
                    <p className="text-xs text-gray-400 mt-0.5">Attendance</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                    <p className="text-3xl font-black text-emerald-600">{result.present}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Present</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 dark:bg-gray-800 p-3 text-center">
                    <p className="text-3xl font-black text-gray-700 dark:text-gray-300">{result.total}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total Classes</p>
                  </div>
                </div>

                <Badge variant={result.pct >= 75 ? 'success' : result.pct >= 60 ? 'warning' : 'danger'} className="text-sm px-4 py-1">
                  {result.pct >= 75 ? '✓ Above Threshold' : result.pct >= 60 ? '⚠ Near Threshold' : '✗ Below Threshold'}
                </Badge>

                {/* Download button */}
                <a href={result.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold text-sm transition-all"
                  style={{ background: 'linear-gradient(135deg, #2563eb, #4f46e5)', boxShadow: '0 4px 14px rgba(37,99,235,0.35)' }}>
                  ↓ Download Certificate PDF
                </a>

                <p className="text-xs text-gray-400">
                  The certificate is stored in Google Drive and can be accessed anytime via this link.
                  It includes institute seal, student details, and attendance stats for the selected period.
                </p>

                <Button variant="secondary" onClick={() => setResult(null)} className="w-full">
                  Generate Another Certificate
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* What the certificate includes */}
        {!result && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Certificate Contents</h2></CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ['🏫','Institute name & seal'],
                  ['👤','Student name & ID'],
                  ['📚','Course & batch details'],
                  ['📊','Attendance percentage'],
                  ['📅','Date range covered'],
                  ['🔢','Classes attended / total'],
                  ['🔖','Unique certificate number'],
                  ['✍️','Authorized signatory line'],
                  ['📱','Verifiable via Drive link'],
                  ['💾','Stored permanently in Drive'],
                ].map(([icon, label]) => (
                  <div key={label as string} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                    <span className="shrink-0">{icon}</span><span>{label}</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
