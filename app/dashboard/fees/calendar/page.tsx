'use client'
import { useState } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge } from '@/components/ui'
import { useQuery } from '@tanstack/react-query'
import { gasGet } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
type Colour = 'green'|'yellow'|'orange'|'red'|'blue'
interface Entry { date:string; installment_id:string; installment_no:number; student_id:string; student_name:string; phone:string; centre:string; course:string; due_amount:number; pending_amount:number; days_overdue:number; status:string; colour:Colour }
const DOT:Record<Colour,string> = { green:'bg-green-500',yellow:'bg-yellow-400',orange:'bg-orange-400',red:'bg-red-500',blue:'bg-blue-400' }
const BVARIANT = (c:Colour) => c==='green'?'success':c==='red'||c==='orange'?'danger':'warning' as const

export default function FeeCalendarPage() {
  const today = new Date()
  const [year,setYear] = useState(today.getFullYear())
  const [month,setMonth] = useState(today.getMonth()+1)
  const [sel,setSel] = useState<string|null>(null)

  const { data } = useQuery({ queryKey:['feeCalendar',year,month], queryFn:()=>gasGet<Record<string,Entry[]>>('getFeeCalendar',{year,month}), retry:false })
  const entries = data ?? {}
  const firstDay = new Date(year,month-1,1).getDay()
  const dim = new Date(year,month,0).getDate()
  const cells = Array.from({length:firstDay+dim},(_,i)=>i<firstDay?null:i-firstDay+1)

  const selEntries = sel ? (entries[sel]??[]) : []

  function nav(d:1|-1) {
    setSel(null)
    if(d===1){ if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1) }
    else{ if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1) }
  }

  return (
    <DashboardShell title="Fee Calendar">
      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">📅 Fee Calendar</h1>
          <div className="flex items-center gap-2">
            <button onClick={()=>nav(-1)} className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">◀</button>
            <span className="font-semibold min-w-[140px] text-center text-gray-800 dark:text-gray-200">{MONTHS[month-1]} {year}</span>
            <button onClick={()=>nav(1)} className="p-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-800">▶</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          {([['bg-green-500','Paid'],['bg-yellow-400','Due Today'],['bg-orange-400','Due Soon'],['bg-red-500','Overdue'],['bg-blue-400','Upcoming']] as const).map(([cls,label])=>(
            <span key={label} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${cls}`}/><span className="text-gray-600 dark:text-gray-300">{label}</span></span>
          ))}
        </div>
        <Card>
          <CardBody>
            <div className="grid grid-cols-7 mb-2">{DAYS.map(d=><div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((day,i)=>{
                if(!day) return <div key={`e${i}`}/>
                const ds = `${year}-${('0'+month).slice(-2)}-${('0'+day).slice(-2)}`
                const de = entries[ds]??[]
                const isToday = today.getDate()===day && today.getMonth()+1===month && today.getFullYear()===year
                return (
                  <button key={day} onClick={()=>de.length?setSel(sel===ds?null:ds):undefined}
                    className={`min-h-[70px] w-full p-1.5 rounded-lg text-left border transition-all ${isToday?'ring-2 ring-blue-400':''} ${sel===ds?'bg-blue-50 dark:bg-blue-900/20':''} ${de.length?'hover:bg-blue-50 dark:hover:bg-blue-900/20 border-gray-200 dark:border-gray-700 cursor-pointer':'border-transparent cursor-default'}`}>
                    <span className={`text-xs font-semibold ${de.length?'text-gray-800 dark:text-gray-200':'text-gray-300 dark:text-gray-600'}`}>{day}</span>
                    {de.length>0 && <div className="mt-0.5"><div className="flex gap-0.5">{[...new Set(de.map(e=>e.colour))].slice(0,3).map((c,ci)=><span key={ci} className={`w-2 h-2 rounded-full ${DOT[c as Colour]}`}/>)}</div><span className="text-[10px] text-gray-400">{de.length} due</span></div>}
                  </button>
                )
              })}
            </div>
          </CardBody>
        </Card>
        {sel && (
          <Card>
            <CardBody>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-semibold text-gray-800 dark:text-gray-200">📅 {sel} — {selEntries.length} due</h2>
                <button onClick={()=>setSel(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
              </div>
              {selEntries.length===0 ? <p className="text-sm text-gray-400">No dues on this date.</p> : (
                <div className="divide-y dark:divide-gray-800">
                  {selEntries.map(e=>(
                    <div key={e.installment_id} className="py-3 flex flex-col sm:flex-row sm:justify-between gap-2">
                      <div><p className="font-medium text-gray-800 dark:text-gray-200">{e.student_name}</p><p className="text-xs text-gray-500">{e.phone} · {e.centre} · {e.course}</p><p className="text-xs text-gray-500">Inst #{e.installment_no}</p>{e.days_overdue>0&&<p className="text-xs text-red-500">{e.days_overdue} days overdue</p>}</div>
                      <div className="text-right"><p className="font-bold text-gray-900 dark:text-white">{fmt(e.pending_amount)}</p><Badge variant={BVARIANT(e.colour as Colour)}>{e.status}</Badge></div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
