'use client'
import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Input, Select, Modal, Alert } from '@/components/ui'
import { gasPost, gasGet, IS_DEMO } from '@/lib/gasClient'
import { fmtDate } from '@/lib/utils/helpers'
import { useAuthStore } from '@/store/authStore'

interface Announcement {
  Announcement_ID: string; Title: string; Body: string; Target_Role: string
  Centre: string; Priority: 'Normal'|'Important'|'Urgent'; Created_By: string
  Created_At: string; Expiry_Date: string; Status: string
}

const DEMO: Announcement[] = [
  { Announcement_ID:'ANN001', Title:'Holiday Notice — Republic Day', Body:'The institute will remain closed on 26th January 2026 on account of Republic Day. All scheduled classes stand cancelled. Compensatory classes will be held on Saturday 31st January.', Target_Role:'All', Centre:'All Centres', Priority:'Important', Created_By:'Super Admin', Created_At:new Date(Date.now()-86400000*2).toISOString(), Expiry_Date:'2026-01-27', Status:'Active' },
  { Announcement_ID:'ANN002', Title:'JEE Advanced Mock Test — Schedule', Body:'Mock Test Series 4 for JEE Advanced batch will be held on 15th January 2026 from 9:00 AM to 12:00 PM. All JEE-2026-A and JEE-2026-B students must bring their admit card and stationery.', Target_Role:'STUDENT', Centre:'Delhi Rohini', Priority:'Important', Created_By:'Centre Manager', Created_At:new Date(Date.now()-86400000*4).toISOString(), Expiry_Date:'2026-01-16', Status:'Active' },
  { Announcement_ID:'ANN003', Title:'Fee Due Reminder — December Installment', Body:'This is a reminder that December 2025 installments are due on 15th December. Students with pending payments should clear dues to avoid late fees. Contact your counsellor for any queries.', Target_Role:'PARENT', Centre:'All Centres', Priority:'Urgent', Created_By:'Finance Team', Created_At:new Date(Date.now()-86400000*1).toISOString(), Expiry_Date:'2025-12-16', Status:'Active' },
  { Announcement_ID:'ANN004', Title:'Attendance Policy Update', Body:'The minimum attendance requirement has been updated to 80% effective January 2026. Students below this threshold will not be allowed to appear in board mock tests. Please ensure regular attendance.', Target_Role:'All', Centre:'All Centres', Priority:'Urgent', Created_By:'Super Admin', Created_At:new Date(Date.now()-86400000*7).toISOString(), Expiry_Date:'2026-03-31', Status:'Active' },
  { Announcement_ID:'ANN005', Title:'Parent-Teacher Meeting — Dec 20', Body:'A parent-teacher meeting is scheduled on 20th December 2025 at 10:00 AM. Parents of students with attendance below 75% must attend. Centre Managers have the full defaulter list.', Target_Role:'PARENT', Centre:'All Centres', Priority:'Normal', Created_By:'Centre Manager', Created_At:new Date(Date.now()-86400000*3).toISOString(), Expiry_Date:'2025-12-21', Status:'Active' },
  { Announcement_ID:'ANN006', Title:'New Batch Starting — Foundation 2028', Body:'Admissions open for Foundation batch targeting 2028. Early bird discount of ₹10,000 available for admissions before 31st December. Contact counsellors for details.', Target_Role:'COUNSELLOR', Centre:'All Centres', Priority:'Normal', Created_By:'Super Admin', Created_At:new Date(Date.now()-86400000*5).toISOString(), Expiry_Date:'2025-12-31', Status:'Active' },
]

const PRIORITY_V: Record<string, 'danger'|'warning'|'info'> = { Urgent:'danger', Important:'warning', Normal:'info' }
const ROLE_LABELS = ['All','STUDENT','PARENT','TEACHER','COUNSELLOR','CENTRE_MANAGER','SUPER_ADMIN']

