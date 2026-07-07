'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, StatCard, Alert, Spinner } from '@/components/ui'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { fmt, fmtDate, statusBadge } from '@/lib/utils/helpers'

interface StudentDetail {
  Student_ID: string; Admission_ID: string; Full_Name: string; DOB: string; Gender: string
  Phone: string; Email: string; Address: string; Centre: string; Course: string
  Batch: string; Target_Year: string; Segment: string; Counsellor: string
  Admission_Date: string; Status: string; QR_Identity: string; Portal_Username: string
  Parent_Name: string; Parent_Phone: string
  Attendance_Pct: number; Present: number; Absent: number; Late: number; Total: number
  Fee_Net: number; Fee_Paid: number; Fee_Pending: number; Payment_Status: string
  Next_Due?: string; Next_Due_Amount?: number
}

interface Installment { Installment_ID: string; Installment_Number: number; Due_Date: string; Installment_Amount: number; Paid_Amount: number; Pending_Amount: number; Status: string; Remarks: string }
interface AttLog { date: string; subject: string; status: 'Present'|'Absent'|'Late'; session_id: string }

const DEMO_STUDENT: StudentDetail = {
  Student_ID:'STU000001', Admission_ID:'ADM000001', Full_Name:'Rahul Sharma', DOB:'2006-05-12',
  Gender:'Male', Phone:'9876543210', Email:'rahul@email.com', Address:'A-42 Rohini Sector 7, Delhi',
  Centre:'Delhi Rohini', Course:'JEE Advanced', Batch:'JEE-2026-A', Target_Year:'2026',
  Segment:'Classroom', Counsellor:'Priya Mehta', Admission_Date:'2024-04-01', Status:'Active',
  QR_Identity:'QR-STU000001-abc123', Portal_Username:'9876543210',
  Parent_Name:'Suresh Sharma', Parent_Phone:'9876543200',
  Attendance_Pct:84, Present:84, Absent:16, Late:3, Total:103,
  Fee_Net:150000, Fee_Paid:90000, Fee_Pending:60000, Payment_Status:'Partial',
  Next_Due:'2025-12-15', Next_Due_Amount:30000,
}

const DEMO_INSTS: Installment[] = [
  { Installment_ID:'INS001', Installment_Number:1, Due_Date:'2024-05-01', Installment_Amount:30000, Paid_Amount:30000, Pending_Amount:0,     Status:'Paid',    Remarks:'Paid via UPI' },
  { Installment_ID:'INS002', Installment_Number:2, Due_Date:'2024-08-01', Installment_Amount:30000, Paid_Amount:30000, Pending_Amount:0,     Status:'Paid',    Remarks:'' },
  { Installment_ID:'INS003', Installment_Number:3, Due_Date:'2024-11-01', Installment_Amount:30000, Paid_Amount:30000, Pending_Amount:0,     Status:'Paid',    Remarks:'Partial → balance redistributed' },
  { Installment_ID:'INS004', Installment_Number:4, Due_Date:'2025-12-15', Installment_Amount:30000, Paid_Amount:0,    Pending_Amount:30000, Status:'Pending', Remarks:'' },
  { Installment_ID:'INS005', Installment_Number:5, Due_Date:'2026-02-01', Installment_Amount:30000, Paid_Amount:0,    Pending_Amount:30000, Status:'Pending', Remarks:'' },
]

const DEMO_ATT: AttLog[] = Array.from({length:20},(_,i)=>{
  const d = new Date(); d.setDate(d.getDate()-i*2)
  const statuses: ('Present'|'Absent'|'Late')[] = ['Present','Present','Present','Absent','Late','Present','Present']
  const subjs = ['Physics','Maths','Chemistry']
  return { date:d.toISOString().slice(0,10), subject:subjs[i%3], status:statuses[i%statuses.length], session_id:`SES00000${i+1}` }
})

// SVG QR placeholder rendered inline
function MiniQr({ value }: { value: string }) {
  const [svg, setSvg] = useState<string|null>(null)
  useEffect(() => {
    import('qrcode').then(QR => QR.toString(value, { type:'svg', width:96, margin:1,
      color:{ dark:'#111827', light:'#ffffff' } })).then(setSvg).catch(()=>{})
  }, [value])
  if (!svg) return <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
  return <div className="w-24 h-24 rounded-lg overflow-hidden [&_svg]:block [&_svg]:w-full [&_svg]:h-auto" dangerouslySetInnerHTML={{ __html: svg }} />
}

