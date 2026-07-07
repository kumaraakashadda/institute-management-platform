'use client'

import { useState, Suspense } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Alert, Input, Spinner, EmptyState } from '@/components/ui'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'
import { fmt, fmtDate } from '@/lib/utils/helpers'

interface FollowUp {
  Student_ID: string; Current_Stage: string; Last_Contacted: string
  Next_Followup_Date: string; Last_Note: string; Channel: string
  Updated_By: string; Updated_At: string
}
interface LogResult {
  followup_log: FollowUp[]
  audit_trail: { Action: string; Timestamp: string; User_ID: string; New_Value: string }[]
  student: Record<string, string>
  fee: Record<string, string>
}

const STAGE_V: Record<string, 'info'|'warning'|'success'|'danger'|'default'|'purple'> = {
  Upcoming_Due:'info', Contacted:'purple', Promise_To_Pay:'warning',
  Partially_Paid:'warning', Fully_Paid:'success', Not_Reachable:'danger'
}
const CHANNEL_ICONS: Record<string, string> = {
  Manual:'📝', Email:'📧', WhatsApp:'💬', Call:'📞', SMS:'📱', Visit:'🏢'
}
const DEMO_LOG: LogResult = {
  followup_log: [
    { Student_ID:'STU000001', Current_Stage:'Contacted', Last_Contacted:'2025-12-03', Next_Followup_Date:'2025-12-10', Last_Note:'Student said will pay by end of week. Father traveling.', Channel:'Call', Updated_By:'Rohit Singh', Updated_At:new Date(Date.now()-86400000*2).toISOString() },
    { Student_ID:'STU000001', Current_Stage:'Upcoming_Due', Last_Contacted:'2025-11-25', Next_Followup_Date:'2025-12-03', Last_Note:'Upcoming installment reminder sent via WhatsApp.', Channel:'WhatsApp', Updated_By:'system', Updated_At:new Date(Date.now()-86400000*10).toISOString() },
  ],
  audit_trail: [
    { Action:'PAYMENT_RECORDED', Timestamp:new Date(Date.now()-86400000*15).toISOString(), User_ID:'Admin', New_Value:'₹35,000 via UPI' },
    { Action:'FEE_PLAN_ASSIGNED', Timestamp:new Date(Date.now()-86400000*60).toISOString(), User_ID:'Admin', New_Value:'JEE 2-Year Plan' },
  ],
  student: { Full_Name:'Rahul Verma', Student_ID:'STU000001', Phone:'9876543210', Course:'JEE Advanced', Centre:'Delhi Rohini', Batch:'JEE-2026-A' },
  fee: { Net_Fee:'140000', Total_Paid:'90000', Pending_Amount:'50000', Payment_Status:'Partial' },
}

