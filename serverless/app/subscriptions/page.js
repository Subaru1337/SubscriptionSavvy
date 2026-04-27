'use client'
import { useEffect, useState, useMemo } from 'react'
import ProtectedRoute from '@/components/protected-route'
import AppShell from '@/components/app-shell'
import api from '@/components/api'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Plus, Pencil, Trash2, Search, Tag, Calendar, RotateCw } from 'lucide-react'
import StatusBadge from '@/components/status-badge'
import SubscriptionModal from '@/components/subscription-modal'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'

const inr = (v) => '₹' + Number(v||0).toLocaleString('en-IN', { maximumFractionDigits: 2 })

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)
  const [q, setQ] = useState('')

  const load = async () => {
    setLoading(true)
    try { const { data } = await api.get('/subscriptions'); setSubs(data) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const t = q.toLowerCase().trim()
    return subs.filter(s => !t || s.name?.toLowerCase().includes(t) || s.category?.toLowerCase().includes(t))
  }, [subs, q])

  const onAdd = () => { setEditing(null); setOpen(true) }
  const onEdit = (s) => { setEditing(s); setOpen(true) }
  const onDelete = async () => {
    if (!confirmDel) return
    try { await api.delete(`/subscriptions/${confirmDel.id}`); toast.success('Deleted'); setConfirmDel(null); load() }
    catch { toast.error('Could not delete') }
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="space-y-5 animate-float-up">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight">Subscriptions</h2>
              <p className="text-muted-foreground text-sm mt-1">Manage every recurring payment in one place.</p>
            </div>
            <Button onClick={onAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold gap-2 shadow-lg shadow-emerald-950/40 transition-transform hover:scale-[1.02]">
              <Plus className="w-4 h-4" /> Add Subscription
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search by name or category…" value={q} onChange={e=>setQ(e.target.value)} className="pl-9 bg-card border-border" />
            </div>
            <Badge variant="outline" className="border-border">{filtered.length} item{filtered.length!==1?'s':''}</Badge>
          </div>

          {loading ? (
            <div className="grid gap-3">{Array.from({length:5}).map((_,i)=>(<Skeleton key={i} className="h-20 rounded-xl bg-secondary shimmer"/>))}</div>
          ) : filtered.length === 0 ? (
            <Card className="border-dashed border-border bg-card/40">
              <CardContent className="py-16 flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center">
                  <Plus className="w-6 h-6 text-primary"/>
                </div>
                <h3 className="text-lg font-semibold">No subscriptions yet</h3>
                <p className="text-muted-foreground text-sm max-w-sm">Start by adding Netflix, Spotify, or whatever's draining your wallet each month.</p>
                <Button onClick={onAdd} className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2">Add your first subscription</Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((s, idx) => (
                <Card key={s.id} style={{animationDelay:`${idx*30}ms`}} className="animate-float-up border-border bg-card/70 hover:border-primary/40 transition-all group">
                  <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-primary/10 ring-1 ring-primary/20 flex items-center justify-center text-base font-bold text-primary uppercase shrink-0">
                        {s.name?.slice(0,2)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold truncate">{s.name}</h4>
                          <span className="hidden md:inline text-xs text-muted-foreground inline-flex items-center gap-1"><Tag className="w-3 h-3"/> {s.category}</span>
                        </div>
                        <div className="text-xs text-muted-foreground flex items-center gap-3 mt-0.5">
                          <span className="inline-flex items-center gap-1"><RotateCw className="w-3 h-3"/> {s.billing_cycle}</span>
                          <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3"/> {format(parseISO(s.next_payment),'d MMM yyyy')}</span>
                          {s.notes && <span className="hidden md:inline truncate max-w-[280px]">· {s.notes}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-lg font-bold tabular-nums">{inr(s.cost)}</div>
                        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">/{s.billing_cycle === 'yearly' ? 'yr' : 'mo'}</div>
                      </div>
                      <StatusBadge nextPayment={s.next_payment} />
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="hover:bg-secondary hover:text-primary" onClick={() => onEdit(s)}>
                          <Pencil className="w-4 h-4"/>
                        </Button>
                        <Button size="icon" variant="ghost" className="hover:bg-destructive/10 hover:text-red-400" onClick={() => setConfirmDel(s)}>
                          <Trash2 className="w-4 h-4"/>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <SubscriptionModal open={open} onOpenChange={setOpen} initial={editing} onSaved={load} />

        <AlertDialog open={!!confirmDel} onOpenChange={(v)=>!v && setConfirmDel(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {confirmDel?.name}?</AlertDialogTitle>
              <AlertDialogDescription>This will permanently remove this subscription from your tracker.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onDelete} className="bg-red-500 hover:bg-red-600 text-white">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AppShell>
    </ProtectedRoute>
  )
}
