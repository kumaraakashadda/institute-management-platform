'use client'

import { useState, useRef, useCallback } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Alert } from '@/components/ui'
import { gasPost, IS_DEMO } from '@/lib/gasClient'

// ─── Template definitions ─────────────────────────────────────────────────────
const TEMPLATES = [
  {
    id: 'students',
    label: 'Students',
    icon: '🎓',
    description: 'Bulk add or update student records',
    color: '#2563EB',
    columns: ['Full_Name','DOB','Gender','Phone','Email','Parent_Name','Parent_Phone','Centre','Course','Batch','Target_Year','Segment','Admission_Date'],
    required: ['Full_Name','Phone','Centre','Course','Batch'],
    sampleRows: [
      ['Rahul Sharma','2006-05-12','Male','9876543210','rahul@email.com','Suresh Sharma','9876543200','Delhi Rohini','JEE Advanced','JEE-2026-A','2026','Classroom','2024-04-01'],
      ['Priya Singh','2007-03-22','Female','9876543211','priya@email.com','Amit Singh','9876543201','Delhi Dwarka','NEET','NEET-2026-B','2026','Online','2024-04-02'],
    ],
  },
  {
    id: 'admissions',
    label: 'Admissions',
    icon: '📋',
    description: 'Bulk create admission records (auto-creates students)',
    color: '#7C3AED',
    columns: ['Full_Name','DOB','Gender','Phone','Email','Parent_Name','Parent_Phone','Parent_Email','Address','Centre','Course','Batch','Target_Year','Segment','Admission_Date','Registration_Fee_Paid'],
    required: ['Full_Name','Phone','Centre','Course','Batch','Admission_Date'],
    sampleRows: [
      ['Arjun Kumar','2006-01-15','Male','9988776655','arjun@email.com','Ram Kumar','9988776600','ram@email.com','123 Main St, Delhi','Delhi Rohini','JEE Advanced','JEE-2026-A','2026','Classroom','2024-07-01','1000'],
    ],
  },
  {
    id: 'teachers',
    label: 'Teachers',
    icon: '👨‍🏫',
    description: 'Bulk add teacher accounts',
    color: '#059669',
    columns: ['Full_Name','Phone','Email','Centre','Subjects'],
    required: ['Full_Name','Phone','Email','Centre'],
    sampleRows: [
      ['Dr. Meera Sharma','9876543220','meera@institute.com','Delhi Rohini','Physics,Chemistry'],
      ['Prof. Rakesh Singh','9876543221','rakesh@institute.com','Delhi Dwarka','Mathematics'],
    ],
  },
  {
    id: 'fee_plans',
    label: 'Fee Plans',
    icon: '💰',
    description: 'Bulk create fee plans',
    color: '#D97706',
    columns: ['Plan_Name','Course','Segment','Target_Year','Total_Fee','Registration_Fee','No_Of_Installments','Description'],
    required: ['Plan_Name','Course','Total_Fee','No_Of_Installments'],
    sampleRows: [
      ['JEE 2026 Full','JEE Advanced','Classroom','2026','120000','5000','4','Full course fee plan'],
      ['NEET 2026 Standard','NEET','Online','2026','80000','3000','3','Online NEET preparation'],
    ],
  },
  {
    id: 'centres',
    label: 'Centres',
    icon: '🏫',
    description: 'Bulk add centres / branches',
    color: '#DC2626',
    columns: ['Centre_Name','Address','City','State','Phone','Email','Latitude','Longitude'],
    required: ['Centre_Name','City'],
    sampleRows: [
      ['Delhi Rohini','Sector 7 Rohini','Delhi','Delhi','9876543000','rohini@institute.com','28.7041','77.1025'],
      ['Delhi Dwarka','Sector 10 Dwarka','Delhi','Delhi','9876543001','dwarka@institute.com','28.5921','77.0460'],
    ],
  },
]

type UploadStep = 'select' | 'upload' | 'preview' | 'uploading' | 'done'
type ParsedRow = Record<string, string>

// ─── CSV parser (handles quoted commas) ──────────────────────────────────────
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)
  for (const line of lines) {
    if (!line.trim()) continue
    const cols: string[] = []
    let cur = '', inQuote = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { inQuote = !inQuote }
      else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cols.push(cur.trim())
    rows.push(cols)
  }
  return rows
}

