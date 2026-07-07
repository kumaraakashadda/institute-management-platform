'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge, EmptyState, Spinner, Input, Button } from '@/components/ui'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { statusBadge } from '@/lib/utils/helpers'
const INR=(n:number)=>'₹'+n.toLocaleString('en-IN')

const DEMO_RESULTS = [
  {student_id:'STU000001',full_name:'Rahul Verma',phone:'9876543210',centre:'Delhi Rohini',batch:'JEE-2026-A',course:'JEE Advanced',status:'Active',fee_pending:50000,fee_paid:90000,payment_status:'Partial'},
  {student_id:'STU000002',full_name:'Priya Sharma',phone:'9876543211',centre:'Delhi Rohini',batch:'NEET-2025-B',course:'NEET',status:'Active',fee_pending:0,fee_paid:95000,payment_status:'Paid'},
  {student_id:'STU000003',full_name:'Arjun Mehta',phone:'9876543212',centre:'Delhi Rohini',batch:'JEE-2026-A',course:'JEE Advanced',status:'Active',fee_pending:140000,fee_paid:10000,payment_status:'Pending'},
]

export default function StudentSearchPage() {
  const [search,setSearch]=useState(''); const [query,setQuery]=useState('')
  const {data,isLoading} = useQuery({
    queryKey:['studentSearch',query], queryFn:()=>gasGet<typeof DEMO_RESULTS>('searchStudents',{query}),
    enabled:!!query&&!IS_DEMO, retry:false
  })
  const results = data??(IS_DEMO&&query?DEMO_RESULTS.filter(s=>s.full_name.toLowerCase().includes(query.toLowerCase())||s.phone.includes(query)||s.student_id.includes(query)):[])

  return (
    <DashboardShell title="Student Search">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">🔍 Student Search</h1>
        <form onSubmit={e=>{e.preventDefault();setQuery(search)}} className="flex gap-2">
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, or student ID…" className="flex-1"/>
          <Button type="submit">Search</Button>
        </form>
        {!query&&<EmptyState icon="🔍" title="Search for students" message="Enter name, phone number, or student ID to find a student."/>}
        {isLoading&&<div className="flex justify-center py-8"><Spinner/></div>}
        {query&&results.length===0&&!isLoading&&<EmptyState icon="🔍" title="No students found" message={`No results for "${query}". Try a different search term.`}/>}
        <div className="space-y-3">
          {results.map(s=>(
            <Card key={s.student_id}>
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="font-bold text-gray-900 dark:text-white">{s.full_name}</p>
                      <Badge variant={s.status==='Active'?'success':'default'}>{s.status}</Badge>
                      <Badge variant={statusBadge(s.payment_status)}>{s.payment_status}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 font-mono">{s.student_id}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{s.phone} · {s.centre} · {s.batch} · {s.course}</p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right text-xs">
                      <p className="font-bold text-emerald-600">{INR(s.fee_paid)} paid</p>
                      {s.fee_pending>0&&<p className="text-red-500">{INR(s.fee_pending)} pending</p>}
                    </div>
                    <Link href={`/dashboard/fees/student?id=${s.student_id}`}><button className="text-xs text-blue-600 hover:underline font-medium">Fee Profile →</button></Link>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
        {results.length>0&&<p className="text-xs text-gray-400 text-center">{results.length} result{results.length>1?'s':''} found</p>}
      </div>
    </DashboardShell>
  )
}
