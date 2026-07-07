'use client'

import { useState, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Alert } from '@/components/ui'
import { gasPost, IS_DEMO } from '@/lib/gasClient'

type UploadType = 'student_fees' | 'payments'
interface Row { [key: string]: string }
interface BulkResult { success: number; failed: number; errors: string[] }

const COLUMN_MAPS: Record<UploadType, { required: string[]; optional: string[]; example: Row }> = {
  student_fees: {
    required: ['Student_ID'],
    optional: ['Phone','Fee_Plan_ID','Fee_Plan_Name','Discount','Scholarship','Start_Date','Amount_Paid','Payment_Mode','Transaction_ID'],
    example: {
      Student_ID:'STU000001', Fee_Plan_Name:'JEE 2-Year', Discount:'10000',
      Scholarship:'0', Start_Date:'2025-06-01', Amount_Paid:'35000',
      Payment_Mode:'UPI', Transaction_ID:'TXN001',
    },
  },
  payments: {
    required: ['Student_ID','Amount'],
    optional: ['Payment_Mode','Transaction_ID','Payment_Date','Remarks'],
    example: {
      Student_ID:'STU000001', Amount:'35000', Payment_Mode:'Cash',
      Transaction_ID:'TXN002', Payment_Date:'2025-11-15', Remarks:'Installment 2',
    },
  },
}

function parseCSV(text: string): Row[] {
  const lines = text.trim().split('\n').filter(l => l.trim())
  if (lines.length < 2) return []
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''))
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|(?<=,)$|^(?=,))/g) || line.split(',')
    const row: Row = {}
    headers.forEach((h, i) => { row[h] = (vals[i] || '').trim().replace(/^"|"$/g,'') })
    return row
  }).filter(r => Object.values(r).some(v => v.trim()))
}

function downloadTemplate(type: UploadType) {
  const ex = COLUMN_MAPS[type].example
  const headers = Object.keys(ex).join(',')
  const values  = Object.values(ex).join(',')
  const csv = `${headers}\n${values}`
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `${type}_template.csv`
  a.click()
}