export default function AnnouncementsPage() {
  const { role } = useAuthStore()
  const qc = useQueryClient()
  const isAdmin = role === 'SUPER_ADMIN' || role === 'CENTRE_MANAGER'
  const [showNew, setShowNew] = useState(false)
  const [filterPriority, setFilterPriority] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [form, setForm] = useState({ Title:'', Body:'', Target_Role:'All', Centre:'All Centres', Target_Batch:'All Batches', Priority:'Normal', Expiry_Date:'' })
  const set = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setForm(f=>({...f,[k]:e.target.value}))

  // Demo batches per centre
  const CENTRE_BATCHES: Record<string,string[]> = {
    'All Centres':  [],
    'Delhi Rohini': ['All Batches','JEE-2026-A','JEE-2026-B','JEE-2027-A','NEET-2026-A','NEET-2026-B'],
    'Delhi Dwarka': ['All Batches','JEE-2026-C','NEET-2026-C','FND-2025-A'],
    'Noida Sec18':  ['All Batches','JEE-2026-D','NEET-2026-D'],
    'Gurgaon':      ['All Batches','JEE-2026-E','NEET-2026-E'],
  }
  const batchOptions = CENTRE_BATCHES[form.Centre] ?? []

  const { data } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => gasGet<Announcement[]>('listAnnouncements', {}),
    enabled: !IS_DEMO,
  })
  const all = data ?? DEMO

  const filtered = all.filter(a => {
    if (filterPriority && a.Priority !== filterPriority) return false
    if (filterRole && a.Target_Role !== filterRole && a.Target_Role !== 'All') return false
    return true
  })

  const { mutateAsync: create, isPending } = useMutation({
    mutationFn: () => IS_DEMO ? Promise.resolve() : gasPost('createAnnouncement', { fields: form }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); setShowNew(false); setForm({ Title:'', Body:'', Target_Role:'All', Centre:'All Centres', Target_Batch:'All Batches', Priority:'Normal', Expiry_Date:'' }) },
  })

  return (
    <DashboardShell title="Announcements">
      <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">

        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📢 Announcements</h1>
            <p className="text-sm text-gray-500 mt-0.5">Institute-wide notices, circulars, and alerts</p>
          </div>
          {isAdmin && <Button onClick={() => setShowNew(true)}>+ New Announcement</Button>}
        </div>

        {IS_DEMO && isAdmin && <Alert variant="info">Demo mode — announcements are read-only. Connect backend to create real ones.</Alert>}

        {/* Filters */}
        <div className="flex gap-3 flex-wrap">
          <Select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="w-36">
            <option value="">All Priorities</option>
            <option>Urgent</option><option>Important</option><option>Normal</option>
          </Select>
          <Select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="w-44">
            <option value="">All Audiences</option>
            {ROLE_LABELS.map(r => <option key={r}>{r}</option>)}
          </Select>
          <div className="ml-auto text-xs text-gray-400 flex items-center">{filtered.length} announcements</div>
        </div>

        {/* Announcement cards */}
        <div className="space-y-3">
          {filtered.map(a => {
            const isExpired = a.Expiry_Date && new Date(a.Expiry_Date) < new Date()
            return (
              <Card key={a.Announcement_ID} className={isExpired ? 'opacity-60' : ''}>
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      a.Priority==='Urgent' ? 'bg-red-100 dark:bg-red-900/30' :
                      a.Priority==='Important' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      {a.Priority==='Urgent' ? '🚨' : a.Priority==='Important' ? '📌' : '📢'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start gap-2 mb-1">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight flex-1">{a.Title}</h3>
                        <div className="flex gap-1.5 shrink-0">
                          <Badge variant={PRIORITY_V[a.Priority]}>{a.Priority}</Badge>
                          <Badge variant="default">{a.Target_Role === 'All' ? '👥 Everyone' : a.Target_Role}</Badge>
                          {isExpired && <Badge variant="default">Expired</Badge>}
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{a.Body}</p>
                      <div className="flex flex-wrap gap-x-4 gap-y-0 mt-2 text-[11px] text-gray-400">
                        <span>📍 {a.Centre}</span>
                        {(a as {Target_Batch?:string}).Target_Batch && (a as {Target_Batch?:string}).Target_Batch !== 'All Batches' && <span>📚 {(a as {Target_Batch?:string}).Target_Batch}</span>}
                        <span>✍️ {a.Created_By}</span>
                        <span>🕐 {fmtDate(a.Created_At)}</span>
                        {a.Expiry_Date && <span>⏳ Expires {fmtDate(a.Expiry_Date)}</span>}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="text-5xl mb-3">📢</div>
            <h3 className="font-bold text-gray-700 dark:text-gray-300">No announcements</h3>
            <p className="text-sm text-gray-400 mt-1">Check back later for updates from the institute.</p>
          </div>
        )}

        {/* New announcement modal */}
        {showNew && (
          <Modal title="📢 New Announcement" onClose={() => setShowNew(false)}>
            <div className="space-y-4">
              <Input label="Title *" value={form.Title} onChange={set('Title')} placeholder="Announcement title" />
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Body *</label>
                <textarea value={form.Body} onChange={set('Body')} rows={5} placeholder="Full announcement text…"
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Audience" value={form.Target_Role} onChange={set('Target_Role')}>
                  {ROLE_LABELS.map(r => <option key={r}>{r}</option>)}
                </Select>
                <Select label="Priority" value={form.Priority} onChange={set('Priority')}>
                  <option>Normal</option><option>Important</option><option>Urgent</option>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Centre" value={form.Centre} onChange={e => { set('Centre')(e); setForm(f=>({...f,Target_Batch:'All Batches'})) }}>
                  <option>All Centres</option>
                  {['Delhi Rohini','Delhi Dwarka','Noida Sec18','Gurgaon'].map(c => <option key={c}>{c}</option>)}
                </Select>
                <Select label="Target Batch" value={form.Target_Batch} onChange={set('Target_Batch')} disabled={form.Centre==='All Centres'}>
                  {batchOptions.length > 0
                    ? batchOptions.map(b => <option key={b}>{b}</option>)
                    : <option>Select centre first</option>}
                </Select>
                <Input label="Expiry Date" type="date" value={form.Expiry_Date} onChange={set('Expiry_Date')} />
              </div>
              {IS_DEMO && <Alert variant="info">Demo mode — this won&apos;t be saved.</Alert>}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={() => create()} disabled={isPending || !form.Title || !form.Body}>
                  {isPending ? 'Posting…' : '📢 Post Announcement'}
                </Button>
                <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </DashboardShell>
  )
}
