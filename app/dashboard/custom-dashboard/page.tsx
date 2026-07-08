'use client'
import { useState, useEffect } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Select, Alert } from '@/components/ui'
import {
  AttendanceTrendChart, DailyBarChart, StatusPieChart,
  FeeCollectionChart, CentreComparisonChart, SubjectBarChart
} from '@/components/charts'
import { fmt } from '@/lib/utils/helpers'

// ─── Widget catalogue ─────────────────────────────────────────────────────────
const WIDGET_CATALOGUE = [
  // Stat widgets
  { id:'stat_students',    type:'stat',  label:'Total Students',      icon:'🎓', category:'Students',    colour:'blue' },
  { id:'stat_present',     type:'stat',  label:'Present Today',       icon:'✅', category:'Attendance',   colour:'green' },
  { id:'stat_absent',      type:'stat',  label:'Absent Today',        icon:'❌', category:'Attendance',   colour:'red' },
  { id:'stat_sessions',    type:'stat',  label:'Live Sessions',       icon:'📡', category:'Attendance',   colour:'purple' },
  { id:'stat_collected',   type:'stat',  label:'Fee Collected (Month)', icon:'💰', category:'Finance',    colour:'teal' },
  { id:'stat_pending',     type:'stat',  label:'Fee Pending',         icon:'⏳', category:'Finance',      colour:'orange' },
  { id:'stat_admissions',  type:'stat',  label:'New Admissions',      icon:'🎉', category:'Students',    colour:'indigo' },
  { id:'stat_defaulters',  type:'stat',  label:'Attendance Defaulters', icon:'⚠️', category:'Attendance', colour:'amber' },
  { id:'stat_centres',     type:'stat',  label:'Active Centres',      icon:'🏫', category:'Overview',    colour:'violet' },
  { id:'stat_att_pct',     type:'stat',  label:'Overall Attendance %', icon:'📊', category:'Attendance',  colour:'emerald' },
  // Chart widgets
  { id:'chart_trend',      type:'chart', label:'Attendance Trend (30d)', icon:'📈', category:'Attendance', size:'wide' },
  { id:'chart_daily',      type:'chart', label:'Daily Attendance Bar',   icon:'📊', category:'Attendance', size:'normal' },
  { id:'chart_pie',        type:'chart', label:'Attendance Status Pie',  icon:'🥧', category:'Attendance', size:'normal' },
  { id:'chart_fee',        type:'chart', label:'Fee Collection Trend',   icon:'💹', category:'Finance',    size:'wide' },
  { id:'chart_centres',    type:'chart', label:'Centre Comparison',      icon:'🏆', category:'Overview',   size:'wide' },
  { id:'chart_subjects',   type:'chart', label:'Subject Performance',    icon:'📚', category:'Academics',  size:'wide' },
  // Table widgets
  { id:'table_defaulters', type:'table', label:'Attendance Defaulters',  icon:'⚠️', category:'Attendance', size:'wide' },
  { id:'table_dues_today', type:'table', label:"Today's Fee Dues",       icon:'💰', category:'Finance',    size:'wide' },
  { id:'table_sessions',   type:'table', label:'Recent Sessions',        icon:'📡', category:'Attendance', size:'wide' },
  { id:'table_admissions', type:'table', label:'Recent Admissions',      icon:'📋', category:'Students',   size:'wide' },
]

type WidgetId = typeof WIDGET_CATALOGUE[0]['id']

const PRESET_DASHBOARDS: Record<string, { name: string; widgets: WidgetId[] }> = {
  admin_overview: {
    name: 'Admin Overview',
    widgets: ['stat_students','stat_present','stat_collected','stat_admissions','chart_trend','chart_fee','chart_centres','table_defaulters'],
  },
  attendance_focus: {
    name: 'Attendance Focus',
    widgets: ['stat_present','stat_absent','stat_sessions','stat_att_pct','chart_trend','chart_daily','chart_pie','table_defaulters','table_sessions'],
  },
  finance_focus: {
    name: 'Finance Focus',
    widgets: ['stat_collected','stat_pending','stat_defaulters','stat_admissions','chart_fee','chart_centres','table_dues_today'],
  },
  centre_manager: {
    name: 'Centre Manager View',
    widgets: ['stat_students','stat_present','stat_sessions','stat_collected','chart_daily','chart_subjects','table_defaulters','table_dues_today'],
  },
}

