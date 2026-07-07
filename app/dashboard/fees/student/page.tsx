'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Input, Modal, Alert, Spinner, EmptyState } from '@/components/ui'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'
import { fmtDate, statusBadge } from '@/lib/utils/helpers'
const INR = (n: number | string | undefined | null) => '₹' + Number(n ?? 0).toLocaleString('en-IN')
const SV: Record<string,'success'|'warning'|'danger'|'info'|'default'> = {Paid:'success',Partial:'warning',Pending:'info',Overdue:'danger'}
const TI: Record<string,string> = {admission:'🎓',payment:'✅',due:'🔴',upcoming:'📅',reminder:'🔔',waiver:'🎁'}
const DEMO_PROFILE = {
  fee:{Student_Name:'Demo Student',Student_ID:'STU000001',Centre:'Delhi Rohini',Course:'JEE Advanced',Segment:'Classroom',Target_Year:'2026',Fee_Plan:'JEE 2-Year',Total_Fee:150000,Discount:10000,Scholarship:0,Net_Fee:140000,Registration_Fee_Paid:10000,Total_Paid:90000,Pending_Amount:50000,Payment_Status:'Partial',Last_Payment_Date:'2025-11-15'},
  summary:{net_fee:140000,total_paid:90000,pending:50000,collection_pct:64},
  installments:[
    {Installment_ID:'I1',Installment_Number:'1',Due_Date:'2025-07-01',Installment_Amount:35000,Paid_Amount:35000,Pending_Amount:0,Status:'Paid',Payment_Date:'2025-06-28',Payment_Mode:'UPI',Transaction_Reference:'TXN123',Remarks:''},
    {Installment_ID:'I2',Installment_Number:'2',Due_Date:'2025-09-01',Installment_Amount:35000,Paid_Amount:35000,Pending_Amount:0,Status:'Paid',Payment_Date:'2025-08-30',Payment_Mode:'Cash',Transaction_Reference:'',Remarks:''},
    {Installment_ID:'I3',Installment_Number:'3',Due_Date:'2025-12-01',Installment_Amount:35000,Paid_Amount:20000,Pending_Amount:15000,Status:'Partial',Payment_Date:'2025-11-15',Payment_Mode:'UPI',Transaction_Reference:'TXN456',Remarks:''},
    {Installment_ID:'I4',Installment_Number:'4',Due_Date:'2026-03-01',Installment_Amount:35000,Paid_Amount:0,Pending_Amount:35000,Status:'Pending',Payment_Date:'',Payment_Mode:'',Transaction_Reference:'',Remarks:''},
  ],
  payments:[
    {Payment_ID:'P1',Receipt_Number:'RCP-000001',Payment_Date:'2025-06-28',Amount:35000,Payment_Mode:'UPI',Transaction_ID:'TXN123',Remarks:'Installment 1',Receipt_Generated:'TRUE',Receipt_URL:''},
    {Payment_ID:'P2',Receipt_Number:'RCP-000002',Payment_Date:'2025-08-30',Amount:35000,Payment_Mode:'Cash',Transaction_ID:'',Remarks:'Installment 2',Receipt_Generated:'TRUE',Receipt_URL:''},
    {Payment_ID:'P3',Receipt_Number:'RCP-000003',Payment_Date:'2025-11-15',Amount:20000,Payment_Mode:'UPI',Transaction_ID:'TXN456',Remarks:'Partial payment',Receipt_Generated:'TRUE',Receipt_URL:''},
  ],
  timeline:[
    {date:'2025-06-01',type:'admission',label:'Admission completed'},
    {date:'2025-06-10',type:'payment',label:'Registration fee ₹10,000 paid'},
    {date:'2025-06-28',type:'payment',label:'Installment #1 ₹35,000 paid — RCP-000001'},
    {date:'2025-08-30',type:'payment',label:'Installment #2 ₹35,000 paid — RCP-000002'},
    {date:'2025-11-15',type:'payment',label:'Partial payment ₹20,000 — RCP-000003'},
    {date:'2025-12-01',type:'due',label:'Installment #3 balance ₹15,000 due'},
    {date:'2026-03-01',type:'upcoming',label:'Installment #4 ₹35,000 upcoming'},
  ],
}

