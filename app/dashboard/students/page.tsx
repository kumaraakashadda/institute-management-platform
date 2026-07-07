'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Input, Select, StatCard, Spinner, EmptyState } from '@/components/ui'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { fmtDate, statusBadge, fmt } from '@/lib/utils/helpers'

interface Student {
  Student_ID: string; Full_Name: string; Phone: string; Email: string; DOB: string; Gender: string
  Centre: string; Course: string; Batch: string; Target_Year: string; Segment: string
  Admission_Date: string; Status: string; Attendance_Pct?: number
  Fee_Paid?: number; Fee_Pending?: number; Payment_Status?: string
}

const DEMO: Student[] = [
  { Student_ID:'STU000001', Full_Name:'Rahul Sharma',    Phone:'9876543210', Email:'rahul@email.com',  DOB:'2006-05-12', Gender:'Male',   Centre:'Delhi Rohini', Course:'JEE Advanced', Batch:'JEE-2026-A', Target_Year:'2026', Segment:'Classroom', Admission_Date:'2024-04-01', Status:'Active',   Attendance_Pct:84, Fee_Paid:90000,  Fee_Pending:60000,  Payment_Status:'Partial' },
  { Student_ID:'STU000002', Full_Name:'Priya Singh',     Phone:'9876543211', Email:'priya@email.com',  DOB:'2007-03-22', Gender:'Female', Centre:'Delhi Dwarka', Course:'NEET',         Batch:'NEET-2026-B', Target_Year:'2026', Segment:'Online',    Admission_Date:'2024-04-05', Status:'Active',   Attendance_Pct:91, Fee_Paid:95000,  Fee_Pending:0,      Payment_Status:'Paid' },
  { Student_ID:'STU000003', Full_Name:'Arjun Kumar',     Phone:'9876543212', Email:'arjun@email.com',  DOB:'2006-01-15', Gender:'Male',   Centre:'Delhi Rohini', Course:'JEE Advanced', Batch:'JEE-2026-A', Target_Year:'2026', Segment:'Classroom', Admission_Date:'2024-04-10', Status:'Active',   Attendance_Pct:62, Fee_Paid:10000,  Fee_Pending:140000, Payment_Status:'Pending' },
  { Student_ID:'STU000004', Full_Name:'Sneha Patel',     Phone:'9876543213', Email:'sneha@email.com',  DOB:'2008-07-30', Gender:'Female', Centre:'Noida Sec18',  Course:'Foundation',   Batch:'FND-2025-A', Target_Year:'2025', Segment:'Classroom', Admission_Date:'2024-04-12', Status:'Active',   Attendance_Pct:78, Fee_Paid:45000,  Fee_Pending:15000,  Payment_Status:'Partial' },
  { Student_ID:'STU000005', Full_Name:'Vikram Yadav',    Phone:'9876543214', Email:'vikram@email.com', DOB:'2006-11-08', Gender:'Male',   Centre:'Gurgaon',      Course:'NEET',         Batch:'NEET-2026-A', Target_Year:'2026', Segment:'Online',    Admission_Date:'2024-04-15', Status:'Active',   Attendance_Pct:55, Fee_Paid:80000,  Fee_Pending:0,      Payment_Status:'Paid' },
  { Student_ID:'STU000006', Full_Name:'Meera Gupta',     Phone:'9876543215', Email:'meera@email.com',  DOB:'2007-09-14', Gender:'Female', Centre:'Delhi Rohini', Course:'JEE Advanced', Batch:'JEE-2027-A', Target_Year:'2027', Segment:'Classroom', Admission_Date:'2024-04-20', Status:'Inactive', Attendance_Pct:0,  Fee_Paid:5000,   Fee_Pending:115000, Payment_Status:'Pending' },
  { Student_ID:'STU000007', Full_Name:'Rohan Verma',     Phone:'9876543216', Email:'rohan@email.com',  DOB:'2005-12-02', Gender:'Male',   Centre:'Delhi Rohini', Course:'JEE Advanced', Batch:'JEE-2026-A', Target_Year:'2026', Segment:'Classroom', Admission_Date:'2024-03-15', Status:'Active',   Attendance_Pct:88, Fee_Paid:120000, Fee_Pending:0,      Payment_Status:'Paid' },
  { Student_ID:'STU000008', Full_Name:'Anjali Sharma',   Phone:'9876543217', Email:'anjali@email.com', DOB:'2007-06-18', Gender:'Female', Centre:'Delhi Dwarka', Course:'NEET',         Batch:'NEET-2026-B', Target_Year:'2026', Segment:'Online',    Admission_Date:'2024-05-01', Status:'Active',   Attendance_Pct:73, Fee_Paid:60000,  Fee_Pending:35000,  Payment_Status:'Partial' },
]

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const [centre, setCentre] = useState('')
  const [course, setCourse] = useState('')
  const [status, setStatus] = useState('')
  const [payStatus, setPayStatus] = useState('')
  const [sortBy, setSortBy] = useState<'name'|'attendance'|'pending'>('name')

  const { data, isLoading } = useQuery({
    queryKey: ['students-all'],
    queryFn: () => gasGet<Student[]>('listStudents', {}),
    enabled: !IS_DEMO,
  })
  const all = data ?? DEMO

  const filtered = all
    .filter(s => {
      const q = search.toLowerCase()
      if (search && !s.Full_Name.toLowerCase().includes(q) && !s.Phone.includes(q) && !s.Student_ID.toLowerCase().includes(q)) return false
      if (centre && s.Centre !== centre) return false
      if (course && s.Course !== course) return false
      if (status && s.Status !== status) return false
      if (payStatus && s.Payment_Status !== payStatus) return false
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'attendance') return (b.Attendance_Pct ?? 0) - (a.Attendance_Pct ?? 0)
      if (sortBy === 'pending')    return (b.Fee_Pending ?? 0) - (a.Fee_Pending ?? 0)
      return a.Full_Name.localeCompare(b.Full_Name)
    })

  const centres  = [...new Set(all.map(s => s.Centre))]
  const courses  = [...new Set(all.map(s => s.Course))]
  const active   = all.filter(s => s.Status === 'Active').length
  const defaulters = all.filter(s => (s.Attendance_Pct ?? 100) < 75 && s.Status === 'Active').length
  const feeDefault = all.filter(s => s.Payment_Status === 'Pending' || s.Payment_Status === 'Partial').length

  return (
    <DashboardShell title="Students">
      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">👥 Student Directory</h1>
            <p className="text-sm text-gray-500 mt-0.5">All students across centres</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/admissions/new"><Button>+ Admit Student</Button></Link>
            <Link href="/dashboard/admin/bulk-upload"><Button variant="secondary">📤 Bulk</Button></Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Students"   value={String(all.length)} colour="blue"   icon="🎓" />
          <StatCard label="Active"           value={String(active)}     colour="green"  icon="✅" />
          <StatCard label="Attendance Risk"  value={String(defaulters)} colour="orange" icon="⚠️" sub="Below 75%" />
          <StatCard label="Fee Defaulters"   value={String(feeDefault)} colour="red"    icon="💰" />
        </div>

        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <Input placeholder="Name / Phone / ID" value={search} onChange={e => setSearch(e.target.value)} className="lg:col-span-2" />
              <Select value={centre} onChange={e => setCentre(e.target.value)}>
                <option value="">All Centres</option>
                {centres.map(c => <option key={c}>{c}</option>)}
              </Select>
              <Select value={course} onChange={e => setCourse(e.target.value)}>
                <option value="">All Courses</option>
                {courses.map(c => <option key={c}>{c}</option>)}
              </Select>
              <Select value={status} onChange={e => setStatus(e.target.value)}>
                <option value="">All Status</option>
                <option>Active</option><option>Inactive</option>
              </Select>
              <Select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}>
                <option value="name">Sort: Name</option>
                <option value="attendance">Sort: Attendance ↑</option>
                <option value="pending">Sort: Fee Pending ↓</option>
              </Select>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">Students ({filtered.length})</h2>
            </div>
          </CardHeader>
          {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
          {!isLoading && filtered.length === 0 && <EmptyState icon="🔍" title="No students found" message="Try adjusting filters." />}
          {!isLoading && filtered.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {['Student','ID','Centre / Batch','Target','Attendance','Fee Status',''].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {filtered.map(s => {
                    const att = s.Attendance_Pct ?? 0
                    const attColour = att >= 75 ? 'text-emerald-600' : att >= 60 ? 'text-amber-600' : 'text-red-600'
                    return (
                      <tr key={s.Student_ID} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white text-xs font-black shrink-0"
                              style={{ background: s.Status === 'Active' ? 'linear-gradient(135deg,#2563eb,#4f46e5)' : '#9ca3af' }}>
                              {s.Full_Name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 dark:text-white">{s.Full_Name}</p>
                              <p className="text-[11px] text-gray-400">{s.Phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{s.Student_ID}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{s.Centre}</p>
                          <p className="text-[11px] text-gray-400">{s.Batch}</p>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-xs text-gray-600 dark:text-gray-400">{s.Course}</p>
                          <p className="text-[11px] text-gray-400">{s.Target_Year} · {s.Segment}</p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${att >= 75 ? 'bg-emerald-500' : att >= 60 ? 'bg-amber-400' : 'bg-red-500'}`} style={{ width: `${att}%` }} />
                            </div>
                            <span className={`text-xs font-bold ${attColour}`}>{att}%</span>
                          </div>
                          {att < 75 && att > 0 && <p className="text-[10px] text-red-500 mt-0.5">⚠ Below threshold</p>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge(s.Payment_Status ?? 'Pending')}>{s.Payment_Status ?? '—'}</Badge>
                          {(s.Fee_Pending ?? 0) > 0 && <p className="text-[11px] text-red-500 mt-0.5">{fmt(s.Fee_Pending)} due</p>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Link href={`/dashboard/students/${s.Student_ID}`}>
                              <Button size="sm" variant="secondary">Profile</Button>
                            </Link>
                            <Link href={`/dashboard/fees/student?id=${s.Student_ID}`}>
                              <Button size="sm" variant="ghost">Fees</Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
