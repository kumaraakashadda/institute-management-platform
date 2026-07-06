'use client'
import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Badge, Button, Modal } from '@/components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

type Stage = 'Upcoming_Due'|'Contacted'|'Promise_To_Pay'|'Partially_Paid'|'Fully_Paid'|'Not_Reachable'
interface Card { student_id:string; student_name:string; phone:string; centre:string; course:string; pending:number; crm_stage:Stage; next_followup:string; follow_up_note:string; overdue_installments?:number; overdue_amount?:number }

const STAGES:{key:Stage;label:string;hdr:string}[] = [
  {key:'Upcoming_Due',label:'Upcoming Due',hdr:'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'},
  {key:'Contacted',label:'Contacted',hdr:'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'},
  {key:'Promise_To_Pay',label:'Promise to Pay',hdr:'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'},
  {key:'Partially_Paid',label:'Partially Paid',hdr:'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'},
  {key:'Not_Reachable',label:'Not Reachable',hdr:'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'},
  {key:'Fully_Paid',label:'Fully Paid',hdr:'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'},
]
const DEMO:Record<Stage,Card[]> = {
  Upcoming_Due:[{student_id:'STU000001',student_name:'Rahul Verma',phone:'9876543210',centre:'Delhi Rohini',course:'JEE Advanced',pending:75000,crm_stage:'Upcoming_Due',next_followup:'',follow_up_note:'',overdue_installments:0,overdue_amount:0}],
  Contacted:[{student_id:'STU000002',student_name:'Priya Sharma',phone:'9876543211',centre:'Delhi Rohini',course:'NEET',pending:50000,crm_stage:'Contacted',next_followup:'2025-12-08',follow_up_note:'Will pay by week end',overdue_installments:1,overdue_amount:12500}],
  Promise_To_Pay:[],Partially_Paid:[],Not_Reachable:[],Fully_Paid:[]
}

export default function CrmPipelinePage() {
  const [editing,setEditing] = useState<Card|null>(null)
  const { data } = useQuery({ queryKey:['crm'], queryFn:()=>gasGet<Record<Stage,Card[]>>('getCrmPipeline',{}), retry:false })
  const pipeline = data ?? DEMO
  const total = Object.values(pipeline).flat().reduce((s,c)=>s+c.pending,0)

  return (
    <DashboardShell title="CRM Pipeline">
      <div className="p-4 md:p-6 space-y-5 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-bold text-gray-900 dark:text-white">🎯 CRM Pipeline</h1><p className="text-sm text-gray-500">{fmt(total)} total pending</p></div>
          {!data&&<Badge variant="warning">Demo data</Badge>}
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map(stage=>{
            const cards = pipeline[stage.key]??[]
            return (
              <div key={stage.key} className="flex-shrink-0 w-60 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className={`px-3 py-2 flex justify-between items-center ${stage.hdr}`}>
                  <span className="text-xs font-bold">{stage.label}</span>
                  <Badge variant="default">{cards.length}</Badge>
                </div>
                <div className="p-2 space-y-2 min-h-[160px] bg-gray-50 dark:bg-gray-950">
                  {cards.map(card=>(
                    <div key={card.student_id} className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-800 p-3 space-y-1.5 hover:shadow-sm transition-shadow">
                      <div className="flex justify-between"><p className="text-sm font-semibold text-gray-900 dark:text-white">{card.student_name}</p><button onClick={()=>setEditing(card)} className="text-xs text-blue-600">Edit</button></div>
                      <p className="text-xs text-gray-400">{card.phone} · {card.course}</p>
                      <p className="text-xs font-bold text-red-600">{fmt(card.pending)}</p>
                      {card.next_followup&&<p className="text-[10px] text-gray-400">Follow-up: {card.next_followup}</p>}
                      {card.follow_up_note&&<p className="text-[10px] text-gray-500 italic truncate">{card.follow_up_note}</p>}
                    </div>
                  ))}
                  {cards.length===0&&<p className="text-xs text-gray-300 dark:text-gray-600 text-center mt-4">Empty</p>}
                </div>
              </div>
            )
          })}
        </div>
        {editing&&<StageModal card={editing} onClose={()=>setEditing(null)}/>}
      </div>
    </DashboardShell>
  )
}

function StageModal({card,onClose}:{card:Card;onClose:()=>void}) {
  const [stage,setStage] = useState<Stage>(card.crm_stage)
  const [note,setNote] = useState(''); const [followup,setFollowup] = useState('')
  const qc = useQueryClient()
  const { mutateAsync, isPending } = useMutation({ mutationFn:()=>gasPost('updateCrmStage',{student_id:card.student_id,stage,note,next_followup:followup}), onSuccess:()=>{qc.invalidateQueries({queryKey:['crm']});onClose()} })
  return (
    <Modal title="Update Stage" onClose={onClose}>
      <p className="text-sm text-gray-500 mb-4">{card.student_name} · {fmt(card.pending)} pending</p>
      <div className="space-y-3">
        <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400">Stage</label>
          <select value={stage} onChange={e=>setStage(e.target.value as Stage)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
            {STAGES.map(s=><option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400">Note</label><textarea value={note} onChange={e=>setNote(e.target.value)} rows={2} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 resize-none"/></div>
        <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400">Next Follow-up</label><input type="date" value={followup} onChange={e=>setFollowup(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"/></div>
        <Button onClick={()=>mutateAsync()} disabled={isPending} className="w-full">{isPending?'Saving…':'Update Stage'}</Button>
      </div>
    </Modal>
  )
}
