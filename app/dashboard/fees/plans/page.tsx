'use client'
import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge, Button, Input, Modal } from '@/components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

interface Plan { Plan_ID:string; Plan_Name:string; Course:string; Segment:string; Target_Year:string; Total_Fee:number; Registration_Fee:number; No_Of_Installments:number; Description:string; Status:string }
const DEMO:Plan[] = [
  {Plan_ID:'FP000001',Plan_Name:'JEE 2-Year',Course:'JEE Advanced',Segment:'Classroom',Target_Year:'2026',Total_Fee:150000,Registration_Fee:10000,No_Of_Installments:6,Description:'2-year JEE classroom',Status:'Active'},
  {Plan_ID:'FP000002',Plan_Name:'NEET 1-Year',Course:'NEET',Segment:'Classroom',Target_Year:'2025',Total_Fee:95000,Registration_Fee:7500,No_Of_Installments:4,Description:'1-year NEET',Status:'Active'},
]

export default function FeePlansPage() {
  const [showCreate,setShowCreate] = useState(false)
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey:['feePlans'], queryFn:()=>gasGet<Plan[]>('listFeePlans',{}), retry:false })
  const { mutateAsync:del } = useMutation({ mutationFn:(id:string)=>gasPost('deleteFeePlan',{id}), onSuccess:()=>qc.invalidateQueries({queryKey:['feePlans']}) })
  const plans = data ?? DEMO

  return (
    <DashboardShell title="Fee Plans">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📋 Fee Plans</h1>
          <Button onClick={()=>setShowCreate(true)}>+ Create Plan</Button>
        </div>
        {!data && <div className="text-xs text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-1.5">Demo data — connect backend to manage real plans</div>}
        <div className="grid md:grid-cols-2 gap-4">
          {plans.map(plan=>(
            <Card key={plan.Plan_ID}>
              <CardBody>
                <div className="flex justify-between items-start mb-3">
                  <div><h2 className="font-bold text-gray-900 dark:text-white">{plan.Plan_Name}</h2><p className="text-xs text-gray-400">{plan.Plan_ID}</p></div>
                  <Badge variant={plan.Status==='Active'?'success':'default'}>{plan.Status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                  {[['Course',plan.Course],['Segment',plan.Segment||'—'],['Total Fee',fmt(plan.Total_Fee)],['Installments',String(plan.No_Of_Installments)],['Reg. Fee',fmt(plan.Registration_Fee)],['Target Year',plan.Target_Year||'—']].map(([l,v])=>(
                    <div key={l}><span className="text-gray-400 text-xs">{l}</span><p className="font-medium text-gray-800 dark:text-gray-200">{v}</p></div>
                  ))}
                </div>
                {plan.Description&&<p className="text-xs text-gray-400 mb-2">{plan.Description}</p>}
                <div className="flex gap-3 text-xs">
                  <span className="text-blue-600 cursor-pointer hover:underline">Edit</span>
                  <button onClick={()=>del(plan.Plan_ID)} className="text-red-500 hover:underline">Delete</button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
        {showCreate && <CreatePlanModal onClose={()=>setShowCreate(false)}/>}
      </div>
    </DashboardShell>
  )
}

function CreatePlanModal({onClose}:{onClose:()=>void}) {
  const qc = useQueryClient()
  const [form,setForm] = useState({Plan_Name:'',Course:'',Segment:'',Target_Year:'',Total_Fee:'',Registration_Fee:'',No_Of_Installments:'',Description:''})
  const { mutateAsync, isPending, error } = useMutation({ mutationFn:(f:Record<string,unknown>)=>gasPost('createFeePlan',{fields:f}), onSuccess:()=>{qc.invalidateQueries({queryKey:['feePlans']});onClose()} })
  const fi = (k:keyof typeof form, l:string, t='text') => (
    <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400">{l}</label>
    <input type={t} value={form[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:ring-2 focus:ring-blue-500"/></div>
  )
  return (
    <Modal title="Create Fee Plan" onClose={onClose}>
      <form onSubmit={async e=>{e.preventDefault();await mutateAsync({...form,Total_Fee:Number(form.Total_Fee),Registration_Fee:Number(form.Registration_Fee),No_Of_Installments:Number(form.No_Of_Installments)})}} className="space-y-3">
        {fi('Plan_Name','Plan Name *')}<div className="grid grid-cols-2 gap-3">{fi('Course','Course *')}{fi('Segment','Segment')}</div>
        <div className="grid grid-cols-2 gap-3">{fi('Target_Year','Target Year')}{fi('No_Of_Installments','Installments *','number')}</div>
        <div className="grid grid-cols-2 gap-3">{fi('Total_Fee','Total Fee ₹ *','number')}{fi('Registration_Fee','Reg. Fee ₹','number')}</div>
        {fi('Description','Description')}
        {error&&<p className="text-xs text-red-500">{String(error)}</p>}
        <Button type="submit" disabled={isPending} className="w-full">{isPending?'Creating…':'Create Plan'}</Button>
      </form>
    </Modal>
  )
}
