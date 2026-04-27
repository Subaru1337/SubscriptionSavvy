import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import AuthProvider from '@/components/auth-context'

export const metadata = {
  title: 'SubscriptionSavvy — Track every rupee.',
  description: 'A polished personal subscription tracker. Monitor recurring payments, get reminders, and visualize spend.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