// Demo data
const DEMO_TREND = Array.from({length:30},(_,i)=>{ const d=new Date(); d.setDate(d.getDate()-29+i); const p=70+Math.round(Math.random()*20); return {date:`${d.getDate()}/${d.getMonth()+1}`,present:Math.round(p*1.5),absent:Math.round((100-p)*1.5),pct:p} })
const DEMO_DAILY = ['Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>({day:d,present:80+Math.round(Math.random()*30),absent:5+Math.round(Math.random()*15)}))
const DEMO_PIE   = [{name:'Present',value:84},{name:'Absent',value:12},{name:'Late',value:4}]
const DEMO_FEE   = ['Aug','Sep','Oct','Nov','Dec','Jan'].map(m=>({month:m,collected:200000+Math.round(Math.random()*150000),pending:50000+Math.round(Math.random()*80000)}))
const DEMO_CTRS  = [{centre:'Delhi Rohini',pct:87,students:124},{centre:'Delhi Dwarka',pct:82,students:98},{centre:'Noida Sec18',pct:79,students:87},{centre:'Gurgaon',pct:91,students:63}]
const DEMO_SUBJ  = [{subject:'Physics',pct:87},{subject:'Maths',pct:91},{subject:'Chemistry',pct:72},{subject:'Biology',pct:68}]
const DEMO_STATS: Record<string,{value:string;sub?:string}> = {
  stat_students:   {value:'124',  sub:'118 active'},
  stat_present:    {value:'99',   sub:'80% rate'},
  stat_absent:     {value:'25',   sub:'today'},
  stat_sessions:   {value:'3',    sub:'live now'},
  stat_collected:  {value:fmt(385000), sub:'this month'},
  stat_pending:    {value:fmt(1275000), sub:'outstanding'},
  stat_admissions: {value:'12',   sub:'this month'},
  stat_defaulters: {value:'4',    sub:'below 75%'},
  stat_centres:    {value:'4',    sub:'operational'},
  stat_att_pct:    {value:'84%',  sub:'overall'},
}

const DEMO_DEFAULTERS_T = [{name:'Arjun Kumar',batch:'JEE-2026-A',att:'62%'},{name:'Vikram Yadav',batch:'NEET-2026-A',att:'55%'},{name:'Meera Gupta',batch:'JEE-2027-A',att:'0%'}]
const DEMO_DUES_TODAY  = [{name:'Priya Singh',phone:'9876543211',amount:fmt(25000),batch:'NEET-2026-B'},{name:'Rohan Verma',phone:'9876543216',amount:fmt(30000),batch:'JEE-2026-A'}]
const DEMO_SESSIONS    = [{id:'SES000001',subject:'Physics',batch:'JEE-2026-A',present:38,total:45},{id:'SES000002',subject:'Maths',batch:'JEE-2026-B',present:35,total:42}]
const DEMO_ADMISSIONS_T = [{name:'Rahul Sharma',course:'JEE Advanced',centre:'Delhi Rohini',date:'01 Jul 2025'},{name:'Priya Singh',course:'NEET',centre:'Delhi Dwarka',date:'02 Jul 2025'}]

const COLOUR_MAP: Record<string,string> = {blue:'text-blue-600',green:'text-emerald-600',red:'text-red-500',purple:'text-purple-600',teal:'text-teal-600',orange:'text-orange-600',indigo:'text-indigo-600',amber:'text-amber-600',violet:'text-violet-600',emerald:'text-emerald-600'}
const COLOUR_BG: Record<string,string>  = {blue:'bg-blue-50 dark:bg-blue-900/20',green:'bg-emerald-50 dark:bg-emerald-900/20',red:'bg-red-50 dark:bg-red-900/20',purple:'bg-purple-50 dark:bg-purple-900/20',teal:'bg-teal-50 dark:bg-teal-900/20',orange:'bg-amber-50 dark:bg-amber-900/20',indigo:'bg-indigo-50 dark:bg-indigo-900/20',amber:'bg-amber-50 dark:bg-amber-900/20',violet:'bg-violet-50 dark:bg-violet-900/20',emerald:'bg-emerald-50 dark:bg-emerald-900/20'}

function StatWidget({ id, label, icon, colour }: typeof WIDGET_CATALOGUE[0]) {
  const d = DEMO_STATS[id] || {value:'—'}
  return (
    <div className={`rounded-2xl border-l-4 p-5 shadow-sm border border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0d1426] ${COLOUR_BG[colour||'blue']}`}
      style={{borderLeftColor: colour==='blue'?'#2563EB':colour==='green'?'#059669':colour==='red'?'#DC2626':colour==='purple'?'#7C3AED':colour==='teal'?'#0d9488':colour==='orange'?'#D97706':colour==='indigo'?'#4f46e5':colour==='amber'?'#D97706':colour==='violet'?'#7C3AED':'#059669'}}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-black mt-1 ${COLOUR_MAP[colour||'blue']}`}>{d.value}</p>
          {d.sub && <p className="text-xs text-gray-400 mt-0.5">{d.sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${COLOUR_BG[colour||'blue']}`}>{icon}</div>
      </div>
    </div>
  )
}

