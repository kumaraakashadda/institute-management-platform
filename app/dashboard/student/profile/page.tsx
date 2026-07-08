'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Input, Modal, Alert, Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/authStore'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'
import { fmtDate } from '@/lib/utils/helpers'

interface VaultEntry {
  Form_ID: string; Form_Name: string; Board_or_Body: string; Exam_Year: string
  User_ID: string; Password_Hint: string; Application_Number: string
  Admit_Card_URL: string; Result_URL: string; Status: string; Remarks: string; Created_At: string
}

const DEMO_VAULT: VaultEntry[] = [
  { Form_ID:'FV001', Form_Name:'JEE Main 2026', Board_or_Body:'NTA', Exam_Year:'2026', User_ID:'rahul2026@jee', Password_Hint:'School+DOB', Application_Number:'240112345', Admit_Card_URL:'', Result_URL:'', Status:'Applied', Remarks:'Session 1 - Jan', Created_At: new Date().toISOString() },
  { Form_ID:'FV002', Form_Name:'JEE Advanced 2026', Board_or_Body:'IIT', Exam_Year:'2026', User_ID:'240100045', Password_Hint:'Same as JEE Main', Application_Number:'JA24-00045', Admit_Card_URL:'', Result_URL:'', Status:'Pending', Remarks:'Requires JEE Main qualification', Created_At: new Date().toISOString() },
  { Form_ID:'FV003', Form_Name:'CBSE Class 12 Board', Board_or_Body:'CBSE', Exam_Year:'2026', User_ID:'24DXXXXXX', Password_Hint:'CBSE portal login', Application_Number:'24DXXXXXX', Admit_Card_URL:'https://drive.google.com/file/sample', Result_URL:'', Status:'Applied', Remarks:'', Created_At: new Date().toISOString() },
]

const VAULT_STATUSES = ['Applied','Pending','Admit Card Downloaded','Exam Appeared','Result Awaited','Qualified','Not Qualified']

const VAULT_COLOURS: Record<string,string> = {
  'Applied':'info','Pending':'warning','Admit Card Downloaded':'info',
  'Exam Appeared':'purple','Result Awaited':'warning','Qualified':'success','Not Qualified':'danger'
} as Record<string,string>

