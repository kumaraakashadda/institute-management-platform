'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Button, Input, Select, Alert } from '@/components/ui'
import { useCreateSession } from '@/lib/attendance/useAttendance'
import { useQuery } from '@tanstack/react-query'
import { gasGet } from '@/lib/gasClient'

interface MasterItem { [k: string]: string }
interface FeatureFlag { Flag_Key: string; Enabled: string | boolean }

export default function NewSessionPage() {
  const router = useRouter()
  const { mutateAsync: createSession, isPending, error } = useCreateSession()

  const { data: centres } = useQuery({ queryKey: ['centres'], queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Centres' }), staleTime: 10 * 60_000 })
  const { data: batches } = useQuery({ queryKey: ['batches'], queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Batches' }), staleTime: 10 * 60_000 })
  const { data: courses } = useQuery({ queryKey: ['courses'], queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Courses' }), staleTime: 10 * 60_000 })
  const { data: subjects } = useQuery({ queryKey: ['subjects'], queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Subjects' }), staleTime: 10 * 60_000 })
  const { data: flags } = useQuery({ queryKey: ['feature-flags'], queryFn: () => gasGet<FeatureFlag[]>('listFeatureFlags', {}), staleTime: 60_000, retry: false })
  const gpsRequired = flags?.some(f => f.Flag_Key === 'ENABLE_GPS_VALIDATION' && (f.Enabled === true || String(f.Enabled).toUpperCase() === 'TRUE')) ?? false

  const [form, setForm] = useState({
    Centre: '', Batch: '', Course: '', Subject: '',
    Classroom: '', Duration_Minutes: 60, Grace_Minutes: 5,
    Start_Time: new Date().toISOString().slice(0, 16),
  })
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null)
  const [gpsStatus, setGpsStatus] = useState<'idle' | 'locating' | 'ok' | 'denied'>('idle')

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  function captureGps() {
    if (!navigator.geolocation) { setGpsStatus('denied'); return }
    setGpsStatus('locating')
    navigator.geolocation.getCurrentPosition(
      pos => { setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGpsStatus('ok') },
      () => setGpsStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (gpsRequired && !gps) { captureGps(); return }
    try {
      const session = await createSession({
        ...form,
        Duration_Minutes: Number(form.Duration_Minutes),
        Grace_Minutes: Number(form.Grace_Minutes),
        Teacher_GPS_Lat: gps ? String(gps.lat) : '',
        Teacher_GPS_Lng: gps ? String(gps.lng) : '',
      })
      router.push(`/dashboard/attendance/session/${session.Session_ID}`)
    } catch { /* error shown below */ }
  }

  return (
    <DashboardShell title="Start Session">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">▶️ Start Attendance Session</h1>
          <p className="text-sm text-gray-500 mt-0.5">Fill in the session details. A QR code will be generated instantly.</p>
        </div>

        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">Session Details</h2></CardHeader>
          <CardBody>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Centre *" value={form.Centre} onChange={set('Centre')} required>
                  <option value="">Select Centre</option>
                  {centres?.filter(c => c.Status !== 'Deleted').map(c => (
                    <option key={c.Centre_ID} value={c.Centre_Name}>{c.Centre_Name}</option>
                  ))}
                </Select>
                <Select label="Batch *" value={form.Batch} onChange={set('Batch')} required>
                  <option value="">Select Batch</option>
                  {batches?.filter(b => b.Status !== 'Deleted').map(b => (
                    <option key={b.Batch_ID} value={b.Batch_Name}>{b.Batch_Name}</option>
                  ))}
                </Select>
                <Select label="Course *" value={form.Course} onChange={set('Course')} required>
                  <option value="">Select Course</option>
                  {courses?.filter(c => c.Status !== 'Deleted').map(c => (
                    <option key={c.Course_ID} value={c.Course_Name}>{c.Course_Name}</option>
                  ))}
                </Select>
                <Select label="Subject *" value={form.Subject} onChange={set('Subject')} required>
                  <option value="">Select Subject</option>
                  {subjects?.filter(s => s.Status !== 'Deleted').map(s => (
                    <option key={s.Subject_ID} value={s.Subject_Name}>{s.Subject_Name}</option>
                  ))}
                </Select>
                <Input label="Classroom *" value={form.Classroom} onChange={set('Classroom')} required placeholder="e.g. Room 201" />
                <Input label="Start Time" type="datetime-local" value={form.Start_Time} onChange={set('Start_Time')} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Duration (minutes) *</label>
                  <select value={form.Duration_Minutes} onChange={set('Duration_Minutes')}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    {[30,45,60,75,90,120].map(v => <option key={v} value={v}>{v} minutes</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Grace Period (minutes)</label>
                  <select value={form.Grace_Minutes} onChange={set('Grace_Minutes')}
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                    {[0,5,10,15,20].map(v => <option key={v} value={v}>{v} minutes</option>)}
                  </select>
                </div>
              </div>

              {gpsRequired && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-300">📍 GPS location required</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      {gpsStatus === 'ok' && gps ? `Captured (${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)})`
                        : gpsStatus === 'locating' ? 'Getting your location…'
                        : gpsStatus === 'denied' ? 'Location access denied — enable it in your browser settings.'
                        : 'This centre requires your location to start a session.'}
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={captureGps} disabled={gpsStatus === 'locating'}>
                    {gpsStatus === 'ok' ? '↺ Recapture' : '📍 Get Location'}
                  </Button>
                </div>
              )}

              {/* Rules reminder */}
              <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4 space-y-2">
                <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Attendance rules applied automatically</p>
                <div className="grid grid-cols-2 gap-1 text-xs text-blue-600 dark:text-blue-400">
                  {['✓ Session validity check','✓ Student batch check','✓ Duplicate prevention','✓ QR expiry check','✓ JWT token validation','✓ Auto-absent on close'].map(r => (
                    <span key={r}>{r}</span>
                  ))}
                </div>
              </div>

              {error && <Alert variant="danger">{String(error).replace('Error: ','')}</Alert>}

              <div className="flex gap-3">
                <Button type="submit" disabled={isPending} className="flex-1">
                  {isPending ? 'Creating Session…' : '▶️ Start Session & Generate QR'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
              </div>
            </form>
          </CardBody>
        </Card>
      </div>
    </DashboardShell>
  )
}