export default function BulkUploadPage() {
  const [type, setType]       = useState<UploadType>('student_fees')
  const [rows, setRows]       = useState<Row[]>([])
  const [preview, setPreview] = useState(false)
  const [result, setResult]   = useState<BulkResult | null>(null)
  const [gsUrl, setGsUrl]     = useState('')
  const [loadingGs, setLoadingGs] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const cfg = COLUMN_MAPS[type]

  const { mutateAsync: upload, isPending } = useMutation({
    mutationFn: () => gasPost<BulkResult>(
      type === 'student_fees' ? 'bulkImportStudentFees' : 'bulkImportPayments',
      { rows }
    ),
    onSuccess: r => { setResult(r); setRows([]); setPreview(false) },
  })

  function handleFile(file: File) {
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)
      setRows(parsed); setPreview(true); setResult(null)
    }
    reader.readAsText(file)
  }

  async function loadGoogleSheet() {
    if (!gsUrl.trim()) return
    setLoadingGs(true)
    try {
      // Convert Google Sheets URL to CSV export URL
      let csvUrl = gsUrl
      if (gsUrl.includes('/edit')) {
        const base = gsUrl.split('/edit')[0]
        const gid  = gsUrl.includes('gid=') ? gsUrl.split('gid=')[1].split('&')[0] : '0'
        csvUrl = `${base}/export?format=csv&gid=${gid}`
      } else if (gsUrl.includes('/spreadsheets/d/')) {
        const match = gsUrl.match(/\/spreadsheets\/d\/([^/]+)/)
        if (match) csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv&gid=0`
      }
      const res  = await fetch(csvUrl)
      const text = await res.text()
      const parsed = parseCSV(text)
      if (parsed.length === 0) throw new Error('No data rows found. Make sure the sheet is publicly accessible (Share → Anyone with link).')
      setRows(parsed); setPreview(true); setResult(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to load Google Sheet. Make sure it is shared publicly.')
    } finally { setLoadingGs(false) }
  }

  return (
    <DashboardShell title="Bulk Upload">
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">📤 Bulk Upload</h1>
          <p className="text-sm text-gray-500 mt-0.5">Import student fees and payments from Excel or Google Sheets</p>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — upload will be processed when backend is connected. Download a template to see the expected format.</Alert>}

        {/* Type selector */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {([['student_fees','📋 Assign Fee Plans'],['payments','💳 Record Payments']] as const).map(([k,l]) => (
            <button key={k} onClick={() => { setType(k); setRows([]); setPreview(false); setResult(null) }}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${type===k?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Column reference */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">Column Reference</h2>
              <Button size="sm" variant="secondary" onClick={() => downloadTemplate(type)}>↓ Download Template CSV</Button>
            </div>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {cfg.required.map(c => <Badge key={c} variant="danger">{c} *required</Badge>)}
              {cfg.optional.map(c => <Badge key={c} variant="default">{c}</Badge>)}
            </div>
            <div className="mt-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 overflow-x-auto">
              <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Example row:</p>
              <div className="flex gap-3 text-xs font-mono">
                {Object.entries(cfg.example).map(([k,v]) => (
                  <div key={k}><p className="text-gray-400">{k}</p><p className="text-gray-800 dark:text-gray-200 font-semibold">{v}</p></div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Upload methods */}
        <div className="grid sm:grid-cols-2 gap-4">
          {/* File upload */}
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">📁 Upload CSV / Excel</h2></CardHeader>
            <CardBody>
              <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleFile(e.target.files[0]) }}/>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                <p className="text-4xl mb-3">📂</p>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Click or drag & drop</p>
                <p className="text-xs text-gray-400 mt-1">CSV, XLSX, or XLS file</p>
                <p className="text-xs text-gray-400">Max {500} rows per upload</p>
              </div>
            </CardBody>
          </Card>

          {/* Google Sheet import */}
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">🔗 Import from Google Sheet</h2></CardHeader>
            <CardBody>
              <p className="text-xs text-gray-500 mb-3">
                Share your Google Sheet publicly (Anyone with link → Viewer), then paste the URL below.
              </p>
              <div className="space-y-3">
                <input value={gsUrl} onChange={e => setGsUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                <Button onClick={loadGoogleSheet} disabled={!gsUrl.trim() || loadingGs} className="w-full">
                  {loadingGs ? 'Loading…' : '📥 Load Google Sheet'}
                </Button>
              </div>
              <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-1">How to share:</p>
                <ol className="text-xs text-amber-600 dark:text-amber-400 space-y-1 list-decimal list-inside">
                  <li>Open your Google Sheet</li>
                  <li>File → Share → Publish to web</li>
                  <li>Or Share → Anyone with link → Viewer</li>
                  <li>Copy and paste the URL above</li>
                </ol>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Preview */}
        {preview && rows.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-gray-800 dark:text-gray-200">Preview — {rows.length} rows loaded</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Showing first 5 rows. Verify columns before uploading.</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => { setRows([]); setPreview(false) }}>Clear</Button>
                  <Button size="sm" disabled={isPending} onClick={() => upload()}>
                    {isPending ? 'Uploading…' : `Upload ${rows.length} rows`}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                    <tr>{Object.keys(rows[0]).map(h => <th key={h} className="px-3 py-2 text-left font-bold text-gray-500 uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-800">
                    {rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        {Object.values(row).map((v, j) => <td key={j} className="px-3 py-2 text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{v || '—'}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 5 && <p className="text-xs text-gray-400 text-center mt-2">…and {rows.length - 5} more rows</p>}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Result */}
        {result && (
          <Card>
            <CardBody>
              <div className="text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-4xl mx-auto ${result.failed === 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                  {result.failed === 0 ? '✅' : '⚠️'}
                </div>
                <div>
                  <p className="text-xl font-black text-gray-900 dark:text-white">Upload Complete</p>
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <div className="text-center"><p className="text-2xl font-black text-emerald-600">{result.success}</p><p className="text-xs text-gray-400">Successful</p></div>
                    <div className="text-center"><p className="text-2xl font-black text-red-500">{result.failed}</p><p className="text-xs text-gray-400">Failed</p></div>
                  </div>
                </div>
                {result.errors.length > 0 && (
                  <div className="text-left p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 max-h-48 overflow-y-auto">
                    <p className="text-xs font-bold text-red-700 dark:text-red-300 mb-2">Errors:</p>
                    {result.errors.map((e, i) => <p key={i} className="text-xs text-red-600 dark:text-red-400">{e}</p>)}
                  </div>
                )}
                <Button variant="secondary" onClick={() => setResult(null)} className="w-full">Upload More</Button>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
