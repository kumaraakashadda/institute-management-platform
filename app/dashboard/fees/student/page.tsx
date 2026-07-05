'use client'
import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Input, EmptyState, Spinner, Modal } from '@/components/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { gasGet, gasPost } from '@/lib/gasClient'
import { fmt, statusBadge, fmtDate } from '@/lib/utils/helpers'

export default function StudentFeeProfilePage() {
  const [studentId,setStudentId] = useState('')
  const [search,setSearch] = useState('')
  const [showPay,setShowPay] = useState(false)
  const [receipt,setReceipt] = useState('')
  const qc = useQueryClient()

  const { data:profile, isLoading, isError } = useQuery({
    queryKey:['studentFee',studentId],
    queryFn:()=>gasGet<{fee:Record<string,unknown>;summary:Record<string,number>;installments:Record<string,unknown>[];payments:Record<string,unknown>[];timeline:{date:string;type:string;label:string}[]}>('getStudentFeeProfile',{student_id:studentId}),
    enabled:!!studentId, retry:false
  })

  const { mutateAsync:pay, isPending:paying } = useMutation({
    mutationFn:(f:Record<string,unknown>)=>gasPost<{receipt_number:string}>('recordPayment',f),
    onSuccess:(res)=>{ setReceipt(res.receipt_number); setShowPay(false); qc.invalidateQueries({queryKey:['studentFee',studentId]}) }
  })

  const fee = profile?.fee; const summ = profile?.summary

  return (
    <DashboardShell title="Student Fee Profile">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🔍 Student Fee Profile</h1>
        <form onSubmit={e=>{e.preventDefault();setStudentId(search.trim());setReceipt('')}} className="flex gap-2">
          <Input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Enter Student ID e.g. STU000001" className="flex-1" />
          <Button type="submit">Search</Button>
        </form>
        {receipt && <div className="text-sm text-green-700 bg-green-50 dark:bg-green-900/20 rounded-lg px-4 py-2">✅ Payment recorded — Receipt: {receipt}</div>}
        {isLoading && <div className="flex justify-center py-8"><Spinner size="lg"/></div>}
        {isError && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-4 py-2">Student not found or backend error.</div>}
        {!studentId && <EmptyState icon="🔍" title="Enter a Student ID to view fee profile"/>}
        {profile && fee && summ && (
          <>
            <Card>
              <CardBody>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-3 mb-4">
                  <div><p className="text-lg font-bold text-gray-900 dark:text-white">{String(fee.Student_Name)}</p><p className="text-sm text-gray-500">{String(fee.Student_ID)} · {String(fee.Centre)} · {String(fee.Course)}</p></div>
                  <Button onClick={()=>setShowPay(true)}>+ Record Payment</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  {[['Total Fee',fmt(summ.net_fee)],['Paid',fmt(summ.total_paid)],['Pending',fmt(summ.pending)],['Rate',`${summ.collection_pct}%`]].map(([l,v])=>(
                    <div key={l} className="rounded-lg bg-gray-50 dark:bg-gray-800 p-3"><p className="text-xs text-gray-400">{l}</p><p className="text-lg font-bold text-gray-900 dark:text-white">{v}</p></div>
                  ))}
                </div>
                <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className="h-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500" style={{width:`${summ.collection_pct}%`}}/>
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><h3 className="font-semibold text-gray-800 dark:text-gray-200">Installment Schedule</h3></CardHeader>
              <div className="divide-y dark:divide-gray-800">
                {profile.installments.map((inst,i)=>(
                  <div key={i} className="px-5 py-3 flex justify-between items-center">
                    <div><p className="text-sm font-medium text-gray-800 dark:text-gray-200">Installment #{String(inst.Installment_Number)}</p><p className="text-xs text-gray-400">Due: {fmtDate(String(inst.Due_Date))}</p></div>
                    <div className="text-right"><p className="font-bold text-gray-900 dark:text-white">{fmt(Number(inst.Pending_Amount))}</p><Badge variant={statusBadge(String(inst.Status))}>{String(inst.Status)}</Badge></div>
                  </div>
                ))}
                {profile.installments.length===0&&<div className="px-5 py-4 text-sm text-gray-400">No installments found.</div>}
              </div>
            </Card>
            <Card>
              <CardHeader><h3 className="font-semibold text-gray-800 dark:text-gray-200">Fee Timeline</h3></CardHeader>
              <CardBody>
                <ol className="relative border-l border-gray-200 dark:border-gray-700 space-y-4 pl-6">
                  {profile.timeline.map((ev,i)=>(
                    <li key={i} className="relative"><span className="absolute -left-[25px] flex items-center justify-center w-5 h-5 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 text-xs">{'🎓📅✅💳🔴💰'.charAt(i%6)}</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">{ev.label}</p><p className="text-xs text-gray-400">{fmtDate(ev.date)}</p></li>
                  ))}
                </ol>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><h3 className="font-semibold text-gray-800 dark:text-gray-200">Payment History</h3></CardHeader>
              <div className="divide-y dark:divide-gray-800">
                {profile.payments.map((p,i)=>(
                  <div key={i} className="px-5 py-3 flex justify-between items-center">
                    <div><p className="text-sm font-medium text-gray-800 dark:text-gray-200">{String(p.Receipt_Number)}</p><p className="text-xs text-gray-400">{fmtDate(String(p.Payment_Date))} · {String(p.Payment_Mode)}</p></div>
                    <p className="text-sm font-bold text-green-600">{fmt(Number(p.Amount))}</p>
                  </div>
                ))}
                {profile.payments.length===0&&<div className="px-5 py-4 text-sm text-gray-400">No payments recorded yet.</div>}
              </div>
            </Card>
          </>
        )}
        {showPay && studentId && (
          <Modal title="Record Payment" onClose={()=>setShowPay(false)}>
            <PayForm studentId={studentId} onPay={async f=>{await pay(f)}} paying={paying}/>
          </Modal>
        )}
      </div>
    </DashboardShell>
  )
}

function PayForm({studentId,onPay,paying}:{studentId:string;onPay:(f:Record<string,unknown>)=>Promise<void>;paying:boolean}) {
  const [amount,setAmount] = useState(''); const [mode,setMode] = useState('Cash'); const [txn,setTxn] = useState(''); const [err,setErr] = useState('')
  return (
    <form onSubmit={async e=>{e.preventDefault();setErr('');if(!amount||Number(amount)<=0){setErr('Enter a valid amount');return}try{await onPay({Student_ID:studentId,Amount:Number(amount),Payment_Mode:mode,Transaction_ID:txn})}catch(ex){setErr(ex instanceof Error?ex.message:'Error')}}} className="space-y-3">
      <Input label="Amount (₹)" type="number" min="1" value={amount} onChange={e=>setAmount(e.target.value)} required/>
      <div><label className="text-xs font-medium text-gray-600 dark:text-gray-400">Mode</label>
        <select value={mode} onChange={e=>setMode(e.target.value)} className="mt-1 w-full rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700">
          {['Cash','UPI','Credit Card','Debit Card','Bank Transfer','Cheque','Wallet','Other'].map(m=><option key={m}>{m}</option>)}
        </select>
      </div>
      <Input label="Transaction ID" value={txn} onChange={e=>setTxn(e.target.value)} placeholder="Optional reference"/>
      {err&&<p className="text-xs text-red-500">{err}</p>}
      <Button type="submit" disabled={paying} className="w-full">{paying?'Recording…':'Record Payment'}</Button>
    </form>
  )
}
