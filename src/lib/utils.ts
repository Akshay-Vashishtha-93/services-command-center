import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'done': return 'bg-[var(--mw-teal-light)] text-[var(--mw-teal)]'
    case 'in_progress': return 'bg-blue-50 text-[var(--mw-navy)]'
    case 'not_started': return 'bg-gray-100 text-gray-600'
    case 'blocked': return 'bg-[var(--mw-coral-light)] text-[var(--mw-coral)]'
    case 'delayed': return 'bg-orange-100 text-orange-700'
    case 'on_hold': return 'bg-[var(--mw-amber-light)] text-amber-700'
    case 'cancelled': return 'bg-gray-100 text-gray-400 line-through'
    default: return 'bg-gray-100 text-gray-600'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'done': return 'Done'
    case 'in_progress': return 'In Progress'
    case 'not_started': return 'Not Started'
    case 'blocked': return 'Blocked'
    case 'delayed': return 'Delayed'
    case 'on_hold': return 'On Hold'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

export function getPriorityColor(priority: string | null): string {
  switch (priority) {
    case 'p0': return 'bg-red-100 text-red-800 border-red-300'
    case 'p1': return 'bg-[var(--mw-coral-light)] text-[var(--mw-coral)] border-[var(--mw-coral)]'
    case 'p2': return 'bg-[var(--mw-amber-light)] text-amber-700 border-amber-300'
    case 'p3': return 'bg-slate-100 text-slate-500 border-slate-300'
    default: return ''
  }
}

export function getPriorityLabel(priority: string | null): string {
  switch (priority) {
    case 'p0': return 'P0 - Critical'
    case 'p1': return 'P1 - High'
    case 'p2': return 'P2 - Medium'
    case 'p3': return 'P3 - Low'
    default: return ''
  }
}

export function getDaysUntil(eta: string | null): number | null {
  if (!eta) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const etaDate = new Date(eta)
  etaDate.setHours(0, 0, 0, 0)
  return Math.ceil((etaDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function getDaysColor(days: number | null, status: string): string {
  if (days === null || status === 'done' || status === 'cancelled') return ''
  if (days < 0) return 'text-red-600 font-semibold'
  if (days <= 3) return 'text-orange-600 font-medium'
  if (days <= 7) return 'text-yellow-600'
  return 'text-green-600'
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '\u2014'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}
