'use client'
import { clsx } from 'clsx'
import type { ReactNode, InputHTMLAttributes, SelectHTMLAttributes, ButtonHTMLAttributes, TableHTMLAttributes } from 'react'

// ─── Card ────────────────────────────────────────────────────────────────────
export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm', className)}>{children}</div>
}
export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('px-5 py-4 border-b border-gray-100 dark:border-gray-800', className)}>{children}</div>
}
export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('px-5 py-4', className)}>{children}</div>
}

// ─── Badge ───────────────────────────────────────────────────────────────────
type BV = 'default'|'success'|'warning'|'danger'|'info'|'purple'
const BVC: Record<BV,string> = {
  default: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  danger:  'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  info:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  purple:  'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
}
export function Badge({ children, variant = 'default', className }: { children: ReactNode; variant?: BV; className?: string }) {
  return <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold', BVC[variant], className)}>{children}</span>
}

// ─── Button ──────────────────────────────────────────────────────────────────
type BtnV = 'primary'|'secondary'|'danger'|'ghost'
const BTNC: Record<BtnV,string> = {
  primary:   'bg-blue-600 hover:bg-blue-700 text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-200',
  danger:    'bg-red-600 hover:bg-red-700 text-white',
  ghost:     'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400',
}
export function Button({ children, variant = 'primary', size = 'md', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnV; size?: 'sm'|'md'|'lg' }) {
  const sz = size === 'sm' ? 'px-3 py-1.5 text-xs' : size === 'lg' ? 'px-6 py-3 text-base' : 'px-4 py-2 text-sm'
  return <button className={clsx('rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed', sz, BTNC[variant], className)} {...props}>{children}</button>
}

// ─── Input ───────────────────────────────────────────────────────────────────
export function Input({ label, error, className, ...props }: InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>}
      <input className={clsx('w-full rounded-lg border px-3 py-2 text-sm outline-none transition-colors border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500', error && 'border-red-400', className)} {...props} />
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Select ──────────────────────────────────────────────────────────────────
export function Select({ label, error, className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { label?: string; error?: string }) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">{label}</label>}
      <select className={clsx('w-full rounded-lg border px-3 py-2 text-sm outline-none border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500', className)} {...props}>{children}</select>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}

// ─── Spinner / Alert / StatCard / EmptyState / Modal / Table ─────────────────
export function Spinner({ size = 'md', className }: { size?: 'sm'|'md'|'lg'; className?: string }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6'
  return <div className={clsx('animate-spin rounded-full border-2 border-gray-200 border-t-blue-600', s, className)} />
}

export function Alert({ children, variant = 'info' }: { children: ReactNode; variant?: 'info'|'success'|'warning'|'danger' }) {
  const c = { info:'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300', success:'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20', warning:'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20', danger:'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20' }
  return <div className={clsx('rounded-lg border px-4 py-3 text-sm', c[variant])}>{children}</div>
}

type StatColour = 'blue'|'green'|'yellow'|'red'|'orange'|'purple'|'teal'|'indigo'|'pink'
const SC: Record<StatColour,string> = { blue:'border-l-blue-500',green:'border-l-green-500',yellow:'border-l-yellow-500',red:'border-l-red-500',orange:'border-l-orange-500',purple:'border-l-purple-500',teal:'border-l-teal-500',indigo:'border-l-indigo-500',pink:'border-l-pink-500' }
export function StatCard({ label, value, sub, colour='blue', icon }: { label: string; value: string; sub?: string; colour?: StatColour; icon?: string }) {
  return (
    <Card className={clsx('border-l-4 p-5', SC[colour])}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-medium truncate">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
        </div>
        {icon && <span className="text-2xl shrink-0">{icon}</span>}
      </div>
    </Card>
  )
}

export function EmptyState({ icon='📭', title, message }: { icon?: string; title: string; message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-base font-semibold text-gray-700 dark:text-gray-300">{title}</h3>
      {message && <p className="mt-1 text-sm text-gray-400 max-w-xs">{message}</p>}
    </div>
  )
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-gray-800 shrink-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
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
  return <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-800/50">{children}</th>
}
export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={clsx('px-4 py-3 text-gray-700 dark:text-gray-300 border-t border-gray-100 dark:border-gray-800', className)}>{children}</td>
}
