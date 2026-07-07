'use client'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Select, Alert, Spinner } from '@/components/ui'
import { AttendanceTrendChart, FeeCollectionChart, CentreComparisonChart } from '@/components/charts'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { fmt } from '@/lib/utils/helpers'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const YEARS  = ['2024','2025','2026']

const REPORT_TYPES = [
  { id:'attendance', label:'Attendance Report',   icon:'📊', colour:'#2563EB', desc:'Daily, weekly, monthly attendance across centres, batches, and subjects' },
  { id:'fee',        label:'Fee Collection',      icon:'💰', colour:'#059669', desc:'Daily and monthly collection reports, pending fees, overdue installments' },
  { id:'defaulters', label:'Defaulters Report',   icon:'⚠️', colour:'#D97706', desc:'Students below attendance threshold and fee defaulters' },
  { id:'admission',  label:'Admission Report',    icon:'📋', colour:'#7C3AED', desc:'New admissions, counsellor-wise, centre-wise, course-wise breakdown' },
  { id:'centre',     label:'Centre Comparison',   icon:'🏫', colour:'#DC2626', desc:'Compare performance across all centres — attendance, collection, students' },
  { id:'teacher',    label:'Teacher Report',      icon:'👨‍🏫', colour:'#0891B2', desc:'Sessions conducted, subject-wise attendance, batch performance' },
]

// Demo data for charts
const DEMO_TREND = Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-29+i); const p=70+Math.round(Math.random()*20); return {date:`${d.getDate()}/${d.getMonth()+1}`,present:Math.round(p*1.5),absent:Math.round((100-p)*1.5),pct:p} })
const DEMO_FEE   = MONTHS.slice(0,7).map(m=>({ month:m, collected:200000+Math.round(Math.random()*150000), pending:50000+Math.round(Math.random()*80000) }))
const DEMO_CENTRES = [{centre:'Delhi Rohini',pct:87,students:124},{centre:'Delhi Dwarka',pct:82,students:98},{centre:'Noida Sec18',pct:79,students:87},{centre:'Gurgaon',pct:91,students:63}]

const DEMO_DEFAULTERS = [
  {name:'Arjun Kumar',   id:'STU000003', phone:'9876543212', centre:'Delhi Rohini', batch:'JEE-2026-A', att:62, absent:38, last_present:'2025-11-20'},
  {name:'Vikram Yadav',  id:'STU000005', phone:'9876543214', centre:'Gurgaon',      batch:'NEET-2026-A',att:55, absent:45, last_present:'2025-11-15'},
  {name:'Meera Gupta',   id:'STU000006', phone:'9876543215', centre:'Delhi Rohini', batch:'JEE-2027-A', att:0,  absent:100,last_present:'Never'},
  {name:'Anjali Sharma', id:'STU000008', phone:'9876543217', centre:'Delhi Dwarka', batch:'NEET-2026-B',att:73, absent:27, last_present:'2025-11-28'},
]

const DEMO_ADMIT = [
  {month:'Apr 24',count:8,course:'JEE Advanced'},{month:'May 24',count:5,course:'NEET'},
  {month:'Jun 24',count:12,course:'JEE Advanced'},{month:'Jul 24',count:7,course:'Foundation'},
  {month:'Aug 24',count:15,course:'NEET'},{month:'Sep 24',count:10,course:'JEE Advanced'},
]

type ReportId = typeof REPORT_TYPES[0]['id']

