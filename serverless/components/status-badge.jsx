'use client'
import { differenceInCalendarDays, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

export function getUrgency(nextPaymentDate) {
  const today = new Date(); today.setHours(0,0,0,0)
  const d = typeof nextPaymentDate === 'string' ? parseISO(nextPaymentDate) : nextPaymentDate
  const diff = differenceInCalendarDays(d, today)
  if (diff < 0) return { key: 'overdue', label: 'Overdue', days: diff }
  if (diff === 0) return { key: 'today', label: 'Due Today', days: 0 }
  if (diff === 1) return { key: 'tomorrow', label: 'Due Tomorrow', days: 1 }
  if (diff <= 7) return { key: 'week', label: `Due in ${diff} days`, days: diff }
  return { key: 'upcoming', label: 'Upcoming', days: diff }
}

const styles = {
  overdue:  'bg-red-500/15 text-red-400 ring-red-500/30',
  today:    'bg-orange-500/15 text-orange-400 ring-orange-500/30 pulse-ring',
  tomorrow: 'bg-yellow-500/15 text-yellow-300 ring-yellow-500/30',
  week:     'bg-sky-500/15 text-sky-400 ring-sky-500/30',
  upcoming: 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/30',
}

export default function StatusBadge({ nextPayment, className }) {
  const u = getUrgency(nextPayment)
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset', styles[u.key], className)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', u.key==='overdue'?'bg-red-400':u.key==='today'?'bg-orange-400':u.key==='tomorrow'?'bg-yellow-300':u.key==='week'?'bg-sky-400':'bg-emerald-400')} />
      {u.label}
    </span>
  )
}
