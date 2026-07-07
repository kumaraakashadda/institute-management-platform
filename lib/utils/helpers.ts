import { clsx, type ClassValue } from 'clsx'

/** Tailwind class merger */
export function cn(...inputs: ClassValue[]) { return clsx(inputs) }

/** Currency formatter — ₹1,23,456 */
export function fmt(n: number | string | undefined | null): string {
  return '₹' + Number(n ?? 0).toLocaleString('en-IN')
}

/** Short date — 12 Jul 2025 */
export function fmtDate(d: string | Date | undefined | null): string {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Days between two dates (positive = future) */
export function daysDiff(dateStr: string): number {
  const due = new Date(dateStr); due.setHours(0,0,0,0)
  const now = new Date(); now.setHours(0,0,0,0)
  return Math.round((due.getTime() - now.getTime()) / 86400000)
}

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'default' | 'purple'

/** Returns a Badge variant based on payment/installment status string */
export function statusBadge(status: string): BadgeVariant {
  const s = status?.toLowerCase() ?? ''
  if (s === 'paid' || s === 'active' || s === 'present') return 'success'
  if (s === 'partial' || s === 'due today') return 'warning'
  if (s === 'pending' || s === 'upcoming') return 'info'
  if (s === 'overdue' || s === 'absent' || s === 'inactive' || s === 'deleted') return 'danger'
  if (s === 'contacted' || s === 'promise to pay') return 'purple'
  return 'default'
}