export default function ReportsPage() {
  const [active, setActive] = useState<ReportId>('attendance')
  const [centre, setCentre] = useState('')
  const [month, setMonth]   = useState('')
  const [year, setYear]     = useState('2025')
  const [exporting, setExporting] = useState(false)

  async function exportReport(format: 'csv'|'pdf') {
    setExporting(true)
    await new Promise(r => setTimeout(r, 800))
    if (format === 'csv') {
      // Generate demo CSV
      const rows = active === 'defaulters'
        ? [['Name','ID','Phone','Centre','Batch','Attendance%','Absent Days'],
           ...DEMO_DEFAULTERS.map(d => [d.name,d.id,d.phone,d.centre,d.batch,d.att+'%',d.absent])]
        : [['Month','Collected','Pending'],
           ...DEMO_FEE.map(r => [r.month, r.collected, r.pending])]
      const csv = rows.map(r => r.join(',')).join('\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'}))
      a.download = `IMP_${active}_report_${year}.csv`
      a.click()
    } else {
      window.print()
    }
    setExporting(false)
  }

  return (
    <DashboardShell title="Reports">
      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📊 Reports</h1>
            <p className="text-sm text-gray-500 mt-0.5">Analytics and exports for all modules</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => exportReport('csv')} disabled={exporting}>
              {exporting ? '⏳' : '📥'} Export CSV
            </Button>
            <Button variant="secondary" onClick={() => exportReport('pdf')} disabled={exporting}>
              🖨 Export PDF
            </Button>
          </div>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — charts show simulated data. Connect backend for real reports.</Alert>}

        {/* Report type selector */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {REPORT_TYPES.map(r => (
            <button key={r.id} onClick={() => setActive(r.id)}
              className={`p-3 rounded-2xl border text-left transition-all ${active===r.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-sm' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:shadow-md'}`}>
              <div className="text-2xl mb-1.5">{r.icon}</div>
              <p className={`text-xs font-bold leading-tight ${active===r.id?'text-blue-700 dark:text-blue-300':'text-gray-700 dark:text-gray-300'}`}>{r.label}</p>
            </button>
          ))}
        </div>

        {/* Filters */}
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Select value={year} onChange={e => setYear(e.target.value)} className="w-28">
                {YEARS.map(y => <option key={y}>{y}</option>)}
              </Select>
              <Select value={month} onChange={e => setMonth(e.target.value)} className="w-36">
                <option value="">All Months</option>
                {MONTHS.map(m => <option key={m}>{m}</option>)}
              </Select>
              <Select value={centre} onChange={e => setCentre(e.target.value)} className="w-48">
                <option value="">All Centres</option>
                {DEMO_CENTRES.map(c => <option key={c.centre}>{c.centre}</option>)}
              </Select>
              <div className="ml-auto flex items-center gap-2">
                <Badge variant={IS_DEMO?'warning':'success'}>{IS_DEMO?'Demo Data':'Live Data'}</Badge>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ── ATTENDANCE REPORT ── */}
        {active === 'attendance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[['Avg Attendance','84%','text-blue-600'],['Total Sessions','248','text-purple-600'],['Present Marks','12,400','text-emerald-600'],['Absent Marks','2,360','text-red-500']].map(([l,v,c])=>(
                <div key={l} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
                  <p className={`text-2xl font-black ${c}`}>{v}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <AttendanceTrendChart data={DEMO_TREND} />
            <CentreComparisonChart data={DEMO_CENTRES} />
          </div>
        )}

        {/* ── FEE REPORT ── */}
        {active === 'fee' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[['Total Collected',fmt(1420000),'text-emerald-600'],['Total Pending',fmt(380000),'text-red-500'],['Collection %','79%','text-blue-600'],['This Month',fmt(210000),'text-purple-600']].map(([l,v,c])=>(
                <div key={l} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
                  <p className={`text-2xl font-black ${c}`}>{v}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <FeeCollectionChart data={DEMO_FEE} />
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Centre-wise Collection</h2></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 dark:bg-gray-800/50">{['Centre','Students','Total Fee','Collected','Pending','%'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase">{h}</th>)}</tr></thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {DEMO_CENTRES.map(c=>(
                      <tr key={c.centre} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{c.centre}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.students}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{fmt(c.students*120000)}</td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">{fmt(Math.round(c.students*120000*c.pct/100))}</td>
                        <td className="px-4 py-3 text-red-500 font-semibold">{fmt(Math.round(c.students*120000*(100-c.pct)/100))}</td>
                        <td className="px-4 py-3"><Badge variant={c.pct>=80?'success':c.pct>=60?'warning':'danger'}>{c.pct}%</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── DEFAULTERS ── */}
        {active === 'defaulters' && (
          <div className="space-y-4">
            <Alert variant="warning">These students are below the 75% attendance threshold. Immediate follow-up required.</Alert>
            <div className="grid grid-cols-3 gap-3">
              {[['Below 75%','4','text-red-600'],['Below 60%','2','text-red-700'],['Never Attended','1','text-gray-500']].map(([l,v,c])=>(
                <div key={l} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
                  <p className={`text-3xl font-black ${c}`}>{v}</p><p className="text-xs text-gray-500 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Attendance Defaulters</h2></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 dark:bg-gray-800/50">{['Student','ID','Phone','Centre','Batch','Attendance','Absent','Last Present'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {DEMO_DEFAULTERS.map(d=>(
                      <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{d.name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-blue-600">{d.id}</td>
                        <td className="px-4 py-3 text-gray-500 font-mono text-xs">{d.phone}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{d.centre}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400">{d.batch}</td>
                        <td className="px-4 py-3"><Badge variant={d.att>=60?'warning':'danger'}>{d.att}%</Badge></td>
                        <td className="px-4 py-3 text-red-500 font-semibold text-xs">{d.absent} days</td>
                        <td className="px-4 py-3 text-xs text-gray-400">{d.last_present}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── ADMISSION REPORT ── */}
        {active === 'admission' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[['Total Admissions','57','text-blue-600'],['This Month','12','text-purple-600'],['Active Students','51','text-emerald-600'],['Inactive','6','text-gray-500']].map(([l,v,c])=>(
                <div key={l} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 text-center">
                  <p className={`text-3xl font-black ${c}`}>{v}</p><p className="text-xs text-gray-500 mt-0.5">{l}</p>
                </div>
              ))}
            </div>
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Monthly Admissions</h2></CardHeader>
              <CardBody>
                <div className="flex gap-2 flex-wrap">
                  {DEMO_ADMIT.map(a=>(
                    <div key={a.month} className="flex flex-col items-center">
                      <div className="w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg relative" style={{height:120}}>
                        <div className="absolute bottom-0 left-0 right-0 bg-blue-500 rounded-lg" style={{height:`${(a.count/15)*100}%`}}/>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">{a.month}</p>
                      <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{a.count}</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Course-wise Breakdown</h2></CardHeader>
              <CardBody>
                {[['JEE Advanced',24,42],['NEET',18,32],['Foundation',9,16],['CUET',6,10]].map(([c,n,pct])=>(
                  <div key={c as string} className="mb-3">
                    <div className="flex justify-between mb-1"><span className="text-sm font-medium text-gray-700 dark:text-gray-300">{c}</span><span className="text-sm font-bold">{n} ({pct}%)</span></div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2"><div className="h-2 rounded-full bg-blue-500" style={{width:`${pct}%`}}/></div>
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
        )}

        {/* ── CENTRE COMPARISON ── */}
        {active === 'centre' && (
          <div className="space-y-4">
            <CentreComparisonChart data={DEMO_CENTRES} />
            <Card>
              <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Centre Scorecard</h2></CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50 dark:bg-gray-800/50">{['Rank','Centre','Students','Attendance%','Fee Collected','Fee Pending','Sessions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {[...DEMO_CENTRES].sort((a,b)=>b.pct-a.pct).map((c,i)=>(
                      <tr key={c.centre} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                        <td className="px-4 py-3"><span className={`w-7 h-7 rounded-xl inline-flex items-center justify-center text-white text-xs font-black ${i===0?'bg-amber-400':i===1?'bg-gray-400':i===2?'bg-orange-600':'bg-gray-300 dark:bg-gray-700'}`}>{i+1}</span></td>
                        <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{c.centre}</td>
                        <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{c.students}</td>
                        <td className="px-4 py-3"><Badge variant={c.pct>=85?'success':c.pct>=75?'info':'warning'}>{c.pct}%</Badge></td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">{fmt(c.students*87000)}</td>
                        <td className="px-4 py-3 text-red-500">{fmt(c.students*13000)}</td>
                        <td className="px-4 py-3 text-gray-500">{Math.round(c.students*1.8)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* ── TEACHER REPORT ── */}
        {active === 'teacher' && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Teacher Performance</h2></CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 dark:bg-gray-800/50">{['Teacher','Centre','Subjects','Sessions','Avg Attendance','Students'].map(h=><th key={h} className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {[
                    {name:'Dr. Meera Sharma',  centre:'Delhi Rohini', subjects:'Physics,Chem', sessions:42, avg:87, students:90},
                    {name:'Prof. Rakesh Singh', centre:'Delhi Rohini', subjects:'Maths',        sessions:38, avg:91, students:88},
                    {name:'Ms. Anita Roy',      centre:'Delhi Dwarka', subjects:'Biology,Chem', sessions:36, avg:74, students:76},
                    {name:'Mr. Vijay Kumar',    centre:'Noida Sec18',  subjects:'Physics,Maths', sessions:40, avg:82, students:84},
                  ].map((t,i)=>(
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{t.name}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t.centre}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{t.subjects}</td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.sessions}</td>
                      <td className="px-4 py-3"><Badge variant={t.avg>=80?'success':t.avg>=70?'info':'warning'}>{t.avg}%</Badge></td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.students}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
