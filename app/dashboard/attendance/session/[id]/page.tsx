'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Alert, Spinner } from '@/components/ui'
import { useSessionLive, useCloseSession } from '@/lib/attendance/useAttendance'
import { attendanceApi } from '@/lib/attendance/attendanceApi'
import { IS_DEMO } from '@/lib/gasClient'

// Client-only QR renderer. Uses the pure-JS SVG output of the `qrcode`
// library (QRCode.toString(..., { type: 'svg' })) instead of the canvas
// API — this is synchronous, has no external DOM element lifecycle to
// race against React's render cycle, and never throws the intermittent
// "canvas already in use" / blank-canvas errors the old approach had.
function QrCanvas({ value, size = 240 }: { value: string; size?: number }) {
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const requestId = useRef(0)

  useEffect(() => {
    if (!value) return
    const myRequest = ++requestId.current
    setFailed(false)
    import('qrcode')
      .then(QRCode =>
        QRCode.toString(value, {
          type: 'svg',
          width: size,
          margin: 2,
          color: { dark: '#111827', light: '#ffffff' },
        })
      )
      .then(svg => {
        // Ignore stale responses if the value changed while this was in flight
        if (myRequest === requestId.current) setSvgMarkup(svg)
      })
      .catch(() => {
        if (myRequest === requestId.current) setFailed(true)
      })
  }, [value, size])

  if (failed) {
    return (
      <div className="w-60 h-60 flex flex-col items-center justify-center gap-2 text-center px-4">
        <span className="text-3xl">⚠️</span>
        <p className="text-xs text-gray-500">Couldn&apos;t render the QR code. Try refreshing it above.</p>
      </div>
    )
  }

  if (!svgMarkup) {
    return <div className="w-60 h-60 flex items-center justify-center"><Spinner size="lg"/></div>
  }

  return (
    <div
      className="transition-opacity duration-300 opacity-100 [&_svg]:block [&_svg]:w-full [&_svg]:h-auto"
      style={{ width: size, height: size }}
      // Markup is generated locally by the `qrcode` library from our own
      // session token — never from user-controlled input.
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  )
}

function CountdownRing({ seconds, total }: { seconds: number; total: number }) {
  const r = 22; const c = 2 * Math.PI * r
  const pct = seconds / total
  const fill = pct * c
  const colour = seconds > 30 ? '#10b981' : seconds > 10 ? '#f59e0b' : '#ef4444'
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e5e7eb" strokeWidth="4"/>
      <circle cx="32" cy="32" r={r} fill="none" stroke={colour} strokeWidth="4"
        strokeDasharray={`${fill} ${c}`} strokeLinecap="round" transform="rotate(-90 32 32)"
        style={{ transition: 'stroke-dasharray 1s linear, stroke 0.3s' }}/>
      <text x="32" y="36" textAnchor="middle" fontSize="13" fontWeight="bold" fill={colour}>{seconds}</text>
    </svg>
  )
}

const DEMO_SESSION = {
  Session_ID: 'SES000001', Centre: 'Delhi Rohini', Batch: 'JEE-2026-A',
  Course: 'JEE Advanced', Subject: 'Physics', Teacher_ID: 'DEMO', Classroom: 'Room 201',
  Start_Time: new Date().toISOString(), Duration_Minutes: 60, Grace_Minutes: 5,
  Expiry_Time: new Date(Date.now() + 3600000).toISOString(),
  QR_Token: 'demo-token', Status: 'Active' as const, Created_At: new Date().toISOString(),
  present_count: 18, absent_count: 12, total_students: 45,
}

