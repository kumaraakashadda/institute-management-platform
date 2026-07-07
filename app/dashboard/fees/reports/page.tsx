'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, StatCard, EmptyState, Spinner } from '@/components/ui'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
const INR=(n:number)=>'₹'+n.toLocaleString('en-IN')
const today = new Date().toISOString().split('T')[0]

const DEMO_COUNSELLOR = [
  {counsellor:'Rohit Singh',students:32,total_fee:4800000,collected:3200000,pending:1600000,collection_pct:67},
  {counsellor:'Neha Gupta',students:28,total_fee:4200000,collected:3150000,pending:1050000,collection_pct:75},
  {counsellor:'Unassigned',students:12,total_fee:1500000,collected:625000,pending:875000,collection_pct:42},
]

type TabKey = 'daily'|'monthly'|'overdue'|'counsellor'|'ledger'

function DailyTab(){
  const [date,setDate]=useState(today)
  const {data,isLoading}=useQuery({queryKey:['dailyReport',date],queryFn:()=>gasGet<{total:number;count:number;rows:{receipt_no:string;student_name:string;centre:string;amount:number;mode:string}[]}>('getDailyCollectionReport',{date}),retry:false,enabled:!IS_DEMO})
  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div><label className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5 block">Date</label><input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-xl border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500"/></div>
      </div>
      {isLoading&&<div className="flex justify-center py-8"><Spinner/></div>}
      {!data&&!isLoading&&<EmptyState icon="📅" title="Connect backend to see daily report"/>}
      {data&&<>
        <div className="grid grid-cols-2 gap-3"><StatCard label="Total Collected" value={INR(data.total)} colour="green"/><StatCard label="Transactions" value={String(data.count)} colour="blue"/></div>
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase"><tr>{['Receipt','Student','Centre','Amount','Mode'].map(h=><th key={h} className="px-4 py-3 text-left font-bold text-gray-500">{h}</th>)}</tr></thead>
        <tbody className="divide-y dark:divide-gray-800">{data.rows.map((r,i)=><tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50"><td className="px-4 py-3 font-mono text-xs">{r.receipt_no}</td><td className="px-4 py-3 font-medium">{r.student_name}</td><td className="px-4 py-3 text-gray-400">{r.centre}</td><td className="px-4 py-3 font-bold text-emerald-600">{INR(r.amount)}</td><td className="px-4 py-3 text-gray-400">{r.mode}</td></tr>)}</tbody></table></div></Card>
      </>}
    </div>
  )
}

function MonthlyTab(){
  const now=new Date(); const [year,setYear]=useState(now.getFullYear()); const [month,setMonth]=useState(now.getMonth()+1)
  const {data,isLoading}=useQuery({queryKey:['monthlyReport',year,month],queryFn:()=>gasGet<{total:number;by_centre:{centre:string;collected:number;count:number}[];by_mode:{mode:string;amount:number}[]}>('getMonthlyCollectionReport',{year,month}),retry:false,enabled:!IS_DEMO})
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <select value={year} onChange={e=>setYear(Number(e.target.value))} className="rounded-xl border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none">{[2024,2025,2026].map(y=><option key={y}>{y}</option>)}</select>
        <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="rounded-xl border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m,i)=><option key={i+1} value={i+1}>{m}</option>)}</select>
      </div>
      {isLoading&&<div className="flex justify-center py-8"><Spinner/></div>}
      {!data&&!isLoading&&<EmptyState icon="📆" title="Connect backend to see monthly report"/>}
      {data&&<>
        <StatCard label="Total Collected" value={INR(data.total)} colour="green"/>
        {data.by_centre.length>0&&<Card><CardBody><h3 className="font-bold mb-3 text-sm text-gray-700 dark:text-gray-300">By Centre</h3><div className="space-y-2">{data.by_centre.map(c=><div key={c.centre} className="flex justify-between items-center text-sm"><span className="text-gray-600 dark:text-gray-400">{c.centre}</span><div className="text-right"><p className="font-bold text-emerald-600">{INR(c.collected)}</p><p className="text-xs text-gray-400">{c.count} payments</p></div></div>)}</div></CardBody></Card>}
        {data.by_mode.length>0&&<Card><CardBody><h3 className="font-bold mb-3 text-sm text-gray-700 dark:text-gray-300">By Payment Mode</h3><div className="space-y-2">{data.by_mode.map(m=><div key={m.mode} className="flex justify-between text-sm"><span className="text-gray-600 dark:text-gray-400">{m.mode}</span><span className="font-bold text-gray-900 dark:text-white">{INR(m.amount)}</span></div>)}</div></CardBody></Card>}
      </>}
    </div>
  )
}

