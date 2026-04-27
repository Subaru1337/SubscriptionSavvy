'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('ss_token') : null
    router.replace(token ? '/dashboard' : '/auth')
  }, [router])
  return (
    <div className="min-h-screen flex items-center justify-center bg-grid bg-glow">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span>Loading SubscriptionSavvy…</span>
      </div>
    </div>
  )
}
