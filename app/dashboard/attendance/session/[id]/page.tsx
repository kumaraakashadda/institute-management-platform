'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Alert, Spinner } from '@/components/ui'
import { useSessionLive, useCloseSession } from '@/lib/attendance/useAttendance'
import { attendanceApi } from '@/lib/attendance/attendanceApi'
import { IS_DEMO } from '@/lib/gasClient'

// ─── QR Renderer — pure SVG, no canvas ────────────────────────────────────────
// Uses QRCode.toString(..., {type:'svg'}) which is fully synchronous,
// never races against React's render cycle, and never leaves a blank box.
function QrDisplay({ value, size = 220 }: { value: string; size?: number }) {
  const [svg, setSvg] = useState<string | null>(null)
  const [err, setErr] = useState(false)
  const reqId = useRef(0)

  useEffect(() => {
    if (!value) { setSvg(null); return }
    const id = ++reqId.current
    setErr(false)
    import('qrcode')
      .then(QR => QR.toString(value, { type: 'svg', width: size, margin: 2,
        color: { dark: '#111827', light: '#ffffff' } }))
      .then(s => { if (id === reqId.current) setSvg(s) })
      .catch(() => { if (id === reqId.current) setErr(true) })
  }, [value, size])

  if (err) return (
    <div style={{ width: size, height: size }}
      className="flex flex-col items-center justify-center gap-2 bg-gray-50 rounded-xl text-center px-4">
      <span className="text-3xl">⚠️</span>
      <p className="text-xs text-gray-500">QR failed. Click ↺ Refresh above.</p>
    </div>
  )

  if (!svg) return (
    <div style={{ width: size, height: size }}
      className="flex items-center justify-center bg-gray-50 rounded-xl">
      <Spinner size="lg" />
    </div>
  )

  return (
    <div style={{ width: size, height: size }}
      className="[&_svg]:block [&_svg]:w-full [&_svg]:h-auto rounded-lg overflow-hidden"
      dangerouslySetInnerHTML={{ __html: svg }} />
  )
}

// ─── Countdown ring ────────────────────────────────────────────────────────────
function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 22, c = 2 * Math.PI * r
  const colour = seconds > 30 ? '#10b981' : seconds > 10 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4"/>
      <circle cx="32" cy="32" r={r} fill="none" stroke={colour} strokeWidth="4"
        strokeDasharray={`${(seconds / total) * c} ${c}`} strokeLinecap="round"
        transform="rotate(-90 32 32)" style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}/>
      <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="bold" fill={colour}>{seconds}</text>
    </svg>
  )
}

// ─── Safe date formatter ───────────────────────────────────────────────────────
function safeFmt(val: unknown, fmt: 'time' | 'duration'): string {
  if (val === undefined || val === null || val === '') return '—'
  if (fmt === 'duration') return `${val} min`
  try {
    const d = new Date(val as string)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  } catch { return '—' }
}

