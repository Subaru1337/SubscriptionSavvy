'use client'
import { useEffect, useState } from 'react'
import ProtectedRoute from '@/components/protected-route'
import AppShell from '@/components/app-shell'
import api from '@/components/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, Wallet, CalendarRange, ListChecks, TrendingUp, Sparkles } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import StatusBadge, { getUrgency } from '@/components/status-badge'
import { format, parseISO } from 'date-fns'

const COLORS = ['#10b981','#f59e0b','#0ea5e9','#ec4899','#8b5cf6','#ef4444','#22d3ee']
const inr = (v) => '₹' + Number(v||0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card className="relative overflow-hidden border-border bg-card/70 backdrop-blur hover:border-primary/40 transition-all duration-300 group">
      <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${accent}`}/>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{label}</div>
            <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
            {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
          </div>
          <div className="w-10 h-10 rounded-xl bg-secondary ring-1 ring-border flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const [summary, setSummary] = useState(null)
  const [breakdown, setBreakdown] = useState([])
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [s, b, l] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/category-breakdown'),
        api.get('/subscriptions'),
      ])
      setSummary(s.data); setBreakdown(b.data); setSubs(l.data)
    } finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const dueThisWeek = subs.filter(s => { const u = getUrgency(s.next_payment); return ['overdue','today','tomorrow','week'].includes(u.key) })
    .sort((a,b)=> new Date(a.next_payment) - new Date(b.next_payment))

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-6 animate-float-up">
          {/* Hero greeting */}
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary"><Sparkles className="w-3 h-3"/> Overview</div>
              <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mt-1">Your money, in focus.</h2>
              <p className="text-muted-foreground mt-1">Here's the pulse of your subscriptions today.</p>
            </div>
            <Badge variant="outline" className="border-primary/40 text-primary bg-primary/10">{summary?.active_subscriptions ?? 0} active</Badge>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {loading ? Array.from({length:3}).map((_,i)=>(<Skeleton key={i} className="h-32 rounded-xl bg-secondary shimmer"/>)) : (
              <>
                <StatCard icon={Wallet} label="Monthly Spend" value={inr(summary?.monthly_total)} sub="Recurring this month" accent="bg-emerald-500" />
                <StatCard icon={CalendarRange} label="Annual Spend" value={inr(summary?.annual_total)} sub="Projected over 12 months" accent="bg-amber-500" />
                <StatCard icon={ListChecks} label="Active Subscriptions" value={summary?.active_subscriptions ?? 0} sub="Across all categories" accent="bg-sky-500" />
              </>
            )}
          </div>

          {/* Pie + Category list */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2 border-border bg-card/70">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Spend by Category</CardTitle>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><TrendingUp className="w-3 h-3 text-primary"/> monthly equivalent</span>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-[260px] rounded-xl bg-secondary shimmer"/> :
                  breakdown.length === 0 ? (
                    <div className="h-[260px] flex flex-col items-center justify-center text-center text-muted-foreground gap-2">
                      <Wallet className="w-10 h-10 text-primary/40"/>
                      <p>No subscriptions yet.</p>
                      <a href="/subscriptions" className="text-primary text-sm font-medium hover:underline">Add your first one →</a>
                    </div>
                  ) : (
                  <div className="grid md:grid-cols-2 gap-4 items-center">
                    <div className="h-[260px]">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={breakdown} dataKey="monthly_amount" nameKey="category" innerRadius={60} outerRadius={100} paddingAngle={3} stroke="none">
                            {breakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                          </Pie>
                          <Tooltip contentStyle={{background:'hsl(var(--card))',border:'1px solid hsl(var(--border))',borderRadius:8,color:'hsl(var(--foreground))'}} formatter={(v)=>inr(v)}/>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {breakdown.map((b, i) => (
                        <div key={b.category} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/60 transition-colors">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{background: COLORS[i % COLORS.length]}}/>
                            <span className="text-sm font-medium truncate">{b.category}</span>
                            <span className="text-xs text-muted-foreground">· {b.count}</span>
                          </div>
                          <span className="text-sm font-semibold tabular-nums">{inr(b.monthly_amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>)}
              </CardContent>
            </Card>

            <Card className="border-border bg-card/70">
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Due this week</CardTitle>
                <a href="/reminders" className="text-xs text-primary hover:underline flex items-center gap-1">View all <ArrowUpRight className="w-3 h-3"/></a>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-40 rounded-xl bg-secondary shimmer"/> :
                  dueThisWeek.length === 0 ? <p className="text-sm text-muted-foreground py-8 text-center">All clear. Nothing due this week 🎉</p> :
                  <div className="space-y-2 max-h-[260px] overflow-auto scrollbar-thin pr-1">
                    {dueThisWeek.map(s => (
                      <div key={s.id} className="p-3 rounded-lg bg-secondary/40 ring-1 ring-border hover:ring-primary/40 transition-all">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.category} · {format(parseISO(s.next_payment), 'd MMM')}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold tabular-nums">{inr(s.cost)}</div>
                            <StatusBadge nextPayment={s.next_payment} className="mt-1" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>}
              </CardContent>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  )
}