function CrmLogInner() {
  const params = useSearchParams()
  const [sid, setSid]       = useState(params?.get('id') ?? '')
  const [search, setSearch] = useState(params?.get('id') ?? '')
  const [showAdd, setShowAdd] = useState(false)
  const [note, setNote]     = useState('')
  const [stage, setStage]   = useState('Contacted')
  const [nextDate, setNextDate] = useState('')
  const [channel, setChannel] = useState('Call')
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['crmLog', sid],
    queryFn: () => gasGet<LogResult>('getCrmFollowUpLog', { student_id: sid }),
    enabled: !!sid && !IS_DEMO, retry: false,
  })
  const log = data ?? (IS_DEMO && sid ? DEMO_LOG : null)

  const { mutateAsync: addNote, isPending: adding } = useMutation({
    mutationFn: () => gasPost('addFollowUpNote', {
      student_id: sid, note: { stage, text: note }, next_followup: nextDate, channel,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crmLog', sid] })
      setShowAdd(false); setNote(''); setNextDate('')
    },
  })

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl font-black text-gray-900 dark:text-white">📋 CRM Follow-up Log</h1>
      <form onSubmit={e => { e.preventDefault(); setSid(search.trim()) }} className="flex gap-2">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Enter Student ID e.g. STU000001" className="flex-1"/>
        <Button type="submit">Search</Button>
      </form>
      {!sid && <EmptyState icon="🔍" title="Enter a Student ID to view follow-up log"/>}
      {IS_DEMO && sid && <Alert variant="info">Demo mode — showing sample follow-up log.</Alert>}
      {isLoading && <div className="flex justify-center py-8"><Spinner size="lg"/></div>}

      {log && (<>
        <Card>
          <CardBody>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-xl font-black text-gray-900 dark:text-white">{log.student.Full_Name}</p>
                <p className="text-sm text-gray-500">{log.student.Student_ID} · {log.student.Phone} · {log.student.Centre}</p>
                <p className="text-sm text-gray-400">{log.student.Course} · {log.student.Batch}</p>
              </div>
              <div className="flex items-center gap-4 text-center shrink-0">
                <div><p className="text-xl font-black text-red-500">{fmt(Number(log.fee.Pending_Amount||0))}</p><p className="text-xs text-gray-400">Pending</p></div>
                <div><p className="text-xl font-black text-emerald-600">{fmt(Number(log.fee.Total_Paid||0))}</p><p className="text-xs text-gray-400">Paid</p></div>
              </div>
            </div>
            <Button onClick={() => setShowAdd(true)} className="mt-4">+ Add Follow-up Note</Button>
          </CardBody>
        </Card>

        {showAdd && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Add Follow-up Note</h2></CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Stage</label>
                    <select value={stage} onChange={e => setStage(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500">
                      {['Upcoming_Due','Contacted','Promise_To_Pay','Partially_Paid','Fully_Paid','Not_Reachable'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Channel</label>
                    <select value={channel} onChange={e => setChannel(e.target.value)}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500">
                      {['Call','WhatsApp','Email','SMS','Visit','Manual'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Note *</label>
                  <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} required
                    placeholder="What happened in this follow-up?"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500 resize-none"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Next Follow-up Date</label>
                  <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500"/>
                </div>
                <div className="flex gap-2">
                  <Button disabled={adding || !note.trim()} onClick={() => addNote()} className="flex-1">
                    {adding ? 'Saving…' : 'Save Note'}
                  </Button>
                  <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Follow-up History</h2></CardHeader>
          <CardBody>
            {log.followup_log.length === 0
              ? <EmptyState icon="📋" title="No follow-ups yet" message="Add the first note using the button above."/>
              : <ol className="relative border-l-2 border-gray-100 dark:border-gray-800 space-y-5 ml-3">
                  {log.followup_log.map((fu, i) => (
                    <li key={i} className="relative pl-6">
                      <div className="absolute -left-3.5 top-0 w-7 h-7 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm">
                        {CHANNEL_ICONS[fu.Channel] || '📝'}
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={STAGE_V[fu.Current_Stage] || 'default'}>{fu.Current_Stage.replace(/_/g,' ')}</Badge>
                          <Badge variant="default">{fu.Channel}</Badge>
                          <span className="text-xs text-gray-400 ml-auto">{fmtDate(fu.Updated_At)}</span>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">{fu.Last_Note}</p>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>By: {fu.Updated_By}</span>
                          {fu.Next_Followup_Date && <span className="text-blue-600 font-semibold">Next: {fmtDate(fu.Next_Followup_Date)}</span>}
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
            }
          </CardBody>
        </Card>

        {log.audit_trail.length > 0 && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Fee Audit Trail</h2></CardHeader>
            <div className="divide-y dark:divide-gray-800">
              {log.audit_trail.map((ev, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{ev.Action.replace(/_/g,' ')}</p>
                    <p className="text-xs text-gray-400">{fmtDate(ev.Timestamp)} · by {ev.User_ID}</p>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{ev.New_Value}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </>)}
    </div>
  )
}

export default function CrmLogPage() {
  return (
    <DashboardShell title="CRM Follow-up Log">
      <Suspense fallback={<div className="flex justify-center py-20"><Spinner size="lg"/></div>}>
        <CrmLogInner />
      </Suspense>
    </DashboardShell>
  )
}
