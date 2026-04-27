'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { Loader2 } from 'lucide-react'

export default function ProtectedRoute({ children }) {
  const { token, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !token) router.replace('/auth')
  }, [loading, token, router])

  if (loading || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-grid bg-glow">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span>Securing your dashboard…</span>
        </div>
      </div>
    )
  }
  return children
}
