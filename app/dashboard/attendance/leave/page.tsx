'use client'

import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge, Button, Modal, Alert, EmptyState, Spinner } from '@/components/ui'
import { useLeaveRequests, useSubmitLeave, useProcessLeave } from '@/lib/attendance/useAttendance'
import { useAuthStore } from '@/store/authStore'
import { IS_DEMO } from '@/lib/gasClient'
import type { LeaveRequest } from '@/lib/attendance/types'

const DEMO_LEAVES: LeaveRequest[] = [
  { Leave_ID:'LV001', Student_ID:'STU000001', Student_Name:'Rahul Verma', From_Date:'2025-12-10', To_Date:'2025-12-12', Reason:'Medical appointment — doctor certificate attached', Status:'Pending', Approved_By:'', Created_At:new Date().toISOString() },
  { Leave_ID:'LV002', Student_ID:'STU000003', Student_Name:'Priya Sharma', From_Date:'2025-12-05', To_Date:'2025-12-05', Reason:'Family function', Status:'Approved', Approved_By:'Centre Manager', Created_At:new Date(Date.now()-86400000).toISOString() },
  { Leave_ID:'LV003', Student_ID:'STU000007', Student_Name:'Arjun Mehta', From_Date:'2025-12-08', To_Date:'2025-12-09', Reason:'Out of station', Status:'Rejected', Approved_By:'Centre Manager', Created_At:new Date(Date.now()-172800000).toISOString() },
]

const STATUS_V = { Pending:'warning', Approved:'success', Rejected:'danger' } as const

export default function LeaveRequestsPage() {
  const { role } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ From_Date:'', To_Date:'', Reason:'' })
  const [submitMsg, setSubmitMsg] = useState('')

  const { data, isLoading } = useLeaveRequests()
  const { mutateAsync: submit, isPending: submitting, error: submitErr } = useSubmitLeave()
  const { mutateAsync: process, isPending: processing } = useProcessLeave()

  const isManager = ['SUPER_ADMIN','CENTRE_MANAGER','REGIONAL_MANAGER'].includes(role||'')
  const leaves = data ?? (IS_DEMO ? DEMO_LEAVES : [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    try {
      await submit(form)
      setSubmitMsg('Leave request submitted successfully.')
      setShowForm(false)
      setForm({ From_Date:'', To_Date:'', Reason:'' })
    } catch { /* shown below */ }
  }

  async function handleProcess(leaveId: string, action: 'Approved'|'Rejected') {
    try { await process({ leaveId, action }) } catch { /* handled */ }
  }

  const pending  = leaves.filter(l => l.Status === 'Pending')
  const approved = leaves.filter(l => l.Status === 'Approved')
  const rejected = leaves.filter(l => l.Status === 'Rejected')

  return (
    <DashboardShell title="Leave Requests">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">🏖️ Leave Requests</h1>
            <p className="text-sm text-gray-500">{pending.length} pending · {approved.length} approved · {rejected.length} rejected</p>
          </div>
          {!isManager && <Button onClick={() => setShowForm(true)}>+ Request Leave</Button>}
        </div>

        {submitMsg && <Alert variant="success">{submitMsg}</Alert>}

        {isLoading ? <div className="flex justify-center py-12"><Spinner size="lg"/></div>
        : leaves.length === 0 ? (
          <Card><CardBody><EmptyState icon="🏖️" title="No leave requests"
            message={isManager ? 'No leave requests from students yet.' : 'No leave requests submitted yet.'}/></CardBody></Card>
        ) : (
          <div className="space-y-3">
            {leaves.map(l => (
              <Card key={l.Leave_ID}>
                <CardBody>
                  <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {isManager && <p className="font-bold text-gray-900 dark:text-white">{l.Student_Name || l.Student_ID}</p>}
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium mt-0.5">
                        {l.From_Date}{l.To_Date !== l.From_Date ? ` → ${l.To_Date}` : ''}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{l.Reason}</p>
                      {l.Approved_By && <p className="text-xs text-gray-400 mt-1">{l.Status} by {l.Approved_By}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={STATUS_V[l.Status]}>{l.Status}</Badge>
                      {isManager && l.Status === 'Pending' && (
                        <>
                          <Button size="sm" disabled={processing} onClick={() => handleProcess(l.Leave_ID,'Approved')}>✓ Approve</Button>
                          <Button size="sm" variant="danger" disabled={processing} onClick={() => handleProcess(l.Leave_ID,'Rejected')}>✗ Reject</Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {showForm && (
          <Modal title="Request Leave" onClose={() => setShowForm(false)}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">From Date *</label>
                  <input type="date" required value={form.From_Date} onChange={e=>setForm(f=>({...f,From_Date:e.target.value}))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">To Date *</label>
                  <input type="date" required value={form.To_Date} onChange={e=>setForm(f=>({...f,To_Date:e.target.value}))}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Reason *</label>
                <textarea required rows={3} value={form.Reason} onChange={e=>setForm(f=>({...f,Reason:e.target.value}))}
                  placeholder="Explain the reason for your leave request"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none"/>
              </div>
              {submitErr && <Alert variant="danger">{String(submitErr).replace('Error:','')}</Alert>}
              <Button type="submit" className="w-full" disabled={submitting}>{submitting ? 'Submitting…' : 'Submit Request'}</Button>
            </form>
          </Modal>
        )}
      </div>
    </DashboardShell>
  )
}
