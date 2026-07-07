'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge, Spinner } from '@/components/ui'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { fmt, fmtDate } from '@/lib/utils/helpers'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DSHT   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const DFULL  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
type Colour  = 'green'|'yellow'|'orange'|'red'|'blue'
type ViewMode= 'month'|'week'|'day'
interface Ent {
  Installment_ID:string;Installment_Number:string;Due_Date:string;Pending_Amount:number
  Installment_Amount:number;Status:string;student_name:string;phone:string;centre:string
  course:string;batch:string;days_overdue:number;days_until_due:number;colour:Colour;counsellor:string
}
const DOT:Record<Colour,string>={green:'bg-emerald-500',yellow:'bg-yellow-400',orange:'bg-orange-400',red:'bg-red-500',blue:'bg-blue-400'}
const BV:Record<Colour,'success'|'warning'|'danger'|'info'|'default'>={green:'success',yellow:'warning',orange:'warning',red:'danger',blue:'info'}

function genDemoMonth(y:number,m:number):Record<string,Ent[]>{
  const dim=new Date(y,m,0).getDate(); const data:Record<string,Ent[]>={};
  const names=['Rahul Verma','Priya Sharma','Arjun Mehta','Kavya Reddy','Rohit Kumar','Ananya Singh']
  for(let d=1;d<=dim;d++){
    if(new Date(y,m-1,d).getDay()===0||Math.random()>0.6)continue
    const ds=`${y}-${('0'+m).slice(-2)}-${('0'+d).slice(-2)}`
    const diff=Math.round((new Date(ds).getTime()-new Date().setHours(0,0,0,0))/86400000)
    const colour:Colour=diff<-7?'red':diff<0?'orange':diff===0?'yellow':'blue'
    data[ds]=[{Installment_ID:`I${d}`,Installment_Number:String(Math.ceil(d/10)),Due_Date:ds,Pending_Amount:15000+Math.round(Math.random()*20000),Installment_Amount:35000,Status:diff<0?'Overdue':'Pending',student_name:names[d%names.length],phone:`9876543${200+d}`,centre:'Delhi Rohini',course:'JEE Advanced',batch:'JEE-2026-A',days_overdue:diff<0?Math.abs(diff):0,days_until_due:diff>0?diff:0,colour,counsellor:'Rohit Singh'}]
  }
  return data
}

function EntCard({e}:{e:Ent}){return(
  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{e.student_name}</p>
      <Badge variant={BV[e.colour]}>{e.days_overdue>0?`${e.days_overdue}d overdue`:e.days_until_due===0?'Due Today':`in ${e.days_until_due}d`}</Badge>
    </div>
    <p className="text-xs text-gray-500">{e.phone} · {e.centre} · {e.batch} · Inst #{e.Installment_Number}</p>
    {e.counsellor&&<p className="text-xs text-gray-400">Counsellor: {e.counsellor}</p>}
    <div className="flex justify-between items-center mt-1"><span className="text-xs text-gray-400">Pending</span><span className={`font-black text-sm ${e.colour==='red'?'text-red-500':e.colour==='orange'?'text-orange-500':e.colour==='yellow'?'text-amber-500':'text-blue-600'}`}>{fmt(e.Pending_Amount)}</span></div>
  </div>
)}