// ─── CSV generator ────────────────────────────────────────────────────────────
function toCSV(columns: string[], rows: string[][]): string {
  const escape = (v: string) => v.includes(',') ? `"${v}"` : v
  return [columns.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')
}

function downloadCSV(filename: string, content: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([content], { type: 'text/csv' }))
  a.download = filename
  a.click()
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validateRows(rows: ParsedRow[], required: string[]): { valid: ParsedRow[]; errors: { row: number; issues: string[] }[] } {
  const valid: ParsedRow[] = []
  const errors: { row: number; issues: string[] }[] = []
  rows.forEach((row, i) => {
    const issues: string[] = []
    required.forEach(col => { if (!row[col]?.trim()) issues.push(`${col} is required`) })
    if (row.Phone && !/^[6-9]\d{9}$/.test(row.Phone.replace(/\s/g,''))) issues.push('Phone must be 10 digits starting with 6-9')
    if (row.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.Email)) issues.push('Invalid email format')
    if (issues.length) errors.push({ row: i + 2, issues })
    else valid.push(row)
  })
  return { valid, errors }
}

// ─── Google Sheets URL parser ─────────────────────────────────────────────────
function parseSheetId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]{20,})/)
  return match ? match[1] : null
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function BulkUploadPage() {
  const [step, setStep]           = useState<UploadStep>('select')
  const [template, setTemplate]   = useState<typeof TEMPLATES[0] | null>(null)
  const [rows, setRows]           = useState<ParsedRow[]>([])
  const [valid, setValid]         = useState<ParsedRow[]>([])
  const [errors, setErrors]       = useState<{ row: number; issues: string[] }[]>([])
  const [sheetUrl, setSheetUrl]   = useState('')
  const [sheetLoading, setSheetLoading] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: number; failed: number } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg]             = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  function selectTemplate(t: typeof TEMPLATES[0]) {
    setTemplate(t); setStep('upload'); setRows([]); setValid([]); setErrors([]); setMsg('')
  }

  function downloadTemplate(t: typeof TEMPLATES[0]) {
    downloadCSV(`IMP_${t.id}_template.csv`, toCSV(t.columns, t.sampleRows))
  }

  const processData = useCallback((rawRows: string[][], tpl: typeof TEMPLATES[0]) => {
    if (rawRows.length < 2) { setMsg('File must have a header row + at least one data row.'); return }
    const headers = rawRows[0].map(h => h.trim())
    const dataRows: ParsedRow[] = rawRows.slice(1).map(r => {
      const obj: ParsedRow = {}
      headers.forEach((h, i) => { obj[h] = (r[i] || '').trim() })
      return obj
    }).filter(r => Object.values(r).some(v => v !== ''))

    const { valid: v, errors: e } = validateRows(dataRows, tpl.required)
    setRows(dataRows); setValid(v); setErrors(e); setStep('preview'); setMsg('')
  }, [])

  function handleFile(file: File) {
    if (!template) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      processData(parsed, template)
    }
    reader.readAsText(file)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  async function fetchFromSheet() {
    if (!template || !sheetUrl.trim()) return
    const id = parseSheetId(sheetUrl)
    if (!id) { setMsg('Invalid Google Sheets URL. Copy the URL from your browser address bar.'); return }
    setSheetLoading(true); setMsg('')
    try {
      // Export as CSV from Google Sheets public URL
      const csvUrl = `https://docs.google.com/spreadsheets/d/${id}/export?format=csv`
      const res = await fetch(csvUrl)
      if (!res.ok) throw new Error('Could not access sheet. Make sure it is shared as "Anyone with the link can view".')
      const text = await res.text()
      processData(parseCSV(text), template)
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Failed to fetch sheet data.')
    } finally {
      setSheetLoading(false)
    }
  }

  async function submitUpload() {
    if (!template || valid.length === 0) return
    setUploading(true); setStep('uploading')
    let success = 0, failed = 0

    if (IS_DEMO) {
      // Simulate upload in demo mode
      await new Promise(r => setTimeout(r, 1500))
      success = valid.length; failed = 0
    } else {
      // Map template ID to GAS action
      const ACTION_MAP: Record<string, string> = {
        students:   'createAdmission',
        admissions: 'createAdmission',
        teachers:   'createStaff',
        fee_plans:  'createFeePlan',
        centres:    'createMasterData',
      }
      const action = ACTION_MAP[template.id]

      for (const row of valid) {
        try {
          const payload = template.id === 'teachers'
            ? { staffType: 'teacher', fields: row }
            : template.id === 'centres'
            ? { table: 'Centres', fields: row }
            : template.id === 'fee_plans'
            ? { fields: row }
            : { fields: row }
          await gasPost(action, payload)
          success++
        } catch { failed++ }
      }
    }

    setUploadResult({ success, failed })
    setUploading(false); setStep('done')
  }

  function reset() { setStep('select'); setTemplate(null); setRows([]); setValid([]); setErrors([]); setUploadResult(null); setMsg(''); setSheetUrl('') }

  return (
    <DashboardShell title="Bulk Upload">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">📤 Bulk Upload</h1>
            <p className="text-sm text-gray-500 mt-0.5">Upload students, admissions, teachers, fee plans, and centres via CSV, Excel, or Google Sheets</p>
          </div>
          {step !== 'select' && (
            <Button variant="secondary" size="sm" onClick={reset}>← Back to templates</Button>
          )}
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — uploads are simulated. Connect a backend to save real data.</Alert>}
        {msg && <Alert variant="danger">{msg}</Alert>}

        {/* ── STEP 1: Template selection ── */}
        {step === 'select' && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(t => (
              <Card key={t.id} className="cursor-pointer hover:shadow-md transition-all">
                <CardBody>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                      style={{ background: t.color + '15' }}>
                      {t.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 dark:text-white text-sm">{t.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t.description}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{t.columns.length} columns · {t.required.length} required</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" className="flex-1" onClick={() => selectTemplate(t)}
                      style={{ background: t.color }}>
                      Upload
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => downloadTemplate(t)}>
                      📥 Template
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* ── STEP 2: Upload source ── */}
        {step === 'upload' && template && (
          <div className="space-y-4">
            {/* Template info */}
            <Card>
              <CardBody>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white">Uploading: {template.label}</p>
                    <p className="text-xs text-gray-500">Required columns: {template.required.join(', ')}</p>
                  </div>
                  <Button size="sm" variant="secondary" className="ml-auto" onClick={() => downloadTemplate(template)}>
                    📥 Download Template CSV
                  </Button>
                </div>
                <div className="mt-3 flex flex-wrap gap-1">
                  {template.columns.map(c => (
                    <span key={c} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${template.required.includes(c) ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {c}{template.required.includes(c) ? ' *' : ''}
                    </span>
                  ))}
                </div>
              </CardBody>
            </Card>

            <div className="grid md:grid-cols-2 gap-4">
              {/* CSV / Excel upload */}
              <Card>
                <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">📁 Upload CSV / Excel file</h2></CardHeader>
                <CardBody>
                  <div
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onClick={() => fileRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all">
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Drop your file here</p>
                    <p className="text-xs text-gray-400 mt-1">or click to browse</p>
                    <p className="text-[10px] text-gray-400 mt-2">Supports .csv files (save Excel as CSV first)</p>
                  </div>
                  <input
                    ref={fileRef} type="file" accept=".csv,.txt" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                  />
                  <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">📊 Excel users</p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Open your Excel file → File → Save As → CSV (Comma delimited) → Upload here</p>
                  </div>
                </CardBody>
              </Card>

              {/* Google Sheets */}
              <Card>
                <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">🔗 Import from Google Sheets</h2></CardHeader>
                <CardBody>
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                    Paste the URL of a Google Sheet. The first row must be column headers matching the template. The sheet must be shared as <strong>&quot;Anyone with the link can view&quot;</strong>.
                  </p>
                  <div className="space-y-3">
                    <input
                      value={sheetUrl} onChange={e => setSheetUrl(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      className="w-full rounded-xl border px-3 py-2.5 text-xs outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                    <Button className="w-full" onClick={fetchFromSheet} disabled={!sheetUrl.trim() || sheetLoading}>
                      {sheetLoading ? 'Fetching…' : '📥 Fetch & Preview'}
                    </Button>
                  </div>
                  <div className="mt-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 space-y-1">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">How to share your sheet</p>
                    {['Open your Google Sheet','Click Share (top right)','Change to "Anyone with the link"','Set role to "Viewer"','Click Copy link, paste above'].map((s, i) => (
                      <p key={i} className="text-[11px] text-blue-600 dark:text-blue-400">{i+1}. {s}</p>
                    ))}
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        )}

        {/* ── STEP 3: Preview & validate ── */}
        {step === 'preview' && template && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total Rows',   value: rows.length,   color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Valid Rows',   value: valid.length,  color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'With Errors',  value: errors.length, color: 'text-red-600',    bg: 'bg-red-50 dark:bg-red-900/20' },
              ].map(({ label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
                  <p className={`text-3xl font-black ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="font-bold text-red-600">⚠️ Rows with errors (will be skipped)</h2>
                </CardHeader>
                <div className="max-h-48 overflow-y-auto divide-y dark:divide-gray-800">
                  {errors.map(({ row, issues }) => (
                    <div key={row} className="px-4 py-2.5 flex gap-3 items-start">
                      <Badge variant="danger">Row {row}</Badge>
                      <p className="text-xs text-red-600 dark:text-red-400">{issues.join(' · ')}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Data preview */}
            {valid.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="font-bold text-gray-800 dark:text-gray-200">✅ Preview — {valid.length} valid rows ready to upload</h2>
                </CardHeader>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-gray-800">
                        <th className="px-3 py-2 text-left text-gray-500 font-semibold">#</th>
                        {template.columns.slice(0, 6).map(c => (
                          <th key={c} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">{c}</th>
                        ))}
                        {template.columns.length > 6 && <th className="px-3 py-2 text-left text-gray-400">+{template.columns.length - 6} more</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800">
                      {valid.slice(0, 8).map((row, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                          <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                          {template.columns.slice(0, 6).map(c => (
                            <td key={c} className="px-3 py-2 text-gray-900 dark:text-gray-100 max-w-[120px] truncate">{row[c] || '—'}</td>
                          ))}
                          {template.columns.length > 6 && <td className="px-3 py-2 text-gray-400">…</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {valid.length > 8 && (
                    <p className="px-4 py-2 text-xs text-gray-400 text-center border-t dark:border-gray-800">
                      + {valid.length - 8} more rows not shown
                    </p>
                  )}
                </div>
              </Card>
            )}

            <div className="flex gap-3">
              <Button className="flex-1" disabled={valid.length === 0} onClick={submitUpload}
                style={{ background: template.color }}>
                ⬆️ Upload {valid.length} Valid Rows
              </Button>
              <Button variant="secondary" onClick={() => setStep('upload')}>← Re-upload</Button>
            </div>
          </div>
        )}

        {/* ── STEP: Uploading ── */}
        {step === 'uploading' && (
          <Card>
            <CardBody className="text-center py-12">
              <div className="w-16 h-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin mx-auto mb-4" />
              <p className="font-bold text-gray-900 dark:text-white">Uploading {valid.length} records…</p>
              <p className="text-sm text-gray-500 mt-1">Please wait, do not close this tab</p>
            </CardBody>
          </Card>
        )}

        {/* ── STEP: Done ── */}
        {step === 'done' && uploadResult && template && (
          <Card>
            <CardBody className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-3xl mx-auto">
                {uploadResult.failed === 0 ? '✅' : '⚠️'}
              </div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Upload Complete</h2>
              <div className="flex gap-4 justify-center">
                <div className="text-center">
                  <p className="text-3xl font-black text-emerald-600">{uploadResult.success}</p>
                  <p className="text-xs text-gray-500">Records uploaded</p>
                </div>
                {uploadResult.failed > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-black text-red-600">{uploadResult.failed}</p>
                    <p className="text-xs text-gray-500">Failed</p>
                  </div>
                )}
              </div>
              {IS_DEMO && <p className="text-xs text-gray-400">(Demo mode — data not actually saved)</p>}
              <div className="flex gap-3 justify-center">
                <Button onClick={reset}>Upload Another File</Button>
                <Button variant="secondary" onClick={() => downloadCSV(`IMP_${template.id}_template.csv`, toCSV(template.columns, template.sampleRows))}>
                  📥 Download Template Again
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ── Help section ── */}
        {step === 'select' && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">📖 How Bulk Upload Works</h2></CardHeader>
            <CardBody>
              <div className="grid sm:grid-cols-3 gap-4">
                {[
                  { step: '1', title: 'Download Template', desc: 'Click "Template" on any card above to get a CSV with the correct headers and sample data.', icon: '📥' },
                  { step: '2', title: 'Fill in Your Data', desc: 'Open in Excel or Google Sheets. Fill each row. Keep the header row exactly as-is. Save as CSV.', icon: '✏️' },
                  { step: '3', title: 'Upload & Confirm', desc: 'Upload the file or paste your Google Sheet URL. Review the preview, fix any errors, then click Upload.', icon: '⬆️' },
                ].map(({ step, title, desc, icon }) => (
                  <div key={step} className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0">{step}</div>
                    <div>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{icon} {title}</p>
                      <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">⚠️ Important rules</p>
                <div className="grid sm:grid-cols-2 gap-x-4 gap-y-0.5">
                  {['Do not change column header names','Date format: YYYY-MM-DD (e.g. 2024-04-01)','Phone: 10 digits, starting with 6-9','Remove any merged cells before uploading','One sheet per upload (no multiple tabs)','Check the preview carefully before confirming'].map(r => (
                    <p key={r} className="text-[11px] text-gray-500 flex gap-1.5"><span className="text-blue-500 shrink-0">→</span>{r}</p>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