function ChartWidget({ id, label }: typeof WIDGET_CATALOGUE[0]) {
  const map: Record<string,React.ReactNode> = {
    chart_trend:   <AttendanceTrendChart data={DEMO_TREND} />,
    chart_daily:   <DailyBarChart data={DEMO_DAILY} />,
    chart_pie:     <StatusPieChart data={DEMO_PIE} />,
    chart_fee:     <FeeCollectionChart data={DEMO_FEE} />,
    chart_centres: <CentreComparisonChart data={DEMO_CTRS} />,
    chart_subjects:<SubjectBarChart data={DEMO_SUBJ} />,
  }
  return <Card><CardHeader><h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">{label}</h3></CardHeader><CardBody className="pt-0">{map[id] || <p className="text-gray-400 text-sm">Chart unavailable</p>}</CardBody></Card>
}

function TableWidget({ id, label }: typeof WIDGET_CATALOGUE[0]) {
  const rows: Record<string, React.ReactNode> = {
    table_defaulters: (
      <>{DEMO_DEFAULTERS_T.map((r,i)=><div key={i} className="px-4 py-2.5 flex justify-between text-xs border-b dark:border-gray-800 last:border-0"><span className="font-medium text-gray-800 dark:text-gray-200">{r.name} <span className="text-gray-400">({r.batch})</span></span><Badge variant="danger">{r.att}</Badge></div>)}</>
    ),
    table_dues_today: (
      <>{DEMO_DUES_TODAY.map((r,i)=><div key={i} className="px-4 py-2.5 flex justify-between text-xs border-b dark:border-gray-800 last:border-0"><span className="font-medium text-gray-800 dark:text-gray-200">{r.name} <span className="text-gray-400">· {r.phone}</span></span><span className="font-bold text-orange-600">{r.amount}</span></div>)}</>
    ),
    table_sessions: (
      <>{DEMO_SESSIONS.map((r,i)=><div key={i} className="px-4 py-2.5 flex justify-between text-xs border-b dark:border-gray-800 last:border-0"><span className="font-medium text-gray-800 dark:text-gray-200">{r.subject} — {r.batch}</span><span className="font-bold text-emerald-600">{r.present}/{r.total}</span></div>)}</>
    ),
    table_admissions: (
      <>{DEMO_ADMISSIONS_T.map((r,i)=><div key={i} className="px-4 py-2.5 flex justify-between text-xs border-b dark:border-gray-800 last:border-0"><span className="font-medium text-gray-800 dark:text-gray-200">{r.name} <span className="text-gray-400">· {r.course}</span></span><span className="text-gray-400">{r.date}</span></div>)}</>
    ),
  }
  return <Card><CardHeader><h3 className="font-bold text-sm text-gray-800 dark:text-gray-200">{label}</h3></CardHeader><div>{rows[id] || <p className="px-4 py-3 text-xs text-gray-400">No data</p>}</div></Card>
}