function MonthView({year,month}:{year:number;month:number}){
  const [sel,setSel]=useState<string|null>(null)
  const {data}=useQuery({queryKey:['feeCalMonth',year,month],queryFn:()=>gasGet<Record<string,Ent[]>>('getFeeCalendar',{year,month}),retry:false,enabled:!IS_DEMO})
  const cal=data??(IS_DEMO?genDemoMonth(year,month):{})
  const fd=new Date(year,month-1,1).getDay(); const dim=new Date(year,month,0).getDate()
  const cells=Array.from({length:fd+dim},(_,i)=>i<fd?null:i-fd+1)
  const selE=sel?(cal[sel]??[]):[]
  return(
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 text-xs">
        {([['bg-emerald-500','Paid'],['bg-yellow-400','Due Today'],['bg-orange-400','Due ≤7d'],['bg-red-500','Overdue'],['bg-blue-400','Upcoming']] as const).map(([c,l])=>(
          <span key={l} className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-full ${c}`}/><span className="text-gray-500 dark:text-gray-400">{l}</span></span>
        ))}
      </div>
      <Card><CardBody>
        <div className="grid grid-cols-7 mb-2">{DSHT.map(d=><div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-0.5">
          {cells.map((day,i)=>{
            if(!day)return<div key={`e${i}`}/>
            const ds=`${year}-${('0'+month).slice(-2)}-${('0'+day).slice(-2)}`
            const entries=cal[ds]??[];const td=new Date();const isToday=td.getDate()===day&&td.getMonth()+1===month&&td.getFullYear()===year
            const colours=[...new Set(entries.map(e=>e.colour))] as Colour[]
            return(
              <button key={day} onClick={()=>entries.length?setSel(sel===ds?null:ds):undefined}
                className={`min-h-[68px] w-full p-1.5 rounded-xl text-left border transition-all ${isToday?'ring-2 ring-blue-400':''} ${sel===ds?'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700':entries.length?'border-gray-100 dark:border-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer':'border-transparent cursor-default'}`}>
                <span className={`text-xs font-semibold block ${entries.length?'text-gray-800 dark:text-gray-200':'text-gray-300 dark:text-gray-600'}`}>{day}</span>
                {entries.length>0&&<div className="mt-0.5"><div className="flex gap-0.5">{colours.slice(0,3).map((c,ci)=><span key={ci} className={`w-2 h-2 rounded-full ${DOT[c]}`}/>)}</div><span className="text-[10px] text-gray-400">{entries.length} · {fmt(entries.reduce((s,e)=>s+e.Pending_Amount,0))}</span></div>}
              </button>
            )
          })}
        </div>
      </CardBody></Card>
      {sel&&selE.length>0&&<Card><CardBody>
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-bold text-gray-800 dark:text-gray-200">📅 {fmtDate(sel)} — {selE.length} due · {fmt(selE.reduce((s,e)=>s+e.Pending_Amount,0))}</h2>
          <button onClick={()=>setSel(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
        </div>
        <div className="space-y-3">{selE.map((e,i)=><EntCard key={i} e={e}/>)}</div>
      </CardBody></Card>}
    </div>
  )
}

function WeekView({start}:{start:Date}){
  const ds=start.toISOString().split('T')[0]
  const {data,isLoading}=useQuery({queryKey:['feeCalWeek',ds],queryFn:()=>gasGet<Record<string,Ent[]>>('getFeeWeekView',{start_date:ds}),retry:false,enabled:!IS_DEMO})
  const days=Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return{d,ds:d.toISOString().split('T')[0],isToday:d.toDateString()===new Date().toDateString()}})
  const cal:Record<string,Ent[]>=data??(IS_DEMO?Object.fromEntries(days.map(({d,ds})=>[ds,genDemoMonth(d.getFullYear(),d.getMonth()+1)[ds]||[]])):{}
  )
  if(isLoading)return<div className="flex justify-center py-12"><Spinner size="lg"/></div>
  return(
    <div className="grid grid-cols-7 gap-2">
      {days.map(({d,ds,isToday})=>{
        const entries=cal[ds]??[]
        return(
          <div key={ds} className={`rounded-2xl border overflow-hidden ${isToday?'border-blue-400 ring-2 ring-blue-300':'border-gray-100 dark:border-gray-800'}`}>
            <div className={`px-2 py-1.5 text-center ${isToday?'bg-blue-600 text-white':'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'}`}>
              <p className="text-[10px] font-bold uppercase">{DSHT[d.getDay()]}</p>
              <p className="text-lg font-black">{d.getDate()}</p>
            </div>
            <div className="p-1.5 space-y-1.5 min-h-[100px] bg-white dark:bg-gray-900">
              {entries.map((e,i)=>(
                <div key={i} className={`p-1.5 rounded-lg text-[10px] border-l-2 ${e.colour==='red'?'border-red-400 bg-red-50 dark:bg-red-900/20':e.colour==='orange'?'border-orange-400 bg-orange-50 dark:bg-orange-900/20':e.colour==='yellow'?'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20':'border-blue-400 bg-blue-50 dark:bg-blue-900/20'}`}>
                  <p className="font-semibold text-gray-800 dark:text-gray-200 truncate">{e.student_name.split(' ')[0]}</p>
                  <p className="font-bold text-gray-600 dark:text-gray-400">{fmt(e.Pending_Amount)}</p>
                </div>
              ))}
              {!entries.length&&<p className="text-[9px] text-gray-300 dark:text-gray-700 text-center mt-4">No dues</p>}
            </div>
            {entries.length>0&&<div className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-center"><p className="text-[10px] font-bold text-gray-500">{entries.length} · {fmt(entries.reduce((s,e)=>s+e.Pending_Amount,0))}</p></div>}
          </div>
        )
      })}
    </div>
  )
}

function DayView({date}:{date:Date}){
  const ds=date.toISOString().split('T')[0]
  const {data,isLoading}=useQuery({queryKey:['feeCalDay',ds],queryFn:()=>gasGet<Ent[]>('getFeeDayView',{date:ds}),retry:false,enabled:!IS_DEMO})
  const entries=data??(IS_DEMO?(genDemoMonth(date.getFullYear(),date.getMonth()+1)[ds]??[]):[])
  const total=entries.reduce((s,e)=>s+e.Pending_Amount,0)
  if(isLoading)return<div className="flex justify-center py-12"><Spinner size="lg"/></div>
  return(
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card><CardBody className="text-center py-3"><p className="text-2xl font-black text-blue-600">{entries.length}</p><p className="text-xs text-gray-400">Installments Due</p></CardBody></Card>
        <Card><CardBody className="text-center py-3"><p className="text-2xl font-black text-red-500">{entries.filter(e=>e.days_overdue>0).length}</p><p className="text-xs text-gray-400">Overdue</p></CardBody></Card>
        <Card><CardBody className="text-center py-3"><p className="text-xl font-black text-orange-500">{fmt(total)}</p><p className="text-xs text-gray-400">Total Pending</p></CardBody></Card>
      </div>
      {!entries.length?<Card><CardBody><div className="text-center py-12 text-gray-400"><p className="text-4xl mb-3">📅</p><p>No installments due on {fmtDate(ds)}</p></div></CardBody></Card>
      :<div className="space-y-3">{entries.map((e,i)=><EntCard key={i} e={e}/>)}</div>}
    </div>
  )
}

export default function FeeCalendarPage(){
  const today=new Date()
  const [view,setView]=useState<ViewMode>('month')
  const [year,setYear]=useState(today.getFullYear())
  const [month,setMonth]=useState(today.getMonth()+1)
  const [wkStart,setWkStart]=useState(()=>{const d=new Date(today);d.setDate(d.getDate()-d.getDay());return d})
  const [dayDate,setDayDate]=useState(today)

  function navM(d:1|-1){if(d===1){if(month===12){setMonth(1);setYear(y=>y+1)}else setMonth(m=>m+1)}else{if(month===1){setMonth(12);setYear(y=>y-1)}else setMonth(m=>m-1)}}
  function navW(d:7|-7){setWkStart(w=>{const n=new Date(w);n.setDate(n.getDate()+d);return n})}
  function navD(d:1|-1){setDayDate(dt=>{const n=new Date(dt);n.setDate(n.getDate()+d);return n})}

  const wkEnd=new Date(wkStart);wkEnd.setDate(wkStart.getDate()+6)
  const label=view==='month'?`${MONTHS[month-1]} ${year}`:view==='week'?`${wkStart.getDate()} ${MONTHS[wkStart.getMonth()].slice(0,3)} – ${wkEnd.getDate()} ${MONTHS[wkEnd.getMonth()].slice(0,3)} ${wkEnd.getFullYear()}`:`${DFULL[dayDate.getDay()]}, ${fmtDate(dayDate.toISOString().split('T')[0])}`

  return(
    <DashboardShell title="Fee Calendar">
      <div className="p-4 md:p-6 space-y-5 max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">📅 Fee Calendar</h1>
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
            {(['month','week','day'] as const).map(v=><button key={v} onClick={()=>setView(v)} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${view===v?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500'}`}>{v}</button>)}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={()=>view==='month'?navM(-1):view==='week'?navW(-7):navD(-1)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">◀</button>
          <span className="font-bold text-gray-800 dark:text-gray-200 text-sm sm:text-base text-center">{label}</span>
          <button onClick={()=>view==='month'?navM(1):view==='week'?navW(7):navD(1)} className="p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300">▶</button>
        </div>
        {view==='month'&&<MonthView year={year} month={month}/>}
        {view==='week'&&<WeekView start={wkStart}/>}
        {view==='day'&&<DayView date={dayDate}/>}
      </div>
    </DashboardShell>
  )
}
