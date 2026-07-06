'use client'
import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, StatCard, EmptyState } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { gasGet } from '@/lib/gasClient'
import { fmt, fmtDate } from '@/lib/utils/helpers'

const today = new Date().toISOString().split('T')[0]

function DailyTab() {
  const [date,setDate] = useState(today)
  const { data, isLoading } = useQuery({ queryKey:['dailyReport',date], queryFn:()=>gasGet<{total:number;count:number;rows:{receipt_no:string;student_name:string;centre:string;amount:number;mode:string;date:string}[]}>('getDailyCollectionReport',{date}), retry:false })
  return (
    <div className="space-y-4">
      <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="rounded-lg border px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"/>
      {isLoading&&<div className="text-sm text-gray-400 animate-pulse">Loading…</div>}
      {!data&&!isLoading&&<EmptyState icon="📅" title="Connect backend to see daily report" message="Set NEXT_PUBLIC_GAS_URL in Vercel environment variables"/>}
      {data&&<>
        <div className="grid grid-cols-2 gap-3"><StatCard label="Total Collected" value={fmt(data.total)} colour="green"/><StatCard label="Transactions" value={String(data.count)} colour="blue"/></div>
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase"><tr>{['Receipt','Student','Centre','Amount','Mode'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
        <tbody className="divide-y dark:divide-gray-800">{data.rows.map((r,i)=><tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50"><td className="px-4 py-2 font-mono text-xs">{r.receipt_no}</td><td className="px-4 py-2">{r.student_name}</td><td className="px-4 py-2 text-gray-400">{r.centre}</td><td className="px-4 py-2 font-semibold text-green-600">{fmt(r.amount)}</td><td className="px-4 py-2 text-gray-400">{r.mode}</td></tr>)}</tbody></table></div></Card>
      </>}
    </div>
  )
}

function OverdueTab() {
  const { data, isLoading } = useQuery({ queryKey:['overdueReport'], queryFn:()=>gasGet<{total_overdue_amount:number;total_students:number;rows:{student_name:string;phone:string;days_overdue:number;pending_amount:number;due_date:string;centre:string}[]}>('getOverdueReport',{}), retry:false })
  return (
    <div className="space-y-4">
      {isLoading&&<div className="text-sm text-gray-400 animate-pulse">Loading…</div>}
      {!data&&!isLoading&&<EmptyState icon="🔴" title="Connect backend to see overdue report"/>}
      {data&&<>
        <div className="grid grid-cols-2 gap-3"><StatCard label="Total Overdue" value={fmt(data.total_overdue_amount)} colour="red"/><StatCard label="Students" value={String(data.total_students)} colour="orange"/></div>
        <Card><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-gray-50 dark:bg-gray-800 text-xs text-gray-500 uppercase"><tr>{['Student','Phone','Centre','Due Date','Days','Pending'].map(h=><th key={h} className="px-4 py-2 text-left">{h}</th>)}</tr></thead>
        <tbody className="divide-y dark:divide-gray-800">{data.rows.map((r,i)=><tr key={i}><td className="px-4 py-2 font-medium">{r.student_name}</td><td className="px-4 py-2 text-gray-400">{r.phone}</td><td className="px-4 py-2 text-gray-400">{r.centre}</td><td className="px-4 py-2">{fmtDate(r.due_date)}</td><td className="px-4 py-2 font-semibold text-red-500">{r.days_overdue}d</td><td className="px-4 py-2 font-bold text-red-600">{fmt(r.pending_amount)}</td></tr>)}</tbody></table></div></Card>
      </>}
    </div>
  )
}

export default function FeeReportsPage() {
  const [tab,setTab] = useState<'daily'|'overdue'>('daily')
  return (
    <DashboardShell title="Fee Reports">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📊 Fee Reports</h1>
        <div className="flex gap-2 border-b dark:border-gray-800">
          {[['daily','📅 Daily Collection'],['overdue','🔴 Overdue']].map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k as typeof tab)} className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab===k?'border-blue-600 text-blue-600 dark:text-blue-400':'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>{l}</button>
          ))}
        </div>
        {tab==='daily'&&<DailyTab/>}
        {tab==='overdue'&&<OverdueTab/>}
      </div>
    </DashboardShell>
  )
}
