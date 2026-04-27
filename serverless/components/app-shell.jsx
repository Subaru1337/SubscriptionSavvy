'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { LayoutDashboard, ListChecks, BellRing, Wallet, LogOut, Download, FileSpreadsheet, FileText, ChevronDown, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import api from './api'

const navLinks = [
  { href: '/dashboard',     label: 'Dashboard',     icon: LayoutDashboard },
  { href: '/subscriptions', label: 'Subscriptions', icon: ListChecks },
  { href: '/reminders',     label: 'Reminders',     icon: BellRing },
]

async function downloadFile(path, filename) {
  try {
    const res = await api.get(path, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url; a.download = filename
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${filename}`)
  } catch (e) { toast.error('Export failed') }
}

export default function AppShell({ children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-background text-foreground bg-grid">
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-md">
          <div className="px-6 py-6 flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight">SubscriptionSavvy</div>
              <div className="text-[10px] uppercase text-muted-foreground tracking-widest">Finance · OS</div>
            </div>
          </div>

          <nav className="flex-1 px-3 py-2 space-y-1">
            {navLinks.map(({ href, label, icon: Icon }) => {
              const active = pathname === href
              return (
                <Link key={href} href={href} className={cn('group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  active ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}>
                  <Icon className={cn('w-4 h-4 transition-transform group-hover:scale-110', active && 'text-primary')} />
                  {label}
                </Link>
              )
            })}
          </nav>

          <div className="p-3 border-t border-border">
            <div className="px-3 py-2 rounded-lg bg-secondary/60">
              <div className="text-xs text-muted-foreground">Signed in as</div>
              <div className="text-sm font-medium truncate">{user?.email || '—'}</div>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-30 border-b border-border bg-background/70 backdrop-blur-xl">
            <div className="flex items-center justify-between px-4 md:px-8 py-4">
              <div className="md:hidden flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/20 ring-1 ring-primary/40 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-primary" />
                </div>
                <span className="font-bold">SubscriptionSavvy</span>
              </div>
              <div className="hidden md:flex flex-col">
                <span className="text-xs text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</span>
                <h1 className="text-lg font-semibold capitalize">{pathname?.replace('/','') || 'Dashboard'}</h1>
              </div>
              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 border-border bg-card hover:bg-secondary">
                      <Download className="w-4 h-4" /> Export <ChevronDown className="w-3 h-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Download data</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => downloadFile('/export/csv', 'subscriptions.csv')}>
                      <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-400" /> Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => downloadFile('/export/pdf', 'subscriptions.pdf')}>
                      <FileText className="w-4 h-4 mr-2 text-amber-400" /> Export PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 hover:bg-secondary">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-xs font-bold text-emerald-950">{(user?.email||'U').slice(0,1).toUpperCase()}</div>
                      <span className="hidden md:inline text-sm">{user?.email}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="flex items-center gap-2"><UserIcon className="w-4 h-4"/>{user?.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={logout} className="text-red-400 focus:text-red-300">
                      <LogOut className="w-4 h-4 mr-2" /> Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="flex-1 px-4 md:px-8 py-6 pb-24 md:pb-8">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/95 backdrop-blur-xl">
        <div className="grid grid-cols-3">
          {navLinks.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <button key={href} onClick={() => router.push(href)} className={cn('flex flex-col items-center gap-1 py-3 text-xs transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}>
                <Icon className={cn('w-5 h-5', active && 'scale-110')} />
                {label}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
