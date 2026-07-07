'use client'

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'

// ─── Palette ────────────────────────────────────────────────────────────────
const COLORS = {
  blue:    '#2563eb',
  emerald: '#10b981',
  red:     '#ef4444',
  amber:   '#f59e0b',
  purple:  '#8b5cf6',
  indigo:  '#6366f1',
  teal:    '#14b8a6',
}

const PIE_COLORS = [COLORS.emerald, COLORS.red, COLORS.amber, COLORS.blue, COLORS.purple]

// ─── Tooltip style ──────────────────────────────────────────────────────────
const tooltipStyle = {
  backgroundColor: '#fff',
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  fontSize: '12px',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
}

// ─── Shared wrapper ──────────────────────────────────────────────────────────
function ChartWrapper({ title, subtitle, children, className = '' }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white dark:bg-[#0d1426] rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm ${className}`}>
      <div className="mb-4">
        <p className="font-bold text-gray-900 dark:text-white text-sm">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Attendance Trend Line Chart ─────────────────────────────────────────────
interface TrendPoint { date: string; present: number; absent: number; pct: number }
export function AttendanceTrendChart({ data, className }: { data: TrendPoint[]; className?: string }) {
  return (
    <ChartWrapper title="Attendance Trend" subtitle="Last 30 days" className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="pctGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={COLORS.blue} stopOpacity={0.15}/>
              <stop offset="95%" stopColor={COLORS.blue} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}/>
          <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} unit="%"/>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Attendance']}/>
          <Area type="monotone" dataKey="pct" stroke={COLORS.blue} strokeWidth={2} fill="url(#pctGrad)" dot={false}/>
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ─── Present vs Absent Bar Chart ─────────────────────────────────────────────
interface DailyCount { day: string; present: number; absent: number }
export function DailyBarChart({ data, className }: { data: DailyCount[]; className?: string }) {
  return (
    <ChartWrapper title="Daily Attendance" subtitle="Present vs Absent this week" className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={12} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}/>
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}/>
          <Tooltip contentStyle={tooltipStyle}/>
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }}/>
          <Bar dataKey="present" fill={COLORS.emerald} radius={[4,4,0,0]} name="Present"/>
          <Bar dataKey="absent"  fill={COLORS.red}     radius={[4,4,0,0]} name="Absent"/>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ─── Subject-wise Bar Chart ───────────────────────────────────────────────────
interface SubjectStat { subject: string; pct: number }
export function SubjectBarChart({ data, className }: { data: SubjectStat[]; className?: string }) {
  return (
    <ChartWrapper title="Subject-wise Attendance" className={className}>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 0, bottom: 0 }} barSize={12}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false}/>
          <XAxis type="number" domain={[0,100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} unit="%"/>
          <YAxis type="category" dataKey="subject" tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} width={80}/>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Attendance']}/>
          <Bar dataKey="pct" radius={[0,4,4,0]} name="Attendance %">
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.pct >= 75 ? COLORS.emerald : entry.pct >= 60 ? COLORS.amber : COLORS.red}/>
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ─── Pie: Status Breakdown ───────────────────────────────────────────────────
interface PieSlice { name: string; value: number }
export function StatusPieChart({ data, className }: { data: PieSlice[]; className?: string }) {
  return (
    <ChartWrapper title="Attendance Status" className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
          </Pie>
          <Tooltip contentStyle={tooltipStyle}/>
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }}/>
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ─── Fee Collection Line Chart ───────────────────────────────────────────────
interface FeePoint { month: string; collected: number; pending: number }
export function FeeCollectionChart({ data, className }: { data: FeePoint[]; className?: string }) {
  const fmt = (v: number) => `₹${(v/1000).toFixed(0)}k`
  return (
    <ChartWrapper title="Fee Collection Trend" subtitle="Monthly collected vs pending" className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={14} barGap={4}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}/>
          <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} tickFormatter={fmt}/>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']}/>
          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }}/>
          <Bar dataKey="collected" fill={COLORS.emerald} radius={[4,4,0,0]} name="Collected"/>
          <Bar dataKey="pending"   fill={COLORS.amber}   radius={[4,4,0,0]} name="Pending"/>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ─── Centre Comparison Bar Chart ─────────────────────────────────────────────
interface CentreStat { centre: string; pct: number; students: number }
export function CentreComparisonChart({ data, className }: { data: CentreStat[]; className?: string }) {
  return (
    <ChartWrapper title="Centre Performance" subtitle="Attendance % by centre" className={className}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }} barSize={20}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false}/>
          <XAxis dataKey="centre" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false}/>
          <YAxis domain={[0,100]} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} unit="%"/>
          <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v}%`, 'Attendance']}/>
          <Bar dataKey="pct" radius={[6,6,0,0]}>
            {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// ─── Monthly Heatmap (CSS-based, no canvas) ───────────────────────────────────
interface HeatDay { date: string; pct: number }
export function AttendanceHeatmap({ data, year, month, className }: {
  data: HeatDay[]; year: number; month: number; className?: string
}) {
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const dataMap = Object.fromEntries(data.map(d => [d.date, d.pct]))
  const firstDay = new Date(year, month - 1, 1).getDay()
  const dim = new Date(year, month, 0).getDate()
  const cells = Array.from({ length: firstDay + dim }, (_, i) => i < firstDay ? null : i - firstDay + 1)

  function cellColour(pct: number) {
    if (pct >= 90) return 'bg-emerald-500'
    if (pct >= 75) return 'bg-blue-400'
    if (pct >= 60) return 'bg-amber-400'
    return 'bg-red-500'
  }

  return (
    <ChartWrapper title={`Attendance Heatmap — ${MONTHS[month-1]} ${year}`} className={className}>
      <div className="grid grid-cols-7 gap-1">
        {['S','M','T','W','T','F','S'].map((d,i) => (
          <div key={i} className="text-center text-[9px] font-bold text-gray-400 pb-1">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`}/>
          const ds = `${year}-${('0'+month).slice(-2)}-${('0'+day).slice(-2)}`
          const pct = dataMap[ds]
          return (
            <div key={day} title={pct ? `${ds}: ${pct}%` : ds}
              className={`aspect-square rounded text-[9px] flex items-center justify-center text-white font-bold
                ${pct ? cellColour(pct) : 'bg-gray-100 dark:bg-gray-800'}`}>
              {day}
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-400">
        {[['bg-emerald-500','≥90%'],['bg-blue-400','75–89%'],['bg-amber-400','60–74%'],['bg-red-500','<60%'],['bg-gray-200','No class']].map(([c,l])=>(
          <span key={l} className="flex items-center gap-1"><span className={`w-2.5 h-2.5 rounded ${c}`}/>{l}</span>
        ))}
      </div>
    </ChartWrapper>
  )
}
