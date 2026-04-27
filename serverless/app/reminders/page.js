'use client'
import { useEffect, useState, useMemo } from 'react'
import ProtectedRoute from '@/components/protected-route'
import AppShell from '@/components/app-shell'
import api from '@/components/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Check, AlertOctagon, AlarmClock, Bell, CalendarDays, CheckCheck } from 'lucide-react'
import StatusBadge, { getUrgency } from '@/components/status-badge'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const inr = (v) => '₹' + Number(v||0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

const GROUP_META = {
  overdue:  { label:'Overdue',          icon: AlertOctagon, color:'text-red-400',     ring:'ring-red-500/20',     accent:'bg-red-500' },
  today:    { label:'Due Today',        icon: AlarmClock,   color:'text-orange-400',  ring:'ring-orange-500/20',  accent:'bg-orange-500' },
  tomorrow: { label:'Due Tomorrow',     icon: Bell,         color:'text-yellow-300',  ring:'ring-yellow-500/20',  accent:'bg-yellow-500' },
  week:     { label:'This Week',        icon: CalendarDays, color:'text-sky-400',     ring:'ring-sky-500/20',     accent:'bg-sky-500' },
  upcoming: { label:'Upcoming',         icon: CheckCheck,   color:'text-emerald-400', ring:'ring-emerald-500/20', accent:'bg-emerald-500' },
}
const ORDER = ['overdue','today','tomorrow','week','upcoming']

export default function RemindersPage() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(null)

  const load = async () => {
    setLoading(true)
    try { const { data } = await api.get('/subscriptions'); setSubs(data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const groups = useMemo(() => {
    const g = { overdue:[], today:[], tomorrow:[], week:[], upcoming:[] }
    subs.forEach(s => { g[getUrgency(s.next_payment).key].push(s) })
    Object.keys(g).forEach(k => g[k].sort((a,b)=> new Date(a.next_payment)-new Date(b.next_payment)))
    return g
  }, [subs])

  const markPaid = async (s) => {
    setPaying(s.id)
    try { await api.post(`/subscriptions/${s.id}/pay`); toast.success(`${s.name} marked as paid · next cycle scheduled`); load() }
    catch { toast.error('Could not update') }
    finally { setPaying(null) }
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6 animate-float-up">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight">Reminders</h2>
            <p className="text-muted-foreground text-sm mt-1">Color-coded urgency. Mark today's payments as paid in one tap.</p>
          </div>

          {loading ? (
            <div className="space-y-4">{Array.from({length:3}).map((_,i)=>(<Skeleton key={i} className="h-40 rounded-xl bg-secondary shimmer"/>))}</div>
          ) : (
            <div className="space-y-4">
              {ORDER.map(k => {
                const list = groups[k]
                const meta = GROUP_META[k]
                if (list.length === 0) return null
                const Icon = meta.icon
                return (
                  <Card key={k} className={cn('border-border bg-card/70 ring-1', meta.ring)}>
                    <CardHeader className="flex-row items-center justify-between pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full', meta.accent)} />
                        <Icon className={cn('w-4 h-4', meta.color)} />
                        {meta.label}
                        <span className="text-xs text-muted-foreground font-normal">· {list.length}</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="divide-y divide-border">
                        {list.map(s => (
                          <div key={s.id} className="py-3 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-secondary ring-1 ring-border flex items-center justify-center text-sm font-bold uppercase text-primary">{s.name?.slice(0,2)}</div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium truncate">{s.name}</div>
                              <div className="text-xs text-muted-foreground">{s.category} · {s.billing_cycle} · {format(parseISO(s.next_payment),'EEE, d MMM yyyy')}</div>
                            </div>
                            <div className="text-right hidden sm:block">
                              <div className="text-sm font-semibold tabular-nums">{inr(s.cost)}</div>
                              <StatusBadge nextPayment={s.next_payment} className="mt-1"/>
                            </div>
                            {k === 'today' && (
                              <Button size="sm" disabled={paying===s.id} onClick={() => markPaid(s)} className="bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5">
                                <Check className="w-4 h-4"/> Mark Paid
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              {ORDER.every(k => groups[k].length === 0) && (
                <Card className="border-dashed bg-card/40">
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <CheckCheck className="w-10 h-10 text-primary/40 mx-auto mb-3"/>
                    <p className="font-medium text-foreground">All clear!</p>
                    <p className="text-sm mt-1">No subscriptions tracked yet.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  )
}
