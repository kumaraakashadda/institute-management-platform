'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Input, Select, StatCard, Spinner, EmptyState } from '@/components/ui'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { fmtDate, statusBadge } from '@/lib/utils/helpers'

interface Admission {
  Admission_ID: string; Full_Name: string; Phone: string; Email: string
  Centre: string; Course: string; Batch: string; Target_Year: string
  Segment: string; Counsellor: string; Admission_Date: string
  Registration_Fee_Paid: number; Status: string
}

const DEMO_ADMISSIONS: Admission[] = [
  { Admission_ID:'ADM000001', Full_Name:'Rahul Sharma', Phone:'9876543210', Email:'rahul@email.com', Centre:'Delhi Rohini', Course:'JEE Advanced', Batch:'JEE-2026-A', Target_Year:'2026', Segment:'Classroom', Counsellor:'Priya Mehta', Admission_Date:'2024-04-01', Registration_Fee_Paid:1000, Status:'Active' },
  { Admission_ID:'ADM000002', Full_Name:'Priya Singh', Phone:'9876543211', Email:'priya@email.com', Centre:'Delhi Dwarka', Course:'NEET', Batch:'NEET-2026-B', Target_Year:'2026', Segment:'Online', Counsellor:'Raj Kumar', Admission_Date:'2024-04-05', Registration_Fee_Paid:1000, Status:'Active' },
  { Admission_ID:'ADM000003', Full_Name:'Arjun Kumar', Phone:'9876543212', Email:'arjun@email.com', Centre:'Delhi Rohini', Course:'JEE Advanced', Batch:'JEE-2026-A', Target_Year:'2026', Segment:'Classroom', Counsellor:'Priya Mehta', Admission_Date:'2024-04-10', Registration_Fee_Paid:0, Status:'Pending' },
  { Admission_ID:'ADM000004', Full_Name:'Sneha Patel', Phone:'9876543213', Email:'sneha@email.com', Centre:'Noida Sec18', Course:'Foundation', Batch:'FND-2025-A', Target_Year:'2025', Segment:'Classroom', Counsellor:'Anita Roy', Admission_Date:'2024-04-12', Registration_Fee_Paid:1000, Status:'Active' },
  { Admission_ID:'ADM000005', Full_Name:'Vikram Yadav', Phone:'9876543214', Email:'vikram@email.com', Centre:'Gurgaon', Course:'NEET', Batch:'NEET-2026-A', Target_Year:'2026', Segment:'Online', Counsellor:'Raj Kumar', Admission_Date:'2024-04-15', Registration_Fee_Paid:1000, Status:'Active' },
  { Admission_ID:'ADM000006', Full_Name:'Meera Gupta', Phone:'9876543215', Email:'meera@email.com', Centre:'Delhi Rohini', Course:'JEE Advanced', Batch:'JEE-2027-A', Target_Year:'2027', Segment:'Classroom', Counsellor:'Priya Mehta', Admission_Date:'2024-04-20', Registration_Fee_Paid:0, Status:'Inactive' },
]

export default function AdmissionsPage() {
  const [search, setSearch] = useState('')
  const [filterCentre, setFilterCentre] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterCourse, setFilterCourse] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admissions'],
    queryFn: () => gasGet<Admission[]>('listMasterData', { table: 'Admission_Master' }),
    enabled: !IS_DEMO,
  })

  const admissions = (data ?? DEMO_ADMISSIONS).filter(a => {
    const q = search.toLowerCase()
    if (search && !a.Full_Name.toLowerCase().includes(q) && !a.Phone.includes(q) && !a.Admission_ID.toLowerCase().includes(q) && !a.Email.toLowerCase().includes(q)) return false
    if (filterCentre && a.Centre !== filterCentre) return false
    if (filterStatus && a.Status !== filterStatus) return false
    if (filterCourse && a.Course !== filterCourse) return false
    return true
  })

  const centres = [...new Set(DEMO_ADMISSIONS.map(a => a.Centre))]
  const courses  = [...new Set(DEMO_ADMISSIONS.map(a => a.Course))]
  const total = admissions.length
  const active = admissions.filter(a => a.Status === 'Active').length
  const pending = admissions.filter(a => a.Status === 'Pending').length

  return (
    <DashboardShell title="Admissions">
      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📋 Admissions</h1>
            <p className="text-sm text-gray-500 mt-0.5">All student admissions across centres</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/admissions/new">
              <Button>+ New Admission</Button>
            </Link>
            <Link href="/dashboard/admin/bulk-upload">
              <Button variant="secondary">📤 Bulk Upload</Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Admissions" value={String(total)}   colour="blue"   icon="📋" />
          <StatCard label="Active"           value={String(active)}  colour="green"  icon="✅" />
          <StatCard label="Pending"          value={String(pending)} colour="orange" icon="⏳" />
        </div>

        {/* Filters */}
        <Card>
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Input placeholder="Search name, phone, ID, email…" value={search} onChange={e => setSearch(e.target.value)} />
              <Select value={filterCentre} onChange={e => setFilterCentre(e.target.value)}>
                <option value="">All Centres</option>
                {centres.map(c => <option key={c}>{c}</option>)}
              </Select>
              <Select value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                <option value="">All Courses</option>
                {courses.map(c => <option key={c}>{c}</option>)}
              </Select>
              <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="">All Statuses</option>
                <option>Active</option><option>Pending</option><option>Inactive</option>
              </Select>
            </div>
          </CardBody>
        </Card>

        {/* Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">Admission Records</h2>
              <span className="text-xs text-gray-400">{admissions.length} results</span>
            </div>
          </CardHeader>
          {isLoading && <div className="flex justify-center py-12"><Spinner size="lg" /></div>}
          {!isLoading && admissions.length === 0 && (
            <EmptyState icon="🔍" title="No admissions found" message="Try adjusting your search filters." />
          )}
          {!isLoading && admissions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50">
                    {['Admission ID','Student Name','Phone','Centre','Course','Batch','Counsellor','Date','Reg. Fee','Status','Actions'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {admissions.map(a => (
                    <tr key={a.Admission_ID} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-blue-600 dark:text-blue-400">{a.Admission_ID}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900 dark:text-white">{a.Full_Name}</p>
                        <p className="text-[11px] text-gray-400">{a.Email}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs">{a.Phone}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{a.Centre}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{a.Course}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{a.Batch}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs">{a.Counsellor}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{fmtDate(a.Admission_Date)}</td>
                      <td className="px-4 py-3 text-xs">
                        <Badge variant={a.Registration_Fee_Paid > 0 ? 'success' : 'danger'}>
                          {a.Registration_Fee_Paid > 0 ? `₹${a.Registration_Fee_Paid}` : 'Unpaid'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusBadge(a.Status)}>{a.Status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <Link href={`/dashboard/students/${a.Admission_ID}`}>
                            <Button size="sm" variant="secondary">View</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </DashboardShell>
  )
}