function OverdueTab(){
  const {data,isLoading}=useQuery({queryKey:['overdueReport'],queryFn:()=>gasGet<{total_overdue_amount:number;total_students:number;rows:{student_name:string;phone:string;days_overdue:number;pending_amount:number;due_date:string;centre:string}[]}>('getOverdueReport',{}),retry:false,enabled:!IS_DEMO})
  type OverdueRow = {student_name:string;phone:string;days_overdue:number;pending_amount:number;due_date:string;centre:string}
  const exportCsv=(rows:OverdueRow[]|undefined)=>{
    if(!rows?.length)return
    const csv=['Student,Phone,Centre,Due Date,Days Overdue,Pending',...rows.map(r=>`"${r.student_name}","${r.phone}","${r.centre}","${r.due_date}",${r.days_overdue},${r.pending_amount}`)].join('\n')
    const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='overdue.csv';a.click()
  }
  return (
    <div className="space-y-4">
      {isLoading&&<div className="flex justify-center py-8"><Spinner/></div>}
      {!data&&!isLoading&&<EmptyState icon="🔴" title="Connect backend to see overdue report"/>}
      {data&&<>
        <div className="flex justify-between items-center">
          <div className="grid grid-cols-2 gap-3 flex-1 mr-4"><StatCard label="Total Overdue" value={INR(data.total_overdue_amount)} colour="red"/><StatCard label="Students" value={String(data.total_students)} colour="orange"/></div>
          <button onClick={()=>exportCsv(data.rows)} className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 shrink-0">↓ CSV</button>
        </div>
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase"><tr>{['Student','Phone','Centre','Due Date','Days','Pending'].map(h=><th key={h} className="px-4 py-3 text-left font-bold text-gray-500">{h}</th>)}</tr></thead>
        <tbody className="divide-y dark:divide-gray-800">{data.rows.map((r,i)=><tr key={i}><td className="px-4 py-3 font-medium">{r.student_name}</td><td className="px-4 py-3 text-gray-400">{r.phone}</td><td className="px-4 py-3 text-gray-400">{r.centre}</td><td className="px-4 py-3">{r.due_date}</td><td className="px-4 py-3 font-bold text-red-500">{r.days_overdue}d</td><td className="px-4 py-3 font-black text-red-600">{INR(r.pending_amount)}</td></tr>)}</tbody></table></div></Card>
      </>}
    </div>
  )
}

function CounsellorTab(){
  const {data,isLoading}=useQuery({queryKey:['counsellorReport'],queryFn:()=>gasGet<typeof DEMO_COUNSELLOR>('getCounsellorReport',{}),retry:false,enabled:!IS_DEMO})
  const rows=data??(IS_DEMO?DEMO_COUNSELLOR:[])
  return (
    <div className="space-y-3">
      {isLoading&&<div className="flex justify-center py-8"><Spinner/></div>}
      {rows.map(c=>(
        <Card key={c.counsellor}>
          <CardBody>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1"><p className="font-bold text-gray-900 dark:text-white">{c.counsellor}</p><p className="text-xs text-gray-500">{c.students} students</p></div>
              <div className="flex items-center gap-6 text-center">
                <div><p className="text-lg font-black text-emerald-600">{INR(c.collected)}</p><p className="text-[10px] text-gray-400">collected</p></div>
                <div><p className="text-lg font-black text-red-500">{INR(c.pending)}</p><p className="text-[10px] text-gray-400">pending</p></div>
                <div><p className={`text-lg font-black ${c.collection_pct>=75?'text-emerald-600':c.collection_pct>=60?'text-amber-500':'text-red-500'}`}>{c.collection_pct}%</p><p className="text-[10px] text-gray-400">rate</p></div>
              </div>
            </div>
            <div className="mt-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${c.collection_pct>=75?'bg-emerald-500':c.collection_pct>=60?'bg-amber-400':'bg-red-500'}`} style={{width:`${c.collection_pct}%`}}/>
            </div>
          </CardBody>
        </Card>
      ))}
      {!IS_DEMO&&!isLoading&&rows.length===0&&<EmptyState icon="👤" title="No counsellor data available"/>}
    </div>
  )
}

