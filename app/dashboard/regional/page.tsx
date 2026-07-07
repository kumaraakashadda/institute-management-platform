'use client'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { StatCard, Card, CardBody, CardHeader } from '@/components/ui'
import { CentreComparisonChart, AttendanceTrendChart, FeeCollectionChart } from '@/components/charts'
import { fmt } from '@/lib/utils/helpers'

const CENTRES = [
  {centre:'Delhi-Rohini',pct:87,students:124},{centre:'Delhi-Dwarka',pct:82,students:98},
  {centre:'Noida-Sec18',pct:79,students:87},{centre:'Gurgaon',pct:91,students:63},
]
const TREND = Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-29+i); const pct=70+Math.round(Math.random()*20); return {date:`${d.getDate()}/${d.getMonth()+1}`,present:Math.round(pct*3.7),absent:Math.round((100-pct)*3.7),pct} })
const FEE_TREND = ['Aug','Sep','Oct','Nov','Dec'].map(m=>({month:m,collected:800000+Math.round(Math.random()*400000),pending:200000+Math.round(Math.random()*200000)}))

export default function RegionalDashboardPage() {
  return (
    <DashboardShell title="Regional Dashboard">
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">🗺️ Regional Dashboard</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Total Centres"   value="4"      colour="blue"   icon="🏫"/>
          <StatCard label="Total Students"  value="372"    colour="green"  icon="🎓" sub="across 4 centres"/>
          <StatCard label="Avg Attendance"  value="85%"    colour="purple" icon="📊"/>
          <StatCard label="Monthly Collection" value={fmt(1540000)} colour="teal" icon="💰"/>
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <CentreComparisonChart data={CENTRES}/>
          <AttendanceTrendChart data={TREND}/>
        </div>
        <FeeCollectionChart data={FEE_TREND}/>
        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Centre Ranking</h2></CardHeader>
          <div className="divide-y dark:divide-gray-800">
            {CENTRES.sort((a,b)=>b.pct-a.pct).map((c,i)=>(
              <div key={c.centre} className="flex items-center gap-4 px-5 py-3">
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white text-sm font-black ${i===0?'bg-amber-400':i===1?'bg-gray-400':i===2?'bg-orange-600':'bg-gray-300 dark:bg-gray-700'}`}>{i+1}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-white text-sm">{c.centre}</p>
                  <p className="text-xs text-gray-400">{c.students} students</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                    <div className={`h-2 rounded-full ${c.pct>=85?'bg-emerald-500':c.pct>=75?'bg-blue-400':'bg-amber-400'}`} style={{width:`${c.pct}%`}}/>
                  </div>
                  <span className={`text-sm font-black w-10 text-right ${c.pct>=85?'text-emerald-600':c.pct>=75?'text-blue-600':'text-amber-500'}`}>{c.pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </DashboardShell>
  )
}