export default function StudentProfilePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<'overview'|'attendance'|'fees'|'timeline'>('overview')

  const { data: s, isLoading } = useQuery({
    queryKey: ['student', id],
    queryFn: () => gasGet<StudentDetail>('getStudentProfile', { student_id: id }),
    enabled: !IS_DEMO && !!id,
  })
  const student = s ?? (IS_DEMO ? DEMO_STUDENT : null)

  const { data: insts } = useQuery({
    queryKey: ['student-insts', id],
    queryFn: () => gasGet<Installment[]>('listInstallments', { student_id: id }),
    enabled: !IS_DEMO && !!id,
  })
  const installments = insts ?? (IS_DEMO ? DEMO_INSTS : [])

  const { data: attLog } = useQuery({
    queryKey: ['student-att', id],
    queryFn: () => gasGet<AttLog[]>('getStudentAttendanceLog', { student_id: id }),
    enabled: !IS_DEMO && !!id,
  })
  const attendance = attLog ?? (IS_DEMO ? DEMO_ATT : [])

  if (isLoading) return <DashboardShell><div className="flex justify-center py-24"><Spinner size="lg" /></div></DashboardShell>
  if (!student)  return <DashboardShell><div className="p-8 text-center text-gray-500">Student not found.</div></DashboardShell>

  const att = student.Attendance_Pct
  const TABS = ['overview','attendance','fees','timeline'] as const

  return (
    <DashboardShell title="Student Profile">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

        {/* Header card */}
        <Card>
          <CardBody>
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="flex items-start gap-4 flex-1">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0"
                  style={{ background:'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                  {student.Full_Name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-xl font-black text-gray-900 dark:text-white">{student.Full_Name}</h1>
                    <Badge variant={student.Status==='Active'?'success':'default'}>{student.Status}</Badge>
                    <Badge variant={statusBadge(student.Payment_Status)}>{student.Payment_Status}</Badge>
                  </div>
                  <p className="text-sm font-mono text-blue-600 dark:text-blue-400">{student.Student_ID}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                    <span>📱 {student.Phone}</span>
                    <span>✉️ {student.Email || '—'}</span>
                    <span>📍 {student.Centre}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">{student.Course}</span>
                    <span className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">{student.Batch}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full font-medium">{student.Target_Year} · {student.Segment}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <MiniQr value={`STU:${student.Student_ID}:${student.QR_Identity}`} />
                <p className="text-[10px] text-gray-400">QR Identity</p>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button size="sm" onClick={() => router.push(`/dashboard/fees/student?id=${student.Student_ID}`)}>💰 Fee Profile</Button>
              <Button size="sm" variant="secondary" onClick={() => router.push(`/dashboard/attendance/corrections`)}>✏️ Corrections</Button>
              <Button size="sm" variant="secondary" onClick={() => window.print()}>🖨 Print</Button>
            </div>
          </CardBody>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Attendance"    value={`${att}%`}               colour={att>=75?'green':att>=60?'amber':'red'}  icon="📊" sub={`${student.Present}/${student.Total} classes`} />
          <StatCard label="Fee Paid"      value={fmt(student.Fee_Paid)}    colour="blue"   icon="✅" />
          <StatCard label="Fee Pending"   value={fmt(student.Fee_Pending)} colour={student.Fee_Pending>0?'red':'green'} icon="💰" />
          <StatCard label="Admission"     value={fmtDate(student.Admission_Date)} colour="purple" icon="📋" />
        </div>

        {att < 75 && <Alert variant="warning">⚠️ Attendance is below the 75% threshold ({att}%). Student may be barred from exams.</Alert>}
        {student.Fee_Pending > 0 && student.Next_Due && (
          <Alert variant="info">💰 Next installment of {fmt(student.Next_Due_Amount)} is due on {fmtDate(student.Next_Due)}.</Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${tab===t ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Personal Info</h2></CardHeader>
              <CardBody>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Full Name', student.Full_Name], ['Student ID', student.Student_ID],
                    ['Date of Birth', fmtDate(student.DOB)], ['Gender', student.Gender],
                    ['Phone', student.Phone], ['Email', student.Email || '—'],
                    ['Address', student.Address || '—'], ['Portal Login', student.Portal_Username],
                  ].map(([l,v]) => (
                    <div key={l} className="flex gap-2">
                      <span className="text-gray-400 text-xs w-28 shrink-0 mt-0.5">{l}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-xs break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Academic Info</h2></CardHeader>
              <CardBody>
                <div className="space-y-2.5 text-sm">
                  {[
                    ['Centre', student.Centre], ['Course', student.Course],
                    ['Batch', student.Batch], ['Target Year', student.Target_Year],
                    ['Segment', student.Segment], ['Counsellor', student.Counsellor||'—'],
                    ['Admission Date', fmtDate(student.Admission_Date)], ['Admission ID', student.Admission_ID],
                  ].map(([l,v]) => (
                    <div key={l} className="flex gap-2">
                      <span className="text-gray-400 text-xs w-28 shrink-0 mt-0.5">{l}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Parent / Guardian</h2></CardHeader>
              <CardBody>
                <div className="space-y-2.5 text-sm">
                  {[['Parent Name', student.Parent_Name||'—'], ['Parent Phone', student.Parent_Phone||'—']].map(([l,v]) => (
                    <div key={l} className="flex gap-2">
                      <span className="text-gray-400 text-xs w-28 shrink-0">{l}</span>
                      <span className="font-medium text-gray-800 dark:text-gray-200 text-xs">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Attendance Summary</h2></CardHeader>
              <CardBody>
                <div className="space-y-3">
                  <div className="flex justify-between mb-1"><span className="text-sm font-bold text-gray-700 dark:text-gray-300">Overall</span><span className={`text-sm font-black ${att>=75?'text-emerald-600':att>=60?'text-amber-500':'text-red-500'}`}>{att}%</span></div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                    <div className={`h-3 rounded-full ${att>=75?'bg-emerald-500':att>=60?'bg-amber-400':'bg-red-500'}`} style={{width:`${att}%`}}/>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    {[['Present',student.Present,'text-emerald-600'],['Absent',student.Absent,'text-red-500'],['Late',student.Late,'text-amber-500']].map(([l,v,c])=>(
                      <div key={l as string} className="bg-gray-50 dark:bg-gray-800 rounded-xl p-2">
                        <p className={`text-xl font-black ${c}`}>{v}</p>
                        <p className="text-[10px] text-gray-400">{l}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* ATTENDANCE TAB */}
        {tab === 'attendance' && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Attendance Log (Last 20 Sessions)</h2></CardHeader>
            <div className="divide-y dark:divide-gray-800">
              {attendance.map((a,i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.subject}</p>
                    <p className="text-xs text-gray-400">{fmtDate(a.date)} · {a.session_id}</p>
                  </div>
                  <Badge variant={a.status==='Present'?'success':a.status==='Late'?'warning':'danger'}>{a.status}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* FEES TAB */}
        {tab === 'fees' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 p-4 text-center">
                <p className="text-2xl font-black text-blue-600">{fmt(student.Fee_Net)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Net Fee</p>
              </div>
              <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 p-4 text-center">
                <p className="text-2xl font-black text-emerald-600">{fmt(student.Fee_Paid)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Paid</p>
              </div>
              <div className="rounded-2xl bg-red-50 dark:bg-red-900/20 p-4 text-center">
                <p className="text-2xl font-black text-red-600">{fmt(student.Fee_Pending)}</p>
                <p className="text-xs text-gray-500 mt-0.5">Pending</p>
              </div>
            </div>
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Installment Schedule</h2></CardHeader>
              <div className="divide-y dark:divide-gray-800">
                {installments.map(inst => (
                  <div key={inst.Installment_ID} className="px-5 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">Installment #{inst.Installment_Number}</p>
                      <p className="text-xs text-gray-400">Due: {fmtDate(inst.Due_Date)}</p>
                      {inst.Remarks && <p className="text-[11px] text-gray-400 italic">{inst.Remarks}</p>}
                    </div>
                    <div className="text-right">
                      <Badge variant={statusBadge(inst.Status)}>{inst.Status}</Badge>
                      <p className="text-xs font-bold text-gray-900 dark:text-white mt-1">{fmt(inst.Installment_Amount)}</p>
                      {inst.Paid_Amount > 0 && inst.Status !== 'Paid' && <p className="text-[11px] text-emerald-600">{fmt(inst.Paid_Amount)} paid</p>}
                      {inst.Pending_Amount > 0 && <p className="text-[11px] text-red-500">{fmt(inst.Pending_Amount)} pending</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* TIMELINE TAB */}
        {tab === 'timeline' && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Student Journey Timeline</h2></CardHeader>
            <CardBody>
              <div className="relative pl-8 space-y-6">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200 dark:bg-gray-700" />
                {[
                  { icon:'🎉', label:'Admission', detail:`Admitted to ${student.Course} at ${student.Centre}`, date:fmtDate(student.Admission_Date), colour:'bg-blue-500' },
                  { icon:'👤', label:'Student Account Created', detail:`Login: ${student.Portal_Username} · ID: ${student.Student_ID}`, date:fmtDate(student.Admission_Date), colour:'bg-purple-500' },
                  { icon:'🪪', label:'QR Identity Generated', detail:student.QR_Identity, date:fmtDate(student.Admission_Date), colour:'bg-indigo-500' },
                  ...installments.filter(i=>i.Status==='Paid').map(i=>({ icon:'💰', label:`Installment #${i.Installment_Number} Paid`, detail:fmt(i.Paid_Amount)+' · '+i.Remarks, date:fmtDate(i.Due_Date), colour:'bg-emerald-500' })),
                  ...installments.filter(i=>i.Status!=='Paid').map(i=>({ icon:'⏳', label:`Installment #${i.Installment_Number} ${i.Status}`, detail:fmt(i.Installment_Amount)+' due '+fmtDate(i.Due_Date), date:fmtDate(i.Due_Date), colour:'bg-amber-400' })),
                ].sort((a,b)=>new Date(a.date).getTime()-new Date(b.date).getTime()).map((ev,i)=>(
                  <div key={i} className="flex items-start gap-3 relative">
                    <div className={`absolute -left-5 w-4 h-4 rounded-full ${ev.colour} flex items-center justify-center text-[8px] text-white border-2 border-white dark:border-gray-900 shrink-0`}>●</div>
                    <div className="flex-1 pb-2">
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{ev.icon} {ev.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{ev.detail}</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">{ev.date}</p>
                    </div>
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