export default function SessionLivePage() {
  const { id } = useParams<{ id: string }>()
  const router   = useRouter()
  const { mutateAsync: closeSession, isPending: closing } = useCloseSession()

  const { data: session, isLoading } = useSessionLive(id, true)
  const live = session ?? (IS_DEMO ? DEMO_SESSION : null)

  const [qrValue, setQrValue]         = useState('')
  const [secondsLeft, setSecondsLeft] = useState(90)
  const [qrExpiry, setQrExpiry]       = useState<number>(Date.now() + 90000)
  const [refreshing, setRefreshing]   = useState(false)
  const [closed, setClosed]           = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)

  // Build QR string from session
  const buildQrString = useCallback((token: string, sessionId: string) => {
    return JSON.stringify({ session_id: sessionId, token, ts: Date.now() })
  }, [])

  // Initial QR setup
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!live) return
    setQrValue(buildQrString(live.QR_Token, live.Session_ID))
    const expiry = Date.now() + 90000
    setQrExpiry(expiry)
    setSecondsLeft(90)
  }, [live?.Session_ID]) // only on mount / session change

  // Countdown tick
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    const t = setInterval(() => {
      const left = Math.max(0, Math.floor((qrExpiry - Date.now()) / 1000))
      setSecondsLeft(left)
      if (left === 0) refreshQr()
    }, 1000)
    return () => clearInterval(t)
  }, [qrExpiry])

  async function refreshQr() {
    if (refreshing || IS_DEMO || !id) return
    setRefreshing(true)
    try {
      const data = await attendanceApi.refreshQrToken(id)
      setQrValue(buildQrString((data as { token: string }).token, id))
      setQrExpiry(Date.now() + 90000)
      setSecondsLeft(90)
    } catch { /* keep old QR */ }
    finally { setRefreshing(false) }
  }

  async function handleClose() {
    try {
      await closeSession(id)
      setClosed(true)
      setTimeout(() => router.push('/dashboard/attendance/session/list'), 2000)
    } catch { /* error handled by mutation */ }
  }

  if (isLoading) return <DashboardShell><div className="flex justify-center py-20"><Spinner size="lg"/></div></DashboardShell>
  if (!live)     return <DashboardShell><div className="p-6 text-center text-gray-500">Session not found.</div></DashboardShell>

  const sessionPct = live.total_students ? Math.round(((live.present_count||0)/live.total_students)*100) : 0
  const isActive = live.Status === 'Active'

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
            <p className="text-sm text-gray-500">{live.Classroom} · {live.Duration_Minutes}min session</p>
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

        {closed && <Alert variant="success">Session closed. Marking remaining students absent… Redirecting.</Alert>}
        {IS_DEMO && <Alert variant="warning">Demo mode — QR is for display only. Real scanning requires backend connection.</Alert>}
        {confirmClose && <Alert variant="warning">Closing will mark all non-present students as absent and lock the session permanently. Are you sure?</Alert>}

        <div className="grid lg:grid-cols-2 gap-5">
          {/* QR Panel */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-800 dark:text-gray-200">QR Code</h2>
                <div className="flex items-center gap-2">
                  <CountdownRing seconds={secondsLeft} total={90} />
                  <Button variant="secondary" size="sm" onClick={refreshQr} disabled={refreshing}>
                    {refreshing ? '…' : '↺ Refresh'}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col items-center gap-4">
                <div className="p-4 bg-white rounded-2xl shadow-inner border border-gray-100">
                  {qrValue
                    ? <QrCanvas value={qrValue} size={220} />
                    : <div className="w-[220px] h-[220px] flex items-center justify-center bg-gray-50 rounded-xl text-gray-300 text-5xl">QR</div>
                  }
                </div>
                <div className="text-center">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">QR expires in</p>
                  <p className={`text-3xl font-black tabular-nums ${secondsLeft <= 10 ? 'text-red-500' : secondsLeft <= 30 ? 'text-amber-500' : 'text-emerald-600'}`}>
                    {secondsLeft}s
                  </p>
                  <p className="text-xs text-gray-400 mt-1">Auto-refreshes every 90 seconds</p>
                </div>
                <div className="w-full bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500">Students scan this QR on their phone</p>
                  <p className="text-xs font-mono text-gray-400 mt-0.5 truncate">Session: {live.Session_ID}</p>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Live Count Panel */}
          <div className="space-y-4">
            {/* Big count */}
            <Card>
              <CardBody>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Live Count</p>
                <div className="flex items-end gap-1">
                  <span className="text-6xl font-black text-emerald-600 tabular-nums leading-none">{live.present_count||0}</span>
                  <span className="text-3xl font-black text-gray-400 mb-1">/ {live.total_students||'—'}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">students present</p>
                <div className="mt-3 w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3">
                  <div className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                    style={{ width: `${sessionPct}%` }} />
                </div>
                <p className="text-right text-xs text-gray-400 mt-1">{sessionPct}% present</p>
              </CardBody>
            </Card>

            {/* Breakdown */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Present', value: live.present_count||0, colour: 'emerald' },
                { label: 'Absent',  value: live.absent_count||0,  colour: 'red' },
                { label: 'Total',   value: live.total_students||0, colour: 'blue' },
              ].map(({ label, value, colour }) => (
                <Card key={label}>
                  <CardBody className="text-center py-3">
                    <p className={`text-2xl font-black text-${colour}-600`}>{value}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                  </CardBody>
                </Card>
              ))}
            </div>

            {/* Session info */}
            <Card>
              <CardBody>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Session Info</p>
                <div className="space-y-2">
                  {[
                    ['Session ID', live.Session_ID],
                    ['Started',    new Date(live.Start_Time).toLocaleTimeString()],
                    ['Duration',   `${live.Duration_Minutes} minutes`],
                    ['Grace',      `${live.Grace_Minutes} minutes`],
                    ['Closes at',  new Date(live.Expiry_Time).toLocaleTimeString()],
                  ].map(([k,v]) => (
                    <div key={k} className="flex justify-between text-xs">
                      <span className="text-gray-500">{k}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono">{v}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Share instructions */}
            <div className="p-3 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Ask students to</p>
              <p className="text-sm font-bold text-gray-800 dark:text-gray-200 mt-0.5">Open the app → Scan QR → Mark attendance</p>
              <p className="text-xs text-gray-400 mt-1">or visit <span className="font-mono">/dashboard/attendance/scan</span></p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
