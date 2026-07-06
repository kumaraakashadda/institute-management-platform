'use client'

import { useState, useEffect, useRef } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Alert, Button } from '@/components/ui'
import { useRecordAttendance } from '@/lib/attendance/useAttendance'
import { IS_DEMO } from '@/lib/gasClient'
import type { ScanResult } from '@/lib/attendance/types'

function getDeviceInfo() {
  if (typeof window === 'undefined') return {}
  const ua = navigator.userAgent
  return {
    device: /Mobile/.test(ua) ? 'Mobile' : /Tablet/.test(ua) ? 'Tablet' : 'Desktop',
    browser: /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Other',
    os: /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : 'Other',
    screen: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language,
  }
}

type ScanState = 'idle' | 'scanning' | 'success' | 'error'

export default function ScanQrPage() {
  const [state, setState]     = useState<ScanState>('idle')
  const [result, setResult]   = useState<ScanResult | null>(null)
  const [manualInput, setManualInput] = useState('')
  const [tab, setTab]         = useState<'camera' | 'manual'>('camera')
  const [gps, setGps]         = useState<{ lat: number; lng: number } | null>(null)
  const scannerRef            = useRef<{ stop: () => void } | null>(null)
  const divRef                = useRef<HTMLDivElement>(null)

  const { mutateAsync: record } = useRecordAttendance()

  // Collect GPS (optional)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {} // GPS optional — don't block
      )
    }
  }, [])

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (tab === 'camera' && state === 'idle') startScanner()
    return () => { scannerRef.current?.stop?.() }
  }, [tab])

  async function startScanner() {
    if (typeof window === 'undefined') return
    try {
      const { Html5Qrcode } = await import('html5-qrcode')
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      setState('scanning')
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => { scanner.stop(); handleScan(decodedText) },
        () => {}
      )
    } catch (err) {
      setState('error')
      setResult({ success: false, message: 'Camera access denied. Use the manual entry tab instead.', error: String(err) })
    }
  }

  async function handleScan(raw: string) {
    setState('scanning')
    try {
      let scanData: { session_id: string; token: string }
      try { scanData = JSON.parse(raw) }
      catch { throw new Error('Invalid QR code. Make sure you are scanning the attendance QR.') }

      if (!scanData.session_id || !scanData.token) throw new Error('QR code is missing required fields.')

      const deviceInfo: Record<string, string> = Object.fromEntries(Object.entries({
        ...getDeviceInfo(),
        gps_lat: gps?.lat?.toString() || '',
        gps_lng: gps?.lng?.toString() || '',
      }).filter(([, v]) => v !== undefined)) as Record<string, string>

      if (IS_DEMO) {
        // Demo mode — simulate success
        setResult({ success: true, message: 'Demo: Attendance marked successfully!', student_name: 'Demo Student', status: 'Present' })
        setState('success')
        return
      }

      const res = await record({ scanData, deviceInfo })
      setResult({ success: true, message: res.message || 'Attendance marked!', student_name: res.student_name, status: res.status })
      setState('success')
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : 'Scan failed. Please try again.', error: String(err) })
      setState('error')
    }
  }

  async function handleManual(e: React.FormEvent) {
    e.preventDefault()
    if (!manualInput.trim()) return
    await handleScan(manualInput.trim())
  }

  function reset() { setState('idle'); setResult(null); setManualInput(''); if (tab === 'camera') startScanner() }

  return (
    <DashboardShell title="Scan QR">
      <div className="p-4 max-w-md mx-auto space-y-4">

        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">📷 Scan Attendance QR</h1>
          <p className="text-sm text-gray-500 mt-0.5">Point your camera at the QR code displayed by your teacher</p>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode. Real QR scanning requires a backend connection.</Alert>}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(['camera','manual'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); reset() }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all capitalize ${tab===t ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
              {t === 'camera' ? '📷 Camera' : '⌨️ Manual'}
            </button>
          ))}
        </div>

        {/* Result states */}
        {state === 'success' && result && (
          <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-3xl mx-auto">✓</div>
            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">Attendance Marked!</p>
            {result.student_name && <p className="text-sm text-emerald-600 dark:text-emerald-400">Welcome, {result.student_name}</p>}
            <p className="text-sm text-emerald-600 dark:text-emerald-400">{result.message}</p>
            <Button variant="secondary" onClick={reset} className="mt-2">Scan Again</Button>
          </div>
        )}

        {state === 'error' && result && (
          <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-red-500 flex items-center justify-center text-2xl mx-auto">✗</div>
            <p className="text-base font-bold text-red-700 dark:text-red-300">Failed</p>
            <p className="text-sm text-red-600 dark:text-red-400">{result.message}</p>
            <Button variant="secondary" onClick={reset}>Try Again</Button>
          </div>
        )}

        {(state === 'idle' || state === 'scanning') && (
          <>
            {tab === 'camera' && (
              <Card>
                <CardBody>
                  <div className="relative">
                    <div id="qr-reader" ref={divRef} className="w-full rounded-xl overflow-hidden" style={{ minHeight: '300px' }} />
                    {state === 'idle' && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-900/60 rounded-xl">
                        <p className="text-white text-sm font-medium">Starting camera…</p>
                      </div>
                    )}
                  </div>
                  <p className="text-center text-xs text-gray-400 mt-3">
                    Hold your phone steady. The QR will be scanned automatically.
                  </p>
                </CardBody>
              </Card>
            )}

            {tab === 'manual' && (
              <Card>
                <CardBody>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    If camera is not available, enter the session token provided by your teacher.
                  </p>
                  <form onSubmit={handleManual} className="space-y-3">
                    <textarea
                      value={manualInput} onChange={e => setManualInput(e.target.value)}
                      placeholder='Paste QR content here, or type the session token…'
                      rows={4}
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none font-mono"
                    />
                    <Button type="submit" className="w-full" disabled={!manualInput.trim()}>Submit</Button>
                  </form>
                </CardBody>
              </Card>
            )}
          </>
        )}

        {/* Info */}
        <div className="text-center space-y-1">
          <p className="text-xs text-gray-400">Your attendance is validated server-side</p>
          <div className="flex items-center justify-center gap-4 text-[10px] text-gray-400">
            {['Session check', 'Batch check', 'Duplicate check', 'Expiry check'].map(t => (
              <span key={t} className="flex items-center gap-1"><span className="text-emerald-500">✓</span>{t}</span>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  )
}