function Widget(w: typeof WIDGET_CATALOGUE[0]) {
  if (w.type === 'stat')  return <StatWidget {...w} />
  if (w.type === 'chart') return <ChartWidget {...w} />
  if (w.type === 'table') return <TableWidget {...w} />
  return null
}

const CATEGORIES = ['All', ...Array.from(new Set(WIDGET_CATALOGUE.map(w=>w.category)))]

export default function CustomDashboardPage() {
  const [widgets, setWidgets]       = useState<WidgetId[]>(PRESET_DASHBOARDS.admin_overview.widgets)
  const [editMode, setEditMode]     = useState(false)
  const [activeCategory, setCategory] = useState('All')
  const [dashName, setDashName]     = useState('My Dashboard')
  const [saved, setSaved]           = useState(false)

  // Persist to localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('imp_custom_dashboard')
      if (stored) { const p = JSON.parse(stored); setWidgets(p.widgets); setDashName(p.name) }
    } catch {}
  }, [])

  function saveDashboard() {
    try { localStorage.setItem('imp_custom_dashboard', JSON.stringify({ name: dashName, widgets })) } catch {}
    setSaved(true); setTimeout(()=>setSaved(false), 2000)
  }

  function toggleWidget(id: WidgetId) {
    setWidgets(prev => prev.includes(id) ? prev.filter(w=>w!==id) : [...prev, id])
  }

  function moveUp(idx: number) {
    if (idx === 0) return
    setWidgets(prev => { const a=[...prev]; [a[idx-1],a[idx]]=[a[idx],a[idx-1]]; return a })
  }
  function moveDown(idx: number) {
    setWidgets(prev => { if (idx >= prev.length-1) return prev; const a=[...prev]; [a[idx],a[idx+1]]=[a[idx+1],a[idx]]; return a })
  }
  function removeWidget(id: WidgetId) { setWidgets(prev=>prev.filter(w=>w!==id)) }

  function loadPreset(key: string) {
    const p = PRESET_DASHBOARDS[key]; if (!p) return
    setWidgets(p.widgets); setDashName(p.name)
  }

  const activeWidgets = widgets.map(id => WIDGET_CATALOGUE.find(w=>w.id===id)).filter(Boolean) as typeof WIDGET_CATALOGUE

  const catalogueFiltered = WIDGET_CATALOGUE.filter(w => activeCategory === 'All' || w.category === activeCategory)

  return (
    <DashboardShell title="Custom Dashboard">
      <div className="p-4 md:p-6 space-y-5 max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            {editMode
              ? <input value={dashName} onChange={e=>setDashName(e.target.value)}
                  className="text-2xl font-black bg-transparent border-b-2 border-blue-500 outline-none text-gray-900 dark:text-white w-64" />
              : <h1 className="text-2xl font-black text-gray-900 dark:text-white">🎛️ {dashName}</h1>
            }
            {saved && <Badge variant="success">✓ Saved</Badge>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {editMode && (
              <Select className="w-44 text-xs" onChange={e => loadPreset(e.target.value)}>
                <option value="">Load preset…</option>
                {Object.entries(PRESET_DASHBOARDS).map(([k,v])=><option key={k} value={k}>{v.name}</option>)}
              </Select>
            )}
            <Button variant="secondary" size="sm" onClick={saveDashboard}>💾 Save Layout</Button>
            <Button size="sm" onClick={() => setEditMode(e=>!e)}>
              {editMode ? '✅ Done Editing' : '✏️ Customise'}
            </Button>
          </div>
        </div>

        <Alert variant="info">
          {editMode
            ? '✏️ Edit mode — toggle widgets below to add/remove. Drag to reorder using ↑↓ arrows. Click Save Layout to persist.'
            : '🎛️ Your personalised dashboard. Click Customise to add, remove, or rearrange widgets.'}
        </Alert>

        {/* Widget picker (edit mode) */}
        {editMode && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-bold text-gray-800 dark:text-gray-200">Widget Library</h2>
                <div className="flex gap-1 flex-wrap">
                  {CATEGORIES.map(c => (
                    <button key={c} onClick={()=>setCategory(c)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${activeCategory===c?'bg-blue-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {catalogueFiltered.map(w => {
                  const active = widgets.includes(w.id)
                  return (
                    <button key={w.id} onClick={() => toggleWidget(w.id)}
                      className={`p-3 rounded-xl border text-left transition-all text-xs ${active?'border-blue-500 bg-blue-50 dark:bg-blue-900/20':'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 hover:border-blue-300'}`}>
                      <div className="text-lg mb-1">{w.icon}</div>
                      <p className={`font-semibold leading-tight ${active?'text-blue-700 dark:text-blue-300':'text-gray-700 dark:text-gray-300'}`}>{w.label}</p>
                      <p className="text-gray-400 text-[10px] mt-0.5">{w.category} · {w.type}</p>
                      {active && <p className="text-blue-500 text-[10px] mt-1 font-bold">✓ On dashboard</p>}
                    </button>
                  )
                })}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Active widgets list in edit mode */}
        {editMode && widgets.length > 0 && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Current Layout ({widgets.length} widgets)</h2></CardHeader>
            <div className="divide-y dark:divide-gray-800">
              {activeWidgets.map((w, idx) => (
                <div key={w.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={()=>moveUp(idx)} disabled={idx===0} className="text-gray-400 hover:text-blue-600 disabled:opacity-30 text-xs leading-none">▲</button>
                    <button onClick={()=>moveDown(idx)} disabled={idx===activeWidgets.length-1} className="text-gray-400 hover:text-blue-600 disabled:opacity-30 text-xs leading-none">▼</button>
                  </div>
                  <span className="text-base">{w.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{w.label}</p>
                    <p className="text-[10px] text-gray-400">{w.category} · {w.type}</p>
                  </div>
                  <button onClick={()=>removeWidget(w.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">Remove</button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Dashboard widgets rendered */}
        {!editMode && (
          <div className="space-y-5">
            {/* Stat row */}
            {(() => {
              const stats = activeWidgets.filter(w => w.type === 'stat')
              if (!stats.length) return null
              return (
                <div className={`grid grid-cols-2 ${stats.length >= 4 ? 'lg:grid-cols-4' : `lg:grid-cols-${Math.min(stats.length, 3)}`} gap-3`}>
                  {stats.map(w => <Widget key={w.id} {...w} />)}
                </div>
              )
            })()}
            {/* Charts and tables */}
            {activeWidgets.filter(w => w.type !== 'stat').map(w => {
              const isWide = (w as {size?:string}).size === 'wide' || w.type === 'table'
              return (
                <div key={w.id} className={isWide ? 'w-full' : 'w-full lg:w-1/2 inline-block align-top'}>
                  <Widget {...w} />
                </div>
              )
            })}
          </div>
        )}

        {editMode && !widgets.length && (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="text-5xl mb-3">🎛️</div>
            <h3 className="font-bold text-gray-700 dark:text-gray-300">No widgets selected</h3>
            <p className="text-sm text-gray-400 mt-1">Pick from the Widget Library above to start building your dashboard.</p>
          </div>
        )}
      </div>
    </DashboardShell>
  )
}
