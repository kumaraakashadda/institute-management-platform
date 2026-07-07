'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Button, Input, Select, Alert, Badge } from '@/components/ui'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'

interface MasterItem { [k: string]: string }

const STEPS = ['Student Details', 'Parent & Contact', 'Academic Info', 'Fee & Review']

export default function NewAdmissionPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [saved, setSaved] = useState<{ Admission_ID: string; Student_ID: string } | null>(null)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    // Step 0 — Student
    Full_Name: '', DOB: '', Gender: '', Phone: '', Email: '', Address: '',
    // Step 1 — Parent
    Parent_Name: '', Parent_Phone: '', Parent_Email: '',
    // Step 2 — Academic
    Centre: '', Course: '', Batch: '', Target_Year: '', Segment: '', Counsellor: '',
    Admission_Date: new Date().toISOString().slice(0, 10),
    // Step 3 — Fee
    Registration_Fee_Paid: '',
  })

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const { data: centres } = useQuery({ queryKey: ['centres'], queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Centres' }), staleTime: 300_000 })
  const { data: courses }  = useQuery({ queryKey: ['courses'],  queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Courses'  }), staleTime: 300_000 })
  const { data: batches }  = useQuery({ queryKey: ['batches'],  queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Batches'  }), staleTime: 300_000 })
  const { data: segments } = useQuery({ queryKey: ['segments'], queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Segments' }), staleTime: 300_000 })
  const { data: years }    = useQuery({ queryKey: ['years'],    queryFn: () => gasGet<MasterItem[]>('listMasterData', { table: 'Target_Years' }), staleTime: 300_000 })

  const DEMO_CENTRES  = ['Delhi Rohini', 'Delhi Dwarka', 'Noida Sec18', 'Gurgaon']
  const DEMO_COURSES  = ['JEE Advanced', 'JEE Mains', 'NEET', 'Foundation', 'CUET']
  const DEMO_BATCHES  = ['JEE-2026-A', 'JEE-2026-B', 'NEET-2026-A', 'NEET-2026-B', 'FND-2025-A']
  const DEMO_SEGMENTS = ['Classroom', 'Online', 'Hybrid']
  const DEMO_YEARS    = ['2025', '2026', '2027', '2028']

  const centreList  = centres?.map(c => c.Centre_Name)  ?? DEMO_CENTRES
  const courseList  = courses?.map(c => c.Course_Name)  ?? DEMO_COURSES
  const batchList   = batches?.filter(b => !form.Centre || b.Centre === form.Centre).map(b => b.Batch_Name) ?? DEMO_BATCHES
  const segmentList = segments?.map(s => s.Segment_Name) ?? DEMO_SEGMENTS
  const yearList    = years?.map(y => y.Target_Year_Name || y.Year) ?? DEMO_YEARS

  const { mutateAsync: submit, isPending } = useMutation({
    mutationFn: () => IS_DEMO
      ? Promise.resolve({ Admission_ID: 'ADM' + Date.now(), Student_ID: 'STU' + Date.now() })
      : gasPost<{ Admission_ID: string; Student_ID: string }>('createAdmission', { fields: form }),
    onSuccess: (data) => { setSaved(data) },
    onError: (e) => setError(String(e).replace('Error:', '')),
  })

  function validateStep() {
    setError('')
    if (step === 0) {
      if (!form.Full_Name.trim()) return setError('Student name is required'), false
      if (!/^[6-9]\d{9}$/.test(form.Phone)) return setError('Enter a valid 10-digit mobile number'), false
    }
    if (step === 1) {
      if (!form.Parent_Name.trim()) return setError('Parent name is required'), false
      if (!/^[6-9]\d{9}$/.test(form.Parent_Phone)) return setError('Enter a valid parent mobile number'), false
    }
    if (step === 2) {
      if (!form.Centre) return setError('Centre is required'), false
      if (!form.Course) return setError('Course is required'), false
      if (!form.Batch)  return setError('Batch is required'), false
    }
    return true
  }

  function next() { if (validateStep()) setStep(s => s + 1) }
  function back() { setStep(s => Math.max(0, s - 1)); setError('') }

  if (saved) return (
    <DashboardShell title="Admission Created">
      <div className="p-6 max-w-lg mx-auto text-center space-y-5 mt-12">
        <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-4xl mx-auto">🎉</div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Admission Successful!</h1>
        <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-5 space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">Admission ID</span><span className="font-bold font-mono text-blue-600">{saved.Admission_ID}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Student ID</span><span className="font-bold font-mono text-emerald-600">{saved.Student_ID}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Student Name</span><span className="font-bold">{form.Full_Name}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Course</span><span className="font-bold">{form.Course}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">Centre</span><span className="font-bold">{form.Centre}</span></div>
        </div>
        {IS_DEMO && <p className="text-xs text-gray-400">Demo mode — data not saved to backend.</p>}
        <p className="text-sm text-gray-500">Student portal account has been auto-created. The student can log in using their phone number.</p>
        <div className="flex gap-3 justify-center">
          <Button onClick={() => { setSaved(null); setStep(0); setForm(f => ({ ...f, Full_Name: '', Phone: '', Email: '', DOB: '', Gender: '', Parent_Name: '', Parent_Phone: '', Parent_Email: '' })) }}>
            + New Admission
          </Button>
          <Button variant="secondary" onClick={() => router.push('/dashboard/admissions')}>
            View All Admissions
          </Button>
        </div>
      </div>
    </DashboardShell>
  )

  return (
    <DashboardShell title="New Admission">
      <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">←</button>
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📋 New Admission</h1>
            <p className="text-sm text-gray-500">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex gap-1">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1 flex flex-col gap-1">
              <div className={`h-1.5 rounded-full transition-all ${i <= step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`} />
              <p className={`text-[9px] font-semibold hidden sm:block ${i === step ? 'text-blue-600' : 'text-gray-400'}`}>{s}</p>
            </div>
          ))}
        </div>

        {error && <Alert variant="danger">{error}</Alert>}

        <Card>
          <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">{STEPS[step]}</h2></CardHeader>
          <CardBody>
            {step === 0 && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Full Name *" value={form.Full_Name} onChange={set('Full_Name')} placeholder="As per ID proof" />
                  <Input label="Date of Birth" type="date" value={form.DOB} onChange={set('DOB')} />
                  <Select label="Gender" value={form.Gender} onChange={set('Gender')}>
                    <option value="">Select Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </Select>
                  <Input label="Mobile Number *" value={form.Phone} onChange={set('Phone')} placeholder="10-digit mobile" maxLength={10} />
                  <Input label="Email" type="email" value={form.Email} onChange={set('Email')} placeholder="student@email.com" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Address</label>
                  <textarea value={form.Address} onChange={set('Address')} rows={2} placeholder="Full address"
                    className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none" />
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Parent/Guardian Name *" value={form.Parent_Name} onChange={set('Parent_Name')} placeholder="Full name" />
                <Input label="Parent Mobile *" value={form.Parent_Phone} onChange={set('Parent_Phone')} placeholder="10-digit mobile" maxLength={10} />
                <Input label="Parent Email" type="email" value={form.Parent_Email} onChange={set('Parent_Email')} placeholder="parent@email.com" />
                <div className="sm:col-span-2">
                  <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">ℹ️ Parent portal will be auto-created</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">Parent can log in with their mobile number to view attendance and fees.</p>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Centre *" value={form.Centre} onChange={set('Centre')}>
                  <option value="">Select Centre</option>
                  {centreList.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Select label="Course *" value={form.Course} onChange={set('Course')}>
                  <option value="">Select Course</option>
                  {courseList.map(c => <option key={c}>{c}</option>)}
                </Select>
                <Select label="Batch *" value={form.Batch} onChange={set('Batch')}>
                  <option value="">Select Batch</option>
                  {batchList.map(b => <option key={b}>{b}</option>)}
                </Select>
                <Select label="Target Year" value={form.Target_Year} onChange={set('Target_Year')}>
                  <option value="">Select Year</option>
                  {yearList.map(y => <option key={y}>{y}</option>)}
                </Select>
                <Select label="Segment" value={form.Segment} onChange={set('Segment')}>
                  <option value="">Select Segment</option>
                  {segmentList.map(s => <option key={s}>{s}</option>)}
                </Select>
                <Input label="Counsellor Name" value={form.Counsellor} onChange={set('Counsellor')} placeholder="Assigned counsellor" />
                <Input label="Admission Date" type="date" value={form.Admission_Date} onChange={set('Admission_Date')} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div>
                  <Input label="Registration Fee Paid (₹)" type="number" value={form.Registration_Fee_Paid} onChange={set('Registration_Fee_Paid')} placeholder="0" />
                  <p className="text-xs text-gray-400 mt-1">Enter 0 if not collected yet. Can be updated later.</p>
                </div>

                {/* Summary */}
                <div className="rounded-2xl bg-gray-50 dark:bg-gray-800 p-4 space-y-3 text-sm">
                  <p className="font-bold text-gray-900 dark:text-white mb-2">Review Summary</p>
                  {[
                    ['Student Name', form.Full_Name], ['Mobile', form.Phone], ['Email', form.Email || '—'],
                    ['Parent', form.Parent_Name], ['Parent Mobile', form.Parent_Phone],
                    ['Centre', form.Centre], ['Course', form.Course], ['Batch', form.Batch],
                    ['Target Year', form.Target_Year || '—'], ['Segment', form.Segment || '—'],
                    ['Counsellor', form.Counsellor || '—'], ['Admission Date', form.Admission_Date],
                    ['Reg. Fee', form.Registration_Fee_Paid ? `₹${form.Registration_Fee_Paid}` : '₹0'],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between border-b border-gray-100 dark:border-gray-700 pb-1 last:border-0">
                      <span className="text-gray-500 text-xs">{l}</span>
                      <span className="font-semibold text-gray-900 dark:text-gray-100 text-xs text-right max-w-[60%]">{v}</span>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 p-3 text-xs text-emerald-700 dark:text-emerald-300">
                  <p className="font-semibold">✅ Auto-created after admission:</p>
                  <div className="mt-1 space-y-0.5">
                    {['Student record in database', 'Unique Student ID (e.g. STU000001)', 'QR Identity for attendance', 'Student portal login account', 'Parent portal login account', 'Assigned to batch and centre'].map(i => (
                      <p key={i}>→ {i}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="flex justify-between gap-3">
          <Button variant="secondary" onClick={back} disabled={step === 0}>← Back</Button>
          {step < STEPS.length - 1
            ? <Button onClick={next}>Next →</Button>
            : <Button onClick={() => submit()} disabled={isPending}>
                {isPending ? 'Saving admission…' : '✅ Create Admission'}
              </Button>
          }
        </div>
      </div>
    </DashboardShell>
  )
}
