'use client'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, StatCard, Spinner, EmptyState } from '@/components/ui'
import { SubjectBarChart } from '@/components/charts'
import { gasGet, IS_DEMO } from '@/lib/gasClient'

const DEMO_PERF = [
  {batch:'JEE-2026-A',course:'JEE Advanced',subject:'Physics',sessions:42,total_marks:1890,present_marks:1642,pct:87},
  {batch:'JEE-2026-A',course:'JEE Advanced',subject:'Maths',sessions:40,total_marks:1800,present_marks:1638,pct:91},
  {batch:'JEE-2026-A',course:'JEE Advanced',subject:'Chemistry',sessions:38,total_marks:1710,present_marks:1231,pct:72},
]

export default function TeacherPerformancePage() {
  const {data,isLoading} = useQuery({
    queryKey:['batchPerf'], queryFn:()=>gasGet<typeof DEMO_PERF>('getBatchPerformance',{}), retry:false, enabled:!IS_DEMO
  })
  const perf = data??(IS_DEMO?DEMO_PERF:[])
  const avg = perf.length?Math.round(perf.reduce((s,p)=>s+p.pct,0)/perf.length):0

  return (
    <DashboardShell title="Batch Performance">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">📊 My Batch Performance</h1>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="Total Batches"   value={String(new Set(perf.map(p=>p.batch)).size)} colour="blue" icon="👥"/>
          <StatCard label="Total Sessions"  value={String(perf.reduce((s,p)=>s+p.sessions,0))} colour="indigo" icon="📋"/>
          <StatCard label="Subjects Taught" value={String(perf.length)} colour="purple" icon="📚"/>
          <StatCard label="Avg Attendance"  value={`${avg}%`} colour={avg>=75?'green':'orange'} icon="📊"/>
        </div>
        {perf.length>0&&<SubjectBarChart data={perf.map(p=>({subject:`${p.subject} (${p.batch})`,pct:p.pct}))}/>}
        {isLoading&&<div className="flex justify-center py-8"><Spinner/></div>}
        {!isLoading&&perf.length===0&&!IS_DEMO&&<EmptyState icon="📊" title="No performance data yet" message="Data appears after sessions are completed."/>}
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Subject Breakdown</h2></CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {perf.map((p,i)=>(
              <div key={i} className="px-5 py-4">
                <div className="flex items-center justify-between mb-1">
                  <div><p className="font-bold text-sm text-gray-900 dark:text-white">{p.subject}</p><p className="text-xs text-gray-400">{p.batch} · {p.course} · {p.sessions} sessions</p></div>
                  <span className={`text-xl font-black ${p.pct>=75?'text-emerald-600':p.pct>=60?'text-amber-500':'text-red-500'}`}>{p.pct}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div className={`h-2 rounded-full ${p.pct>=75?'bg-emerald-500':p.pct>=60?'bg-amber-400':'bg-red-500'}`} style={{width:`${p.pct}%`}}/>
                </div>
                <p className="text-xs text-gray-400 mt-1">{p.present_marks} / {p.total_marks} present</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  )
}
