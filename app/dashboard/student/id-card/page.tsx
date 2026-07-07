'use client'
import { useRef } from 'react'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Button } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'

export default function StudentIdCardPage() {
  const { name, userId } = useAuthStore()
  const cardRef = useRef<HTMLDivElement>(null)

  return (
    <DashboardShell title="Student ID Card">
      <div className="p-4 md:p-6 max-w-md mx-auto space-y-5">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">🪪 Digital ID Card</h1>
        <div ref={cardRef}>
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
            {/* Card header */}
            <div className="px-6 py-5 text-white" style={{background:'linear-gradient(135deg,#0f1b35,#1d4ed8)'}}>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center font-black text-sm">I</div>
                <div>
                  <p className="font-black text-sm leading-none">IMP</p>
                  <p className="text-[9px] text-blue-200 tracking-widest uppercase font-medium">Student Identity Card</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-3xl font-black border-2 border-white/30">
                  {(name||'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-lg leading-tight">{name||'Demo Student'}</p>
                  <p className="text-blue-200 text-xs font-mono">{userId||'STU000001'}</p>
                  <p className="text-blue-300 text-xs mt-0.5">JEE Advanced · JEE-2026-A</p>
                </div>
              </div>
            </div>
            {/* Card body */}
            <div className="bg-white dark:bg-gray-900 px-6 py-4">
              <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                {[['Centre','Delhi Rohini'],['Batch','JEE-2026-A'],['Target Year','2026'],['Segment','Classroom'],['Valid Until','31 Mar 2026'],['Blood Group','O+']].map(([l,v])=>(
                  <div key={l}><p className="text-gray-400 text-[10px] uppercase tracking-wide">{l}</p><p className="font-bold text-gray-900 dark:text-white">{v}</p></div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
                <div>
                  <p className="text-[10px] text-gray-400">QR Identity</p>
                  <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-lg mt-1 flex items-center justify-center text-2xl">📱</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 mb-1">Institute Seal</div>
                  <div className="w-12 h-12 rounded-full border-2 border-blue-600 flex items-center justify-center text-blue-600 font-black text-lg">IMP</div>
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-2 text-center">
              <p className="text-[9px] text-gray-400">If found, please return to the institute · Not transferable</p>
            </div>
          </div>
        </div>
        <Button variant="secondary" className="w-full" onClick={() => window.print()}>🖨️ Print ID Card</Button>
        <p className="text-xs text-gray-400 text-center">Show this ID card at the entrance and for exams</p>
      </div>
    </DashboardShell>
  )
}