// ─── Demo session (always valid) ──────────────────────────────────────────────
const DEMO_SESSION = {
  Session_ID: 'SES000001', Centre: 'Delhi Rohini', Batch: 'JEE-2026-A',
  Course: 'JEE Advanced', Subject: 'Physics', Teacher_ID: 'TEACHER001',
  Classroom: 'Room 201', Start_Time: new Date().toISOString(),
  Duration_Minutes: 60, Grace_Minutes: 5,
  Expiry_Time: new Date(Date.now() + 3_600_000).toISOString(),
  QR_Token: 'demo-qr-token-abc123', Status: 'Active' as const,
  Created_At: new Date().toISOString(),
  present_count: 18, absent_count: 12, total_students: 45,
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SessionLivePage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { mutateAsync: closeSession, isPending: closing } = useCloseSession()

  // In demo mode, skip the API call entirely
  const { data: apiSession, isLoading } = useSessionLive(id, !IS_DEMO && !!id)
  const live = IS_DEMO ? DEMO_SESSION : apiSession ?? null

  // QR state — initialise immediately from live.QR_Token when available
  const [qrValue, setQrValue] = useState(() =>
    IS_DEMO ? JSON.stringify({ session_id: DEMO_SESSION.Session_ID, token: DEMO_SESSION.QR_Token }) : ''
  )
  const [secondsLeft, setSecondsLeft] = useState(90)
  const [qrExpiry, setQrExpiry]       = useState(Date.now() + 90_000)
  const [refreshing, setRefreshing]   = useState(false)
  const [closed, setClosed]           = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  const buildQrString = useCallback((token: string, sessionId: string) =>
    JSON.stringify({ session_id: sessionId, token, ts: Date.now() }), [])

  // Set QR as soon as we have a real session (non-demo path)
  useEffect(() => {
    if (!live || IS_DEMO) return
    setQrValue(buildQrString(live.QR_Token, live.Session_ID))
    setQrExpiry(Date.now() + 90_000)
    setSecondsLeft(90)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live?.Session_ID, live?.QR_Token])

  // Countdown
  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((qrExpiry - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0 && !IS_DEMO) refreshQr()
    }, 1000)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qrExpiry])

  async function refreshQr() {
    if (refreshing || IS_DEMO || !id) return
    setRefreshing(true)
    try {
      const data = await attendanceApi.refreshQrToken(id)
      const tok = (data as { token?: string; qr_token?: string }).token
        ?? (data as { token?: string; qr_token?: string }).qr_token ?? ''
      setQrValue(buildQrString(tok, id))
      setQrExpiry(Date.now() + 90_000)
      setSecondsLeft(90)
    } catch { /* keep old QR */ }
    finally { setRefreshing(false) }
  }

  async function handleClose() {
    if (IS_DEMO) { setClosed(true); setTimeout(() => router.push('/dashboard/attendance/session/list'), 1500); return }
    try {
      await closeSession(id)
      setClosed(true)
      setTimeout(() => router.push('/dashboard/attendance/session/list'), 2000)
    } catch { /* error shown by mutation */ }
  }

  if (!IS_DEMO && isLoading) return (
    <DashboardShell><div className="flex justify-center py-24"><Spinner size="lg"/></div></DashboardShell>
  )
  if (!live) return (
    <DashboardShell><div className="p-8 text-center text-gray-500">Session not found.</div></DashboardShell>
  )

  const pct       = live.total_students ? Math.round(((live.present_count ?? 0) / live.total_students) * 100) : 0
  const isActive  = live.Status === 'Active'

  return (
    <DashboardShell title="Live Session">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {isActive && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"/>}
              <Badge variant={isActive ? 'success' : 'default'}>{live.Status}</Badge>
              <Badge variant="info">{live.Subject}</Badge>
            </div>
            <h1 className="text-xl font-black text-gray-900 dark:text-white">{live.Batch} · {live.Course}</h1>
            <p className="text-sm text-gray-500">{live.Classroom} · {live.Duration_Minutes} min session</p>
          </div>
          {isActive && (
            <div className="flex gap-2">
              {!confirmClose
                ? <Button variant="danger" size="sm" onClick={() => setConfirmClose(true)}>⏹ Close Session</Button>
                : <>
                    <Button variant="danger" size="sm" disabled={closing} onClick={handleClose}>
                      {closing ? 'Closing…' : 'Confirm Close'}
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setConfirmClose(false)}>Cancel</Button>
                  </>
              }
            </div>
          )}
        </div>

        {closed       && <Alert variant="success">Session closed. Redirecting…</Alert>}
        {confirmClose && <Alert variant="warning">This will mark all non-present students as absent and lock the session. Sure?</Alert>}
        {IS_DEMO      && <Alert variant="info">Demo mode — QR below is fully functional for display. Real scanning requires backend.</Alert>}

        <div className="grid lg:grid-cols-2 gap-5">

          {/* QR Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800 dark:text-gray-200">QR Code</h2>
                <div className="flex items-center gap-2">
                  <CountdownRing seconds={secondsLeft} total={90} />
                  <Button variant="secondary" size="sm" onClick={refreshQr} disabled={refreshing || IS_DEMO}>
                    {refreshing ? '…' : '↺ Refresh'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col items-center gap-4">
                {/* QR code — always renders; no empty placeholder */}
                <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                  <QrDisplay value={qrValue} size={220} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">QR expires in</p>
                  <p className={`text-3xl font-black tabular-nums ${secondsLeft <= 10 ? 'text-red-500' : secondsLeft <= 30 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {IS_DEMO ? '90' : `${secondsLeft}`}s
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Auto-refreshes every 90 seconds</p>
                </div>
                <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Students scan this on their phone</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5">Session: {live.Session_ID}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Live count + session info */}
          <div className="space-y-4">
            <Card>
              <CardBody>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Live Count</p>
                <div className="flex items-end gap-1">
                  <span className="text-6xl font-black text-emerald-600 tabular-nums leading-none">{live.present_count ?? 0}</span>
                  <span className="text-3xl font-black text-gray-400 mb-1">/ {live.total_students ?? '—'}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">students present</p>
                <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                  <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                    style={{ width: `${pct}%` }} />
                </div>
                <p className="text-right text-xs text-gray-400 mt-1">{pct}% present</p>
              </CardBody>
            </Card>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Present', value: live.present_count ?? 0,    color: 'text-emerald-600' },
                { label: 'Absent',  value: live.absent_count  ?? 0,    color: 'text-red-600'     },
                { label: 'Total',   value: live.total_students ?? 0,   color: 'text-blue-600'    },
              ].map(({ label, value, color }) => (
                <Card key={label}>
                  <CardBody className="text-center py-3">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </CardBody>
                </Card>
              ))}
            </div>

            <Card>
              <CardBody>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Session Info</p>
                <div className="space-y-2">
                  {([
                    ['Session ID',  live.Session_ID],
                    ['Centre',      live.Centre],
                    ['Batch',       live.Batch],
                    ['Started',     safeFmt(live.Start_Time, 'time')],
                    ['Duration',    safeFmt(live.Duration_Minutes, 'duration')],
                    ['Grace',       safeFmt(live.Grace_Minutes, 'duration')],
                    ['Closes at',   safeFmt(live.Expiry_Time, 'time')],
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <div className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Ask students to open</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">Dashboard → Scan QR → Mark Attendance</p>
              <p className="text-xs text-gray-400 mt-1 font-mono">/dashboard/attendance/scan</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
