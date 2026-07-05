'use client'
import { clsx } from 'clsx'
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes } from 'react'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx(
      'bg-white dark:bg-[#0d1426] rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm',
      className
    )}>{children}</div>
  )
}
export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('px-5 py-4 border-b border-gray-100 dark:border-gray-800/60', className)}>{children}</div>
}
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('px-5 py-4', className)}>{children}</div>
}

type BV = 'default'|'success'|'warning'|'danger'|'info'|'purple'
const BVC: Record<BV,string> = {
  default: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger:  'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info:    'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  purple:  'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}
export function Badge({ children, variant = 'default', className }: { children: ReactNode; variant?: BV; className?: string }) {
  return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-semibold', BVC[variant], className)}>{children}</span>
}

type BtnV = 'primary'|'secondary'|'danger'|'ghost'
const BTNC: Record<BtnV,string> = {
  primary:   'text-white shadow-sm',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
}
export function Button({ children, variant = 'primary', size = 'md', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnV; size?: 'sm'|'md'|'lg' }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2.5 text-sm'
  const bg = variant === 'primary' ? 'linear-gradient(135deg, #2563eb, #4f46e5)' : ''
  return (
    <button
      style={variant === 'primary' ? { background: bg } : {}}
      className={clsx('rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed', sz, BTNC[variant], className)}
      {...props}>{children}</button>
  )
}

export function Input({ label, error, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>}
      <input className={clsx(
        'w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-all',
        'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400',
        'focus:border-blue-500 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500/20',
        error && 'border-red-400 focus:ring-red-400/20',
        className
      )} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Select({ label, error, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>}
      <select className={clsx(
        'w-full rounded-xl border px-3 py-2.5 text-sm outline-none',
        'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100',
        'focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20',
        className
      )} {...props}>{children}</select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

export function Spinner({ size = 'md', className }: { size?: 'sm'|'md'|'lg'; className?: string }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  return <div className={clsx('animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700 border-t-blue-600', s, className)} />
}

export function Alert({ children, variant = 'info' }: { children: ReactNode; variant?: 'info'|'success'|'warning'|'danger' }) {
  const c: Record<string, string> = {
    info:    'bg-blue-50 border-blue-100 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800/40 dark:text-blue-300',
    success: 'bg-emerald-50 border-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800/40 dark:text-emerald-300',
    warning: 'bg-amber-50 border-amber-100 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800/40 dark:text-amber-300',
    danger:  'bg-red-50 border-red-100 text-red-800 dark:bg-red-900/20 dark:border-red-800/40 dark:text-red-300',
  }
  return <div className={clsx('rounded-xl border px-4 py-3 text-sm', c[variant])}>{children}</div>
}

type SC = 'blue'|'green'|'yellow'|'red'|'orange'|'purple'|'teal'|'indigo'|'pink'|'emerald'|'amber'|'violet'
const SB: Record<SC, { border: string; bg: string; val: string }> = {
  blue:    { border: 'border-blue-500',    bg: 'bg-blue-500/8',    val: 'text-blue-600 dark:text-blue-400' },
  green:   { border: 'border-emerald-500', bg: 'bg-emerald-500/8', val: 'text-emerald-600 dark:text-emerald-400' },
  emerald: { border: 'border-emerald-500', bg: 'bg-emerald-500/8', val: 'text-emerald-600 dark:text-emerald-400' },
  yellow:  { border: 'border-amber-400',   bg: 'bg-amber-400/8',   val: 'text-amber-600 dark:text-amber-400' },
  amber:   { border: 'border-amber-400',   bg: 'bg-amber-400/8',   val: 'text-amber-600 dark:text-amber-400' },
  red:     { border: 'border-red-500',     bg: 'bg-red-500/8',     val: 'text-red-600 dark:text-red-400' },
  orange:  { border: 'border-orange-500',  bg: 'bg-orange-500/8',  val: 'text-orange-600 dark:text-orange-400' },
  purple:  { border: 'border-purple-500',  bg: 'bg-purple-500/8',  val: 'text-purple-600 dark:text-purple-400' },
  violet:  { border: 'border-violet-500',  bg: 'bg-violet-500/8',  val: 'text-violet-600 dark:text-violet-400' },
  teal:    { border: 'border-teal-500',    bg: 'bg-teal-500/8',    val: 'text-teal-600 dark:text-teal-400' },
  indigo:  { border: 'border-indigo-500',  bg: 'bg-indigo-500/8',  val: 'text-indigo-600 dark:text-indigo-400' },
  pink:    { border: 'border-pink-500',    bg: 'bg-pink-500/8',    val: 'text-pink-600 dark:text-pink-400' },
}
export function StatCard({ label, value, sub, colour = 'blue', icon, trend }: { label: string; value: string; sub?: string; colour?: SC; icon?: string; trend?: { value: string; up: boolean } }) {
  const s = SB[colour] ?? SB.blue
  return (
    <div className={clsx('relative bg-white dark:bg-[#0d1426] rounded-2xl border-l-4 p-5 shadow-sm card-hover', s.border, 'border border-gray-100 dark:border-gray-800/60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate">{label}</p>
          <p className="text-[1.6rem] font-black text-gray-900 dark:text-white mt-1 leading-none tracking-tight truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{sub}</p>}
          {trend && (
            <p className={clsx('text-xs font-semibold mt-1.5', trend.up ? 'text-emerald-600' : 'text-red-500')}>
              {trend.up ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {icon && (
          <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0', s.bg)}>
            {icon}
          </div>
        )}
      </div>
    </div>
  )
}

export function EmptyState({ icon = '📭', title, message }: { icon?: string; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-3xl mb-4">{icon}</div>
      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">{title}</h3>
      {message && <p className="mt-1.5 text-xs text-gray-400 max-w-xs leading-relaxed">{message}</p>}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#0d1426] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all text-lg leading-none">✕</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-4">{children}</div>
      </div>
    </div>
  )
}

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('overflow-x-auto', className)}><table className="w-full text-sm">{children}</table></div>
}
export function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-800/50">{children}</th>
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-3 text-gray-700 dark:text-gray-300 border-t border-gray-50 dark:border-gray-800/50', className)}>{children}</td>
}
