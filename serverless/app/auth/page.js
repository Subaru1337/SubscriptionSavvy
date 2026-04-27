'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/auth-context'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Wallet, Loader2, ShieldCheck, TrendingUp, BellRing } from 'lucide-react'
import { toast } from 'sonner'

export default function AuthPage() {
  const router = useRouter()
  const { token, login, register } = useAuth()
  const [tab, setTab] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (token) router.replace('/dashboard') }, [token, router])

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Email & password required')
    if (tab === 'register' && password !== confirm) return toast.error('Passwords do not match')
    setLoading(true)
    try {
      if (tab === 'login') { await login(email, password); toast.success('Welcome back!') }
      else { await register(email, password); toast.success('Account created') }
      router.replace('/dashboard')
    } catch (e) { toast.error(e?.response?.data?.error || 'Authentication failed') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex bg-grid bg-glow">
      {/* Left: Marketing panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 border-r border-border bg-card/30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="text-base font-bold">SubscriptionSavvy</div>
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Track every rupee</div>
          </div>
        </div>

        <div className="space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.05]">
            Stop overpaying. <br/>
            <span className="text-primary">Own your subscriptions.</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">A clean, focused dashboard for every recurring payment in your life — visualised, categorised, and never forgotten.</p>

          <div className="grid grid-cols-1 gap-3 max-w-md pt-2">
            {[{i:TrendingUp,t:'Live spend analytics',d:'Monthly & annual KPIs at a glance'},
              {i:BellRing,t:'Smart reminders',d:'Color-coded urgency, never miss a renewal'},
              {i:ShieldCheck,t:'Private by design',d:'Your data, your account, full export anytime'}].map(({i:Icon,t,d}, idx) => (
              <div key={t} style={{animationDelay:`${idx*80}ms`}} className="animate-float-up flex items-start gap-3 p-3 rounded-xl bg-secondary/60 ring-1 ring-border">
                <div className="w-9 h-9 rounded-lg bg-primary/15 ring-1 ring-primary/30 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-primary"/>
                </div>
                <div>
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-xs text-muted-foreground">© {new Date().getFullYear()} SubscriptionSavvy · Built for the rupee-conscious.</div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md animate-float-up">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <span className="font-bold text-lg">SubscriptionSavvy</span>
          </div>

          <Card className="border-border/80 bg-card/70 backdrop-blur-xl shadow-2xl shadow-emerald-950/30">
            <CardContent className="pt-6">
              <Tabs value={tab} onValueChange={setTab} className="w-full">
                <TabsList className="grid grid-cols-2 mb-6 bg-secondary">
                  <TabsTrigger value="login">Sign In</TabsTrigger>
                  <TabsTrigger value="register">Create Account</TabsTrigger>
                </TabsList>

                <form onSubmit={submit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" autoComplete="email" placeholder="you@savvy.com" value={email} onChange={e=>setEmail(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" autoComplete={tab==='login'?'current-password':'new-password'} placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
                  </div>
                  <TabsContent value="register" className="m-0 p-0">
                    <div className="space-y-2">
                      <Label htmlFor="confirm">Confirm Password</Label>
                      <Input id="confirm" type="password" placeholder="••••••••" value={confirm} onChange={e=>setConfirm(e.target.value)} />
                    </div>
                  </TabsContent>

                  <Button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {tab === 'login' ? 'Sign in to dashboard' : 'Create my account'}
                  </Button>
                </form>
              </Tabs>

              <p className="text-center text-xs text-muted-foreground mt-6">
                {tab==='login' ? "New here? " : "Already a member? "}
                <button className="text-primary hover:underline font-medium" onClick={() => setTab(tab==='login'?'register':'login')}>
                  {tab==='login' ? 'Create an account' : 'Sign in'}
                </button>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