export default function StudentProfilePage() {
  const { name, userId, role } = useAuthStore()
  const qc = useQueryClient()
  const [tab, setTab] = useState<'profile'|'vault'|'password'>('profile')
  const [showAddVault, setShowAddVault] = useState(false)
  const [showViewVault, setShowViewVault] = useState<VaultEntry|null>(null)
  const [vaultForm, setVaultForm] = useState({
    Form_Name:'', Board_or_Body:'', Exam_Year: new Date().getFullYear().toString(),
    User_ID:'', Password_Hint:'', Application_Number:'', Remarks:'', Status:'Applied'
  })
  const setV = (k:string) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) => setVaultForm(f=>({...f,[k]:e.target.value}))

  const { data: vaultData, isLoading: vaultLoading } = useQuery({
    queryKey: ['my-vault'],
    queryFn: () => gasGet<VaultEntry[]>('listFormVault', { student_id: userId }),
    enabled: !IS_DEMO,
  })
  const vault = vaultData ?? (IS_DEMO ? DEMO_VAULT : [])

  const { mutateAsync: addEntry, isPending: adding } = useMutation({
    mutationFn: () => IS_DEMO ? Promise.resolve() : gasPost('addFormVaultEntry', { student_id: userId, fields: vaultForm }),
    onSuccess: () => { qc.invalidateQueries({ queryKey:['my-vault'] }); setShowAddVault(false); setVaultForm({ Form_Name:'', Board_or_Body:'', Exam_Year: new Date().getFullYear().toString(), User_ID:'', Password_Hint:'', Application_Number:'', Remarks:'', Status:'Applied' }) },
  })

  return (
    <DashboardShell title="My Profile">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">👤 My Profile</h1>
        </div>
        {IS_DEMO && <Alert variant="info">Demo mode — your data is shown from demo account. Connect backend for real profile.</Alert>}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {(['profile','vault','password'] as const).map(t=>(
            <button key={t} onClick={()=>setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-all ${tab===t?'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-sm':'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t==='profile'?'👤 Profile':t==='vault'?'🗃 Form Vault':'🔑 Password'}
            </button>
          ))}
        </div>

        {/* PROFILE TAB */}
        {tab === 'profile' && (
          <Card>
            <CardBody>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black text-white shrink-0" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
                  {(name||'S').charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 dark:text-white">{name||'Demo Student'}</h2>
                  <p className="text-sm text-gray-500 font-mono">{userId||'STU000001'}</p>
                  <Badge variant="info" className="mt-1">{role?.replace(/_/g,' ')}</Badge>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  ['Full Name',name||'Demo Student'],['Student ID',userId||'STU000001'],
                  ['Course','JEE Advanced'],['Batch','JEE-2026-A'],
                  ['Centre','Delhi Rohini'],['Target Year','2026'],
                  ['Segment','Classroom'],['Phone','9876543210'],
                  ['Email','student@demo.com'],['Admission Date','01 Sep 2024'],
                  ['Blood Group','O+'],['Date of Birth','12 May 2006'],
                ].map(([l,v])=>(
                  <div key={l} className="space-y-0.5">
                    <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">{l}</p>
                    <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{v}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* FORM VAULT TAB */}
        {tab === 'vault' && (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">🗃 Form Vault</h2>
                <p className="text-xs text-gray-500 mt-0.5">Securely track all exam forms, credentials, admit cards, and results in one place.</p>
              </div>
              <Button size="sm" onClick={()=>setShowAddVault(true)}>+ Add Form</Button>
            </div>

            {vaultLoading && <div className="flex justify-center py-8"><Spinner /></div>}

            {vault.length === 0 && !vaultLoading && (
              <div className="text-center py-12">
                <div className="text-5xl mb-3">🗃</div>
                <h3 className="font-bold text-gray-700 dark:text-gray-300">No forms yet</h3>
                <p className="text-sm text-gray-400 mt-1 mb-4">Start tracking your exam applications here.</p>
                <Button onClick={()=>setShowAddVault(true)}>+ Add Your First Form</Button>
              </div>
            )}

            <div className="space-y-3">
              {vault.map(entry => (
                <Card key={entry.Form_ID}>
                  <CardBody>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white">{entry.Form_Name}</h3>
                          <Badge variant={(VAULT_COLOURS[entry.Status]||'default') as 'info'|'success'|'warning'|'danger'|'default'}>{entry.Status}</Badge>
                        </div>
                        <p className="text-xs text-gray-500">{entry.Board_or_Body} · {entry.Exam_Year}</p>
                        {entry.Application_Number && <p className="text-xs text-gray-400 mt-0.5">App No: <span className="font-mono">{entry.Application_Number}</span></p>}
                        <div className="flex gap-3 mt-2">
                          {entry.Admit_Card_URL && <a href={entry.Admit_Card_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline font-medium">📄 Admit Card</a>}
                          {entry.Result_URL && <a href={entry.Result_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-emerald-600 hover:underline font-medium">🏆 Result</a>}
                        </div>
                        {entry.Remarks && <p className="text-[11px] text-gray-400 mt-1 italic">{entry.Remarks}</p>}
                      </div>
                      <Button size="sm" variant="ghost" onClick={()=>setShowViewVault(entry)}>🔑 Credentials</Button>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">🔒 Security note</p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">Store only password hints (not actual passwords). For admit cards and results, paste Google Drive share links.</p>
            </div>
          </div>
        )}

        {/* PASSWORD TAB */}
        {tab === 'password' && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">🔑 Change Password</h2></CardHeader>
            <CardBody>
              <div className="space-y-4 max-w-sm">
                {['Current Password','New Password','Confirm New Password'].map(label=>(
                  <div key={label}>
                    <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{label}</label>
                    <input type="password" placeholder="••••••••"
                      className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                  </div>
                ))}
                {IS_DEMO && <Alert variant="info">Demo mode — password changes require a connected backend.</Alert>}
                <Button className="w-full">Update Password</Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ADD VAULT MODAL */}
        {showAddVault && (
          <Modal title="🗃 Add Form to Vault" onClose={()=>setShowAddVault(false)}>
            <div className="space-y-3">
              <Input label="Exam / Form Name *" value={vaultForm.Form_Name} onChange={setV('Form_Name')} placeholder="e.g. JEE Main 2026 Session 1" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Board / Conducting Body" value={vaultForm.Board_or_Body} onChange={setV('Board_or_Body')} placeholder="NTA, CBSE, IIT..." />
                <Input label="Exam Year" value={vaultForm.Exam_Year} onChange={setV('Exam_Year')} placeholder="2026" />
              </div>
              <Input label="Your User ID / Registration No." value={vaultForm.User_ID} onChange={setV('User_ID')} placeholder="Login ID for this form's portal" />
              <Input label="Password Hint (not actual password)" value={vaultForm.Password_Hint} onChange={setV('Password_Hint')} placeholder="e.g. School name + DOB" />
              <Input label="Application Number" value={vaultForm.Application_Number} onChange={setV('Application_Number')} placeholder="Application / Roll number" />
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
                <select value={vaultForm.Status} onChange={setV('Status')}
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20">
                  {VAULT_STATUSES.map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
                <textarea value={vaultForm.Remarks} onChange={setV('Remarks')} rows={2} placeholder="Any notes about this form..."
                  className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 resize-none" />
              </div>
              {IS_DEMO && <Alert variant="info">Demo — entry won&apos;t be saved to backend.</Alert>}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={()=>addEntry()} disabled={adding||!vaultForm.Form_Name}>
                  {adding ? 'Saving…' : '+ Add to Vault'}
                </Button>
                <Button variant="secondary" onClick={()=>setShowAddVault(false)}>Cancel</Button>
              </div>
            </div>
          </Modal>
        )}

        {/* VIEW CREDENTIALS MODAL */}
        {showViewVault && (
          <Modal title={`🔑 ${showViewVault.Form_Name}`} onClose={()=>setShowViewVault(null)}>
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                🔒 Keep these credentials private. Never share your login details.
              </div>
              {[
                ['Form Name',showViewVault.Form_Name],
                ['Board / Body',showViewVault.Board_or_Body],
                ['Exam Year',showViewVault.Exam_Year],
                ['Your User ID',showViewVault.User_ID||'—'],
                ['Password Hint',showViewVault.Password_Hint||'—'],
                ['Application No.',showViewVault.Application_Number||'—'],
                ['Status',showViewVault.Status],
                ['Added on',fmtDate(showViewVault.Created_At)],
              ].map(([l,v])=>(
                <div key={l} className="flex gap-3 text-sm border-b border-gray-50 dark:border-gray-800 pb-2 last:border-0">
                  <span className="text-gray-400 text-xs w-32 shrink-0 mt-0.5">{l}</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100 font-mono text-xs break-all">{v}</span>
                </div>
              ))}
              {(showViewVault.Admit_Card_URL || showViewVault.Result_URL) && (
                <div className="pt-2 flex gap-3">
                  {showViewVault.Admit_Card_URL && <a href={showViewVault.Admit_Card_URL} target="_blank" rel="noopener noreferrer"><Button size="sm">📄 Open Admit Card</Button></a>}
                  {showViewVault.Result_URL     && <a href={showViewVault.Result_URL} target="_blank" rel="noopener noreferrer"><Button size="sm" variant="secondary">🏆 Open Result</Button></a>}
                </div>
              )}
              {showViewVault.Remarks && <p className="text-xs text-gray-400 italic">Note: {showViewVault.Remarks}</p>}
            </div>
          </Modal>
        )}
      </div>
    </DashboardShell>
  )
}
