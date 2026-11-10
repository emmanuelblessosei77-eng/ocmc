import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { apiRequest } from '../api'
import { getAccessToken } from '../auth'
import { notifyError } from '../lib/feedback'
import type { StudentPortalData } from './types'

export function useStudentPortal() {
  const [data, setData] = useState<StudentPortalData | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const reload = useCallback(async (initial = false) => {
    if (initial) setLoading(true)
    else setRefreshing(true)
    setError('')
    try {
      setData(await apiRequest<StudentPortalData>('/student-portal', { token: getAccessToken() }))
    } catch (requestError: unknown) {
      const message = requestError instanceof Error ? requestError.message : 'Student portal could not be loaded.'
      setError(message)
      void notifyError('Student portal could not be refreshed', message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void reload(true)
  }, [reload])

  return { data, error, loading, refreshing, reload }
}

export function PortalLoading() {
  return <p role="status" className="border border-slate-200 bg-white p-5 text-sm text-slate-600">Loading your student information…</p>
}

export function PortalError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-3 border border-red-200 bg-red-50 p-5 text-sm text-red-800">
      <p>{message}</p>
      <button type="button" onClick={onRetry} className="border border-navy px-4 py-2 font-bold text-navy hover:bg-cream">Retry</button>
    </div>
  )
}

export function PortalCard({ title, children, description }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border border-slate-200 bg-white p-5 sm:p-6">
      <h2 className="font-display text-2xl text-navy">{title}</h2>
      {description && <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  )
}