export default function StudentFeePage() {
  const qc = useQueryClient()
  const [sid,setSid] = useState(''); const [search,setSearch] = useState('')
  const [showPay,setShowPay] = useState(false); const [showResch,setShowResch] = useState(false)
  const [selInst,setSelInst] = useState<typeof DEMO_PROFILE.installments[0]|null>(null)
  const [receipt,setReceipt] = useState('')
  const [tab,setTab] = useState<'installments'|'payments'|'timeline'>('installments')

  const {data:profile,isLoading,isError} = useQuery({
    queryKey:['sfp',sid], queryFn:()=>gasGet<typeof DEMO_PROFILE>('getStudentFeeProfile',{student_id:sid}),
    enabled:!!sid&&!IS_DEMO, retry:false
  })
  const p = profile??(sid?DEMO_PROFILE:null); const fee=p?.fee; const sum=p?.summary

  const {mutateAsync:pay,isPending:paying} = useMutation({
    mutationFn:(f:Record<string,unknown>)=>gasPost<{receipt_number:string}>('recordPayment',f),
    onSuccess:(r)=>{setReceipt(r.receipt_number);setShowPay(false);qc.invalidateQueries({queryKey:['sfp',sid]})}
  })
  const {mutateAsync:resch,isPending:rescheduling} = useMutation({
    mutationFn:(f:{id:string;date:string;reason:string})=>gasPost('rescheduleInstallment',{installment_id:f.id,new_due_date:f.date,reason:f.reason}),
    onSuccess:()=>{setShowResch(false);setSelInst(null);qc.invalidateQueries({queryKey:['sfp',sid]})}
  })
  const {mutateAsync:genR} = useMutation({
    mutationFn:(pid:string)=>gasPost<{receipt_url:string}>('generateReceipt',{payment_id:pid}),
    onSuccess:(r)=>{if(r.receipt_url)window.open(r.receipt_url,'_blank')}
  })

  return (
    <DashboardShell title="Student Fee Profile">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">💳 Student Fee Profile</h1>
        <form onSubmit={e=>{e.preventDefault();setSid(search.trim());setReceipt('')}} className="flex gap-2">
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Enter Student ID e.g. STU000001" className="flex-1"/>
          <Button type="submit">Search</Button>
        </form>
        {receipt&&<Alert variant="success">✅ Payment recorded — Receipt: <strong>{receipt}</strong>. PDF generated and stored in Drive.</Alert>}
        {!sid&&<EmptyState icon="🔍" title="Enter a Student ID to view fee profile"/>}
        {sid&&isLoading&&<div className="flex justify-center py-12"><Spinner size="lg"/></div>}
        {sid&&isError&&<Alert variant="danger">Student not found. Try STU000001 in demo mode.</Alert>}
        {IS_DEMO&&sid&&<Alert variant="info">Demo mode — sample data for {sid}.</Alert>}

        {p&&fee&&sum&&(<>
          <Card>
            <CardBody>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                <div>
                  <p className="text-xl font-black text-gray-900 dark:text-white">{fee.Student_Name}</p>
                  <p className="text-sm text-gray-500">{fee.Student_ID} · {fee.Centre} · {fee.Course}</p>
                  <div className="flex gap-2 mt-1.5 flex-wrap">
                    <Badge variant="info">{fee.Segment}</Badge><Badge variant="default">{fee.Target_Year}</Badge>
                    <Badge variant={statusBadge(fee.Payment_Status)}>{fee.Payment_Status}</Badge>
                    {fee.Fee_Plan&&<Badge variant="purple">{fee.Fee_Plan}</Badge>}
                  </div>
                </div>
                <Button onClick={()=>setShowPay(true)}>+ Record Payment</Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[['Total Fee',INR(sum.net_fee),'text-gray-900 dark:text-white'],['Paid',INR(sum.total_paid),'text-emerald-600'],['Pending',INR(sum.pending),'text-red-500'],['Rate',`${sum.collection_pct}%`,sum.collection_pct>=75?'text-emerald-600':'text-amber-500']].map(([l,v,cls])=>(
                  <div key={l} className="text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide">{l}</p>
                    <p className={`text-xl font-black mt-0.5 ${cls}`}>{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5">
                <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-emerald-500" style={{width:`${sum.collection_pct}%`}}/>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>Discount: {INR(fee.Discount||0)}</span>
                {fee.Last_Payment_Date&&<span>Last paid: {fmtDate(fee.Last_Payment_Date)}</span>}
                <span>Scholarship: {INR(fee.Scholarship||0)}</span>
              </div>
            </CardBody>
          </Card>

          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
            {([['installments','📋 Installments'],['payments','💳 Payments'],['timeline','📈 Timeline']] as const).map(([k,l])=>(
              <button key={k} onClick={()=>setTab(k)} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab===k?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500'}`}>{l}</button>
            ))}
          </div>

          {tab==='installments'&&(
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Installment Schedule</h2></CardHeader>
              <div className="divide-y dark:divide-gray-800">
                {p.installments.map(inst=>{
                  const ov = inst.Status!=='Paid'&&new Date(inst.Due_Date)<new Date()
                  const eff = ov?'Overdue':inst.Status
                  return (
                    <div key={inst.Installment_ID} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 text-xs font-bold flex items-center justify-center">#{inst.Installment_Number}</span>
                          <Badge variant={SV[eff]||'default'}>{eff}</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Due: {fmtDate(inst.Due_Date)}</p>
                        {inst.Payment_Date&&<p className="text-xs text-gray-400">Paid: {fmtDate(inst.Payment_Date)} via {inst.Payment_Mode}</p>}
                        {inst.Transaction_Reference&&<p className="text-xs text-gray-400 font-mono">Ref: {inst.Transaction_Reference}</p>}
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right"><p className="text-lg font-black text-gray-900 dark:text-white">{INR(inst.Pending_Amount)}</p><p className="text-xs text-gray-400">of {INR(inst.Installment_Amount)}</p></div>
                        {inst.Status!=='Paid'&&<div className="flex gap-1"><Button size="sm" variant="secondary" onClick={()=>{setSelInst(inst);setShowResch(true)}}>↻ Reschedule</Button><Button size="sm" onClick={()=>setShowPay(true)}>Pay</Button></div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {tab==='payments'&&(
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Payment History</h2></CardHeader>
              {p.payments.length===0?<CardBody><EmptyState icon="💳" title="No payments yet"/></CardBody>:(
                <div className="divide-y dark:divide-gray-800">
                  {p.payments.map(pay=>(
                    <div key={pay.Payment_ID} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1"><p className="font-bold text-sm text-gray-900 dark:text-white">{pay.Receipt_Number}</p><p className="text-xs text-gray-500">{fmtDate(pay.Payment_Date)} · {pay.Payment_Mode}</p>{pay.Transaction_ID&&<p className="text-xs text-gray-400 font-mono">TXN: {pay.Transaction_ID}</p>}{pay.Remarks&&<p className="text-xs text-gray-400 italic">{pay.Remarks}</p>}</div>
                      <div className="flex items-center gap-3 shrink-0"><p className="text-xl font-black text-emerald-600">{INR(pay.Amount)}</p><Button size="sm" variant="secondary" onClick={()=>genR(pay.Payment_ID)}>↓ Receipt PDF</Button></div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {tab==='timeline'&&(
            <Card>
              <CardHeader><h2 className="font-bold">Fee Timeline</h2></CardHeader>
              <CardBody>
                <ol className="relative border-l-2 border-gray-100 dark:border-gray-800 space-y-5 ml-3">
                  {p.timeline.map((ev,i)=>(
                    <li key={i} className="relative pl-6">
                      <div className="absolute -left-3.5 top-0 w-7 h-7 rounded-full bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center text-sm">{TI[ev.type]||'📌'}</div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{ev.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(ev.date)}</p>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )}
        </>)}

        {showPay&&sid&&(
          <Modal title="Record Payment" onClose={()=>setShowPay(false)}>
            <PayForm sid={sid} onPay={async f=>{await pay(f)}} paying={paying}/>
          </Modal>
        )}
        {showResch&&selInst&&(
          <Modal title={`Reschedule Installment #${selInst.Installment_Number}`} onClose={()=>{setShowResch(false);setSelInst(null)}}>
            <ReschForm inst={selInst} onResch={async f=>{await resch(f)}} rescheduling={rescheduling}/>
          </Modal>
        )}
      </div>
    </DashboardShell>
  )
}

function PayForm({sid,onPay,paying}:{sid:string;onPay:(f:Record<string,unknown>)=>Promise<void>;paying:boolean}) {
  const [amount,setAmount]=useState(''); const [mode,setMode]=useState('Cash'); const [txn,setTxn]=useState(''); const [remarks,setRemarks]=useState(''); const [err,setErr]=useState('')
  return (
    <form onSubmit={async e=>{e.preventDefault();setErr('');if(!amount||Number(amount)<=0){setErr('Enter valid amount');return}try{await onPay({Student_ID:sid,Amount:Number(amount),Payment_Mode:mode,Transaction_ID:txn,Remarks:remarks})}catch(ex){setErr(ex instanceof Error?ex.message:'Error')}}} className="space-y-4">
      <Input label="Amount (₹) *" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} required/>
      <div><label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Payment Mode</label>
      <select value={mode} onChange={e=>setMode(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none">
        {['Cash','UPI','Credit Card','Debit Card','Bank Transfer','Cheque','Wallet','Other'].map(m=><option key={m}>{m}</option>)}
      </select></div>
      <Input label="Transaction ID" value={txn} onChange={e=>setTxn(e.target.value)} placeholder="Optional"/>
      <div><label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label><input value={remarks} onChange={e=>setRemarks(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500"/></div>
      {err&&<Alert variant="danger">{err}</Alert>}
      <Button type="submit" disabled={paying} className="w-full">{paying?'Recording…':'Record Payment + Generate PDF Receipt'}</Button>
    </form>
  )
}

function ReschForm({inst,onResch,rescheduling}:{inst:typeof DEMO_PROFILE.installments[0];onResch:(f:{id:string;date:string;reason:string})=>Promise<void>;rescheduling:boolean}) {
  const [date,setDate]=useState(inst.Due_Date); const [reason,setReason]=useState(''); const [err,setErr]=useState('')
  return (
    <form onSubmit={async e=>{e.preventDefault();setErr('');if(!date){setErr('Select date');return}if(!reason.trim()){setErr('Reason required');return}try{await onResch({id:inst.Installment_ID,date,reason})}catch(ex){setErr(ex instanceof Error?ex.message:'Error')}}} className="space-y-4">
      <Alert variant="info">Rescheduling installment #{inst.Installment_Number} · {INR(inst.Pending_Amount)} pending</Alert>
      <div><label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">New Due Date *</label><input type="date" required value={date} onChange={e=>setDate(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500"/></div>
      <div><label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Reason *</label><textarea required rows={3} value={reason} onChange={e=>setReason(e.target.value)} className="w-full rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500 resize-none"/></div>
      {err&&<Alert variant="danger">{err}</Alert>}
      <Button type="submit" disabled={rescheduling} className="w-full">{rescheduling?'Saving…':'Reschedule Installment'}</Button>
    </form>
  )
}