function LedgerTab(){
  const [sid,setSid]=useState(''); const [query,setQuery]=useState('')
  const {data,isLoading}=useQuery({queryKey:['ledger',query],queryFn:()=>gasGet<{student:Record<string,string>;summary:Record<string,number>;payments:{Receipt_Number:string;Payment_Date:string;Amount:number;Payment_Mode:string}[];installments:{Installment_Number:string;Due_Date:string;Installment_Amount:number;Status:string}[]}>('getStudentLedger',{student_id:query}),enabled:!!query&&!IS_DEMO,retry:false})
  return (
    <div className="space-y-4">
      <form onSubmit={e=>{e.preventDefault();setQuery(sid)}} className="flex gap-2">
        <input value={sid} onChange={e=>setSid(e.target.value)} placeholder="Student ID e.g. STU000001" className="flex-1 rounded-xl border px-3 py-2.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500"/>
        <button type="submit" className="px-4 py-2 rounded-xl text-white text-sm font-bold" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>View Ledger</button>
      </form>
      {!query&&<EmptyState icon="📒" title="Enter Student ID to view complete ledger"/>}
      {isLoading&&<div className="flex justify-center py-8"><Spinner/></div>}
      {data&&<>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total Fee" value={'₹'+data.summary.total_fee.toLocaleString('en-IN')} colour="blue"/>
          <StatCard label="Paid" value={'₹'+data.summary.total_paid.toLocaleString('en-IN')} colour="green"/>
          <StatCard label="Pending" value={'₹'+data.summary.total_pending.toLocaleString('en-IN')} colour="red"/>
        </div>
        <Card><CardBody>
          <h3 className="font-bold mb-3 text-gray-800 dark:text-gray-200 text-sm">Payment History ({data.summary.total_payments} payments)</h3>
          {data.payments.map((p,i)=><div key={i} className="flex justify-between py-2 border-b dark:border-gray-800 text-sm"><div><p className="font-mono text-xs text-gray-400">{p.Receipt_Number}</p><p className="text-gray-600 dark:text-gray-400">{p.Payment_Date} · {p.Payment_Mode}</p></div><p className="font-black text-emerald-600">{'₹'+p.Amount.toLocaleString('en-IN')}</p></div>)}
        </CardBody></Card>
      </>}
    </div>
  )
}

export default function FeeReportsPage() {
  const [tab,setTab]=useState<TabKey>('daily')
  const TABS:{key:TabKey;label:string}[]=[{key:'daily',label:'📅 Daily'},{key:'monthly',label:'📆 Monthly'},{key:'overdue',label:'🔴 Overdue'},{key:'counsellor',label:'👤 Counsellor-wise'},{key:'ledger',label:'📒 Student Ledger'}]
  return (
    <DashboardShell title="Fee Reports">
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">📊 Fee Reports</h1>
        <div className="flex gap-1 flex-wrap bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {TABS.map(t=><button key={t.key} onClick={()=>setTab(t.key)} className={`flex-1 min-w-fit px-3 py-2 rounded-lg text-xs font-semibold transition-all ${tab===t.key?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500'}`}>{t.label}</button>)}
        </div>
        {tab==='daily'&&<DailyTab/>}
        {tab==='monthly'&&<MonthlyTab/>}
        {tab==='overdue'&&<OverdueTab/>}
        {tab==='counsellor'&&<CounsellorTab/>}
        {tab==='ledger'&&<LedgerTab/>}
      </div>
    </DashboardShell>
  )
}
