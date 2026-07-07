'use client'

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge, Button, Modal, Alert, EmptyState, Spinner } from '@/components/ui'
import { useCorrections, useCorrectAttendance } from '@/lib/attendance/useAttendance'
import { IS_DEMO } from '@/lib/gasClient'
import type { AttendanceStatus } from '@/lib/attendance/types'

const DEMO_CORRECTIONS = [
  { Correction_ID:'COR001', Session_ID:'SES000001', Student_ID:'STU000001', Student_Name:'Rahul Verma', Original_Status:'Absent' as const, Corrected_Status:'Present' as const, Reason:'Student was in exam hall', Approved_By:'Admin', Timestamp:new Date().toISOString() },
  { Correction_ID:'COR002', Session_ID:'SES000002', Student_ID:'STU000003', Student_Name:'Priya Sharma', Original_Status:'Present' as const, Corrected_Status:'Late' as const, Reason:'Arrived 12 minutes late', Approved_By:'Teacher', Timestamp:new Date(Date.now()-86400000).toISOString() },
]

const STATUS_V: Record<AttendanceStatus, 'success'|'danger'|'warning'|'default'> = { Present:'success', Absent:'danger', Late:'warning', Excused:'default' }

export default function CorrectionsPage() {
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ session_id:'', student_id:'', status:'Present' as AttendanceStatus, reason:'' })
  const [success, setSuccess] = useState('')

  const { data, isLoading } = useCorrections()
  const { mutateAsync: correct, isPending, error } = useCorrectAttendance()
  const corrections = data ?? (IS_DEMO ? DEMO_CORRECTIONS : [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await correct({ sessionId:form.session_id, studentId:form.student_id, status:form.status, reason:form.reason })
      setSuccess('Attendance corrected and logged to audit trail.')
      setShowModal(false)
      setForm({ session_id:'', student_id:'', status:'Present', reason:'' })
    } catch { /* shown below */ }
  }

  return (
    <DashboardShell title="Corrections">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">✏️ Attendance Corrections</h1>
            <p className="text-sm text-gray-500 mt-0.5">All corrections are permanently logged with your name and timestamp</p>
          </div>
          <Button onClick={() => setShowModal(true)}>+ New Correction</Button>
        </div>

        {success && <Alert variant="success">{success}</Alert>}

        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-2">When to use corrections</p>
          <div className="grid sm:grid-cols-2 gap-1 text-xs text-amber-600 dark:text-amber-400">
            {['Student had network issues during scan','Student was present but marked absent by system','Late arrival approved by teacher','Medical or emergency exemption granted'].map(r=>(
              <span key={r} className="flex items-start gap-1"><span className="shrink-0">→</span>{r}</span>
            ))}
          </div>
        </div>

        {isLoading ? <div className="flex justify-center py-8"><Spinner size="lg"/></div>
        : corrections.length === 0 ? <Card><CardBody><EmptyState icon="✏️" title="No corrections yet"/></CardBody></Card>
        : <div className="space-y-2">
            {corrections.map(c => (
              <Card key={c.Correction_ID}>
                <CardBody>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white">{c.Student_Name || c.Student_ID}</p>
                      <p className="text-xs text-gray-500 mt-0.5">Session: {c.Session_ID} · {new Date(c.Timestamp).toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-0.5 italic">{c.Reason}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_V[c.Original_Status]}>{c.Original_Status}</Badge>
                      <span className="text-gray-400">→</span>
                      <Badge variant={STATUS_V[c.Corrected_Status]}>{c.Corrected_Status}</Badge>
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        }

        {showModal && (
          <Modal title="Correct Attendance" onClose={() => setShowModal(false)}>
            <form onSubmit={submit} className="space-y-4">
              <Alert variant="warning">This correction is permanently logged with your identity and timestamp.</Alert>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Session ID *</label>
                <input required value={form.session_id} onChange={e=>setForm(f=>({...f,session_id:e.target.value}))} placeholder="SES000001"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Student ID *</label>
                <input required value={form.student_id} onChange={e=>setForm(f=>({...f,student_id:e.target.value}))} placeholder="STU000001"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Correct Status To *</label>
                <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value as AttendanceStatus}))}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                  {['Present','Absent','Late','Excused'].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Reason *</label>
                <textarea required rows={3} value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))}
                  placeholder="Explain why this correction is being made"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"/>
              </div>
              {error && <Alert variant="danger">{String(error).replace('Error:','')}</Alert>}
              <Button type="submit" className="w-full" disabled={isPending}>{isPending ? 'Saving…' : 'Save Correction'}</Button>
            </form>
          </Modal>
        )}
      </div>
    </DashboardShell>
  )
}
