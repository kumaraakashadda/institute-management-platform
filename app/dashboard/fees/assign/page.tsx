'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Input, Alert, Spinner } from '@/components/ui'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

const DEMO_PLANS = [
  {Plan_ID:'FP001',Plan_Name:'JEE 2-Year',Course:'JEE Advanced',Total_Fee:150000,Registration_Fee:10000,No_Of_Installments:6,Status:'Active'},
  {Plan_ID:'FP002',Plan_Name:'NEET 1-Year',Course:'NEET',Total_Fee:95000,Registration_Fee:7500,No_Of_Installments:4,Status:'Active'},
]
const DEMO_STUDENTS = [
  {student_id:'STU000001',full_name:'Rahul Verma',phone:'9876543210',centre:'Delhi Rohini',course:'JEE Advanced',status:'Active',fee_pending:0,fee_paid:0,payment_status:'Not Assigned'},
  {student_id:'STU000002',full_name:'Priya Sharma',phone:'9876543211',centre:'Delhi Rohini',course:'NEET',status:'Active',fee_pending:0,fee_paid:0,payment_status:'Not Assigned'},
]

export default function AssignFeePlanPage() {
  const [search,setSearch] = useState(''); const [searchQuery,setSearchQuery] = useState('')
  const [selStudent,setSelStudent] = useState<typeof DEMO_STUDENTS[0]|null>(null)
  const [selPlan,setSelPlan] = useState('')
  const [overrides,setOverrides] = useState({discount:'0',scholarship:'0',start_date:new Date().toISOString().split('T')[0]})
  const [success,setSuccess] = useState('')

  const {data:students,isLoading:loadS} = useQuery({
    queryKey:['studentSearch',searchQuery], queryFn:()=>gasGet<typeof DEMO_STUDENTS>('searchStudents',{query:searchQuery}),
    enabled:!!searchQuery&&!IS_DEMO, retry:false
  })
  const {data:plans} = useQuery({queryKey:['feePlans'],queryFn:()=>gasGet<typeof DEMO_PLANS>('listFeePlans',{}),retry:false})

  const stuList = students??(IS_DEMO&&searchQuery?DEMO_STUDENTS.filter(s=>s.full_name.toLowerCase().includes(searchQuery.toLowerCase())||s.student_id.includes(searchQuery)):[])
  const planList = plans??DEMO_PLANS
  const chosenPlan = planList.find(p=>p.Plan_ID===selPlan)

  const {mutateAsync:assign,isPending:assigning,error} = useMutation({
    mutationFn:()=>gasPost('assignFeePlanToStudent',{student_id:selStudent!.student_id,plan_id:selPlan,overrides:{discount:Number(overrides.discount),scholarship:Number(overrides.scholarship),start_date:overrides.start_date}}),
    onSuccess:()=>{setSuccess(`Fee plan "${chosenPlan?.Plan_Name}" assigned to ${selStudent?.full_name}! Installments auto-generated.`);setSelStudent(null);setSelPlan('');setSearchQuery('')}
  })

  return (
    <DashboardShell title="Assign Fee Plan">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">📋 Assign Fee Plan to Student</h1>
        <p className="text-sm text-gray-500">Select a student and a fee plan. Installments are auto-generated based on the plan configuration.</p>
        {IS_DEMO&&<Alert variant="info">Demo mode — select a student and plan to see the assignment flow.</Alert>}
        {success&&<Alert variant="success">{success}</Alert>}

        {/* Student search */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Step 1 — Select Student</h2></CardHeader>
          <CardBody>
            <form onSubmit={e=>{e.preventDefault();setSearchQuery(search)}} className="flex gap-2 mb-4">
              <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone, or student ID" className="flex-1"/>
              <Button type="submit">Search</Button>
            </form>
            {selStudent&&<Alert variant="success">Selected: <strong>{selStudent.full_name}</strong> ({selStudent.student_id}) · {selStudent.centre}</Alert>}
            {loadS&&<div className="flex justify-center py-4"><Spinner/></div>}
            {stuList.length>0&&!selStudent&&(
              <div className="space-y-2">
                {stuList.map(s=>(
                  <button key={s.student_id} onClick={()=>setSelStudent(s)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 transition-all text-left">
                    <div><p className="font-semibold text-sm text-gray-900 dark:text-white">{s.full_name}</p><p className="text-xs text-gray-400">{s.student_id} · {s.phone} · {s.centre}</p></div>
                    <Badge variant={s.payment_status==='Not Assigned'?'default':s.payment_status==='Paid'?'success':'warning'}>{s.payment_status}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Plan selection */}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Step 2 — Select Fee Plan</h2></CardHeader>
          <CardBody>
            <div className="grid sm:grid-cols-2 gap-3">
              {planList.map(plan=>(
                <button key={plan.Plan_ID} onClick={()=>setSelPlan(plan.Plan_ID)}
                  className={`p-4 rounded-xl border text-left transition-all ${selPlan===plan.Plan_ID?'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/30':'border-gray-200 dark:border-gray-700 hover:border-blue-300'}`}>
                  <div className="flex justify-between mb-2">
                    <p className="font-bold text-gray-900 dark:text-white">{plan.Plan_Name}</p>
                    <Badge variant={plan.Status==='Active'?'success':'default'}>{plan.Status}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">{plan.Course}</p>
                  <p className="text-lg font-black text-blue-600 mt-1">{fmt(plan.Total_Fee)}</p>
                  <p className="text-xs text-gray-400">{plan.No_Of_Installments} installments · Reg. {fmt(plan.Registration_Fee)}</p>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Overrides */}
        {selPlan&&(
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Step 3 — Adjustments (Optional)</h2></CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <Input label="Discount (₹)" type="number" min="0" value={overrides.discount} onChange={e=>setOverrides(o=>({...o,discount:e.target.value}))}/>
                <Input label="Scholarship (₹)" type="number" min="0" value={overrides.scholarship} onChange={e=>setOverrides(o=>({...o,scholarship:e.target.value}))}/>
                <div><label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Start Date</label><input type="date" value={overrides.start_date} onChange={e=>setOverrides(o=>({...o,start_date:e.target.value}))} className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500"/></div>
              </div>
              {chosenPlan&&<div className="mt-4 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-sm">
                <p className="font-bold text-blue-700 dark:text-blue-300">Calculated Net Fee</p>
                <p className="text-2xl font-black text-blue-600 mt-1">{fmt(chosenPlan.Total_Fee - Number(overrides.discount||0) - Number(overrides.scholarship||0))}</p>
                <p className="text-xs text-blue-500 mt-0.5">{chosenPlan.No_Of_Installments} installments will be auto-generated starting {overrides.start_date}</p>
              </div>}
            </CardBody>
          </Card>
        )}

        {error&&<Alert variant="danger">{String(error).replace('Error:','')}</Alert>}
        <Button disabled={!selStudent||!selPlan||assigning} className="w-full" onClick={()=>assign()}>
          {assigning?'Assigning…':'✅ Assign Fee Plan & Auto-Generate Installments'}
        </Button>
      </div>
    </DashboardShell>
  )
}
