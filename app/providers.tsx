'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [qc] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 60_000, retry: 1 } } }))
  useEffect(() => {
    const t = localStorage.getItem('imp_theme')
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches))
      document.documentElement.classList.add('dark')
  }, [])
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>
}
