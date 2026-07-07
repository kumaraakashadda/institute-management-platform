'use client'
import { useState, useEffect, useRef } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Button, Alert } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { IS_DEMO } from '@/lib/gasClient'

function LiveQr({ value, size=160 }: { value:string; size?:number }) {
  const [svg, setSvg] = useState<string|null>(null)
  useEffect(() => {
    if (!value) return
    import('qrcode').then(QR => QR.toString(value, { type:'svg', width:size, margin:2,
      color:{ dark:'#0f172a', light:'#ffffff' } })).then(setSvg).catch(()=>{})
  }, [value, size])
  if (!svg) return <div className="bg-white rounded-lg animate-pulse" style={{width:size,height:size}} />
  return <div className="rounded-lg overflow-hidden [&_svg]:block [&_svg]:w-full [&_svg]:h-auto bg-white" style={{width:size,height:size}} dangerouslySetInnerHTML={{ __html: svg }} />
}

const DEMO_DATA = {
  student_id: 'STU000001', name: 'Rahul Sharma', course: 'JEE Advanced',
  batch: 'JEE-2026-A', centre: 'Delhi Rohini', target_year: '2026',
  segment: 'Classroom', valid_until: '31 Mar 2026', blood_group: 'O+',
  dob: '12 May 2006', phone: '9876543210', photo_initial: 'R',
}

export default function StudentIdCardPage() {
  const { name, userId } = useAuthStore()
  const cardRef = useRef<HTMLDivElement>(null)
  const d = { ...DEMO_DATA, name: name || DEMO_DATA.name, student_id: userId || DEMO_DATA.student_id, photo_initial: (name||'R').charAt(0).toUpperCase() }
  const qrValue = `IMP:STUDENT:${d.student_id}:${d.batch}:${d.centre}`

  return (
    <DashboardShell title="Digital ID Card">
      <div className="p-4 md:p-6 max-w-sm mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">🪪 Digital ID Card</h1>
          <p className="text-sm text-gray-500 mt-0.5">Show at entrance and for exams</p>
        </div>
        {IS_DEMO && <Alert variant="info">Demo ID card — connect backend for your real QR identity.</Alert>}
        <div ref={cardRef}>
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 print:shadow-none">
            {/* Header */}
            <div className="px-6 py-5 text-white relative overflow-hidden" style={{background:'linear-gradient(135deg,#0f172a 0%,#1e3a8a 50%,#1d4ed8 100%)'}}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-blue-300 translate-y-6 -translate-x-6" />
              </div>
              <div className="relative">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm border border-white/30">I</div>
                  <div>
                    <p className="font-black text-sm leading-none">Institute Management Platform</p>
                    <p className="text-[9px] text-blue-200 tracking-widest uppercase font-medium">Student Identity Card</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-black border-2 border-white/40 shrink-0">
                    {d.photo_initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-lg leading-tight truncate">{d.name}</p>
                    <p className="text-blue-200 text-xs font-mono">{d.student_id}</p>
                    <p className="text-blue-300 text-xs mt-0.5">{d.course}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white dark:bg-gray-900 px-6 py-4">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-xs mb-4">
                {[
                  ['Batch',        d.batch],
                  ['Centre',       d.centre],
                  ['Target Year',  d.target_year],
                  ['Segment',      d.segment],
                  ['Date of Birth',d.dob],
                  ['Blood Group',  d.blood_group],
                  ['Valid Until',  d.valid_until],
                  ['Phone',        d.phone],
                ].map(([l,v])=>(
                  <div key={l}>
                    <p className="text-gray-400 text-[9px] uppercase tracking-wide font-medium">{l}</p>
                    <p className="font-bold text-gray-900 dark:text-white mt-0.5">{v}</p>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide mb-1">QR Identity</p>
                  <LiveQr value={qrValue} size={96} />
                  <p className="text-[8px] text-gray-400 mt-1 font-mono">{d.student_id}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div>
                    <p className="text-[9px] text-gray-400 mb-1">Institute Seal</p>
                    <div className="w-14 h-14 rounded-full border-2 border-blue-600 dark:border-blue-500 flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-black text-sm">IMP</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-1">
                    <p className="text-[9px] text-gray-400">Authorised Signature</p>
                    <div className="h-6 w-20 border-b border-gray-300 mt-1" />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-2 text-center border-t border-gray-100 dark:border-gray-700">
              <p className="text-[8px] text-gray-400">If found, please return to the institute · Not transferable · Valid for academic year only</p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Button className="w-full" onClick={() => window.print()}>🖨️ Print ID Card</Button>
          <Button variant="secondary" className="w-full" onClick={() => {
            const a = document.createElement('a')
            a.href = `data:text/plain,IMP Digital ID: ${d.name} | ${d.student_id} | ${d.course}`
            a.download = `${d.student_id}_id.txt`
            a.click()
          }}>📥 Save Details</Button>
        </div>
        <p className="text-xs text-gray-400 text-center">Scan the QR code to verify student identity</p>
      </div>
    </DashboardShell>
  )
}
