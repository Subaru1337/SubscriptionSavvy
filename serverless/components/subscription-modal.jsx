'use client'
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import api from './api'
import { Loader2 } from 'lucide-react'

const CATS = ['Entertainment','Productivity','Health','Education','Finance','Shopping','Other']

export default function SubscriptionModal({ open, onOpenChange, initial, onSaved }) {
  const isEdit = !!initial?.id
  const [form, setForm] = useState({ name:'', cost:'', category:'Entertainment', billing_cycle:'monthly', next_payment:'', notes:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      if (initial) setForm({
        name: initial.name || '',
        cost: String(initial.cost || ''),
        category: initial.category || 'Entertainment',
        billing_cycle: initial.billing_cycle || 'monthly',
        next_payment: (initial.next_payment || '').slice(0,10),
        notes: initial.notes || '',
      })
      else setForm({ name:'', cost:'', category:'Entertainment', billing_cycle:'monthly', next_payment: new Date().toISOString().slice(0,10), notes:'' })
    }
  }, [open, initial])

  const save = async () => {
    if (!form.name || !form.cost || !form.next_payment) { toast.error('Fill name, cost and next payment'); return }
    setSaving(true)
    try {
      const payload = { ...form, cost: parseFloat(form.cost) }
      if (isEdit) await api.put(`/subscriptions/${initial.id}`, payload)
      else await api.post('/subscriptions', payload)
      toast.success(isEdit ? 'Subscription updated' : 'Subscription added')
      onOpenChange(false); onSaved && onSaved()
    } catch (e) { toast.error(e?.response?.data?.error || 'Failed to save') }
    finally { setSaving(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit subscription' : 'Add new subscription'}</DialogTitle>
          <DialogDescription>Track recurring payments and never miss a renewal.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" placeholder="Netflix, Spotify, Adobe…" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cost">Cost (₹)</Label>
              <Input id="cost" type="number" step="0.01" placeholder="649.00" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} />
            </div>
            <div className="grid gap-2">
              <Label>Billing Cycle</Label>
              <Select value={form.billing_cycle} onValueChange={v => setForm({...form, billing_cycle: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setForm({...form, category: v})}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="date">Next Payment</Label>
              <Input id="date" type="date" value={form.next_payment} onChange={e => setForm({...form, next_payment: e.target.value})} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" placeholder="Plan, account, family share…" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin"/>}
            {isEdit ? 'Save changes' : 'Add subscription'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
