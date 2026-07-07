'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Alert, Spinner } from '@/components/ui'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'

interface Setting { Setting_Key: string; Setting_Value: string; Description: string; Updated_At: string; Updated_By: string }
interface FeatureFlag { Flag_Key: string; Enabled: string; Description: string; Updated_At: string }
interface AuditEntry {
  audit_id: string; user_id: string; role: string; action: string; table: string;
  record_id: string; old_value: unknown; new_value: unknown; timestamp: string; ip: string
}
interface AuditPage { total: number; limit: number; offset: number; entries: AuditEntry[] }

// ── Grouped settings ──────────────────────────────────────────────────────────
const SETTING_GROUPS: Array<{ title:string; icon:string; keys:string[]; descriptions:Record<string,string>; types:Record<string,string> }> = [
  {
    title: 'Attendance Rules',
    icon: '📋',
    keys: ['ATTENDANCE_THRESHOLD_PERCENT','QR_EXPIRY_SECONDS','GPS_RADIUS_METERS'],
    descriptions: { ATTENDANCE_THRESHOLD_PERCENT:'Minimum attendance % before student is flagged as defaulter', QR_EXPIRY_SECONDS:'How long an attendance QR code stays valid (seconds)', GPS_RADIUS_METERS:'Allowed distance from classroom centre for GPS validation' } as Record<string,string>,
    types: { ATTENDANCE_THRESHOLD_PERCENT:'number', QR_EXPIRY_SECONDS:'number', GPS_RADIUS_METERS:'number' } as Record<string,string>,
  },
  {
    title: 'Student IDs & Prefixes',
    icon: '🔖',
    keys: ['STUDENT_ID_PREFIX','ADMISSION_ID_PREFIX'],
    descriptions: { STUDENT_ID_PREFIX:'Prefix for auto-generated Student IDs', ADMISSION_ID_PREFIX:'Prefix for auto-generated Admission IDs' },
    types: {} as Record<string,string>,
  },
  {
    title: 'Fee Rules',
    icon: '💰',
    keys: ['LATE_FEE_GRACE_DAYS','DUE_REMINDER_DAYS_BEFORE'],
    descriptions: { LATE_FEE_GRACE_DAYS:'Grace days after due date before late fee applies', DUE_REMINDER_DAYS_BEFORE:'Days before due date to send payment reminder' },
    types: { LATE_FEE_GRACE_DAYS:'number', DUE_REMINDER_DAYS_BEFORE:'number' } as Record<string,string>,
  },
  {
    title: 'Institute Branding',
    icon: '🏫',
    keys: ['INSTITUTE_NAME','INSTITUTE_EMAIL','BRAND_COLOUR'],
    descriptions: { INSTITUTE_NAME:'Institute name shown in emails and UI', INSTITUTE_EMAIL:'Reply-to email for notifications', BRAND_COLOUR:'Primary brand colour (hex) for emails' },
    types: { BRAND_COLOUR:'color' } as Record<string,string>,
  },
]

const FLAG_DESCRIPTIONS: Record<string, string> = {
  ATTENDANCE_MODULE:     'Enable QR attendance system, sessions, and reports',
  FEE_MODULE:           'Enable fee management, installments, and CRM pipeline',
  PARENT_PORTAL:        'Allow parents to log in and view child progress',
  NOTIFICATIONS_EMAIL:  'Send emails via Gmail for attendance and fee alerts',
  NOTIFICATIONS_WHATSAPP:'Queue WhatsApp messages (requires API integration)',
  NOTIFICATIONS_SMS:    'Queue SMS messages (requires API integration)',
  ENABLE_GPS_VALIDATION:'Require students and teachers to be within GPS_RADIUS_METERS of the classroom to mark/start attendance',
}

const DEMO_SETTINGS: Setting[] = [
  {Setting_Key:'ATTENDANCE_THRESHOLD_PERCENT',Setting_Value:'75',Description:'Min attendance %',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'QR_EXPIRY_SECONDS',Setting_Value:'90',Description:'QR expiry in seconds',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'GPS_RADIUS_METERS',Setting_Value:'150',Description:'GPS radius',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'STUDENT_ID_PREFIX',Setting_Value:'STU',Description:'Student ID prefix',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'ADMISSION_ID_PREFIX',Setting_Value:'ADM',Description:'Admission ID prefix',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'LATE_FEE_GRACE_DAYS',Setting_Value:'3',Description:'Grace days',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'DUE_REMINDER_DAYS_BEFORE',Setting_Value:'3',Description:'Reminder days',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'INSTITUTE_NAME',Setting_Value:'My Institute',Description:'Institute name',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'INSTITUTE_EMAIL',Setting_Value:'info@institute.com',Description:'Institute email',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'BRAND_COLOUR',Setting_Value:'#2563eb',Description:'Brand colour',Updated_At:new Date().toISOString(),Updated_By:'system'},
]

const DEMO_FLAGS: FeatureFlag[] = [
  {Flag_Key:'ATTENDANCE_MODULE',Enabled:'TRUE',Description:'Attendance module',Updated_At:new Date().toISOString()},
  {Flag_Key:'FEE_MODULE',Enabled:'TRUE',Description:'Fee module',Updated_At:new Date().toISOString()},
  {Flag_Key:'PARENT_PORTAL',Enabled:'FALSE',Description:'Parent portal',Updated_At:new Date().toISOString()},
  {Flag_Key:'NOTIFICATIONS_EMAIL',Enabled:'FALSE',Description:'Email notifications',Updated_At:new Date().toISOString()},
  {Flag_Key:'NOTIFICATIONS_WHATSAPP',Enabled:'FALSE',Description:'WhatsApp notifications',Updated_At:new Date().toISOString()},
  {Flag_Key:'NOTIFICATIONS_SMS',Enabled:'FALSE',Description:'SMS notifications',Updated_At:new Date().toISOString()},
]

export default function SettingsPage() {
  const qc = useQueryClient()
  const [activeTab, setTab] = useState<'settings'|'features'|'roles'|'audit'>('settings')
  const [editKey, setEditKey] = useState<string|null>(null)
  const [editVal, setEditVal] = useState('')
  const [saved, setSaved] = useState('')
  const [auditPage, setAuditPage] = useState(0)
  const [auditTableFilter, setAuditTableFilter] = useState('')

  const { data: settingsRaw, isLoading: loadS } = useQuery({
    queryKey:['settings'], queryFn:()=>gasGet<Setting[]>('listSettings',{}), enabled:!IS_DEMO, retry:false,
  })
  const { data: flagsRaw, isLoading: loadF } = useQuery({
    queryKey:['flags'], queryFn:()=>gasGet<FeatureFlag[]>('listFeatureFlags',{}), enabled:!IS_DEMO, retry:false,
  })
  const AUDIT_PAGE_SIZE = 25
  const { data: auditRaw, isLoading: loadA } = useQuery({
    queryKey: ['audit-log', auditPage, auditTableFilter],
    queryFn: () => gasGet<AuditPage>('getAuditLog', {
      filters: { limit: AUDIT_PAGE_SIZE, offset: auditPage * AUDIT_PAGE_SIZE, table: auditTableFilter || undefined },
    }),
    enabled: !IS_DEMO && activeTab === 'audit', retry: false,
  })

  const settings = settingsRaw ?? DEMO_SETTINGS
  const flags    = flagsRaw    ?? DEMO_FLAGS

  const settingsMap = Object.fromEntries(settings.map(s => [s.Setting_Key, s]))

  const { mutateAsync: updateSetting, isPending: savingS } = useMutation({
    mutationFn: ({key,value}:{key:string;value:string}) => gasPost('updateSetting',{key,value}),
    onSuccess: () => { qc.invalidateQueries({queryKey:['settings']}); setSaved('Setting saved!'); setEditKey(null); setTimeout(()=>setSaved(''),2000) },
  })

  const { mutateAsync: toggleFlag, isPending: savingF } = useMutation({
    mutationFn: ({key,enabled}:{key:string;enabled:boolean}) => gasPost('toggleFeatureFlag',{key,enabled}),
    onSuccess: () => { qc.invalidateQueries({queryKey:['flags']}); setSaved('Feature flag updated!'); setTimeout(()=>setSaved(''),2000) },
  })

  function startEdit(key: string) {
    setEditKey(key)
    setEditVal(settingsMap[key]?.Setting_Value ?? '')
  }

  return (
    <DashboardShell title="Settings">
      <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white">⚙️ Settings & Configuration</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure the platform without touching code</p>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — connect backend to save real settings. Changes will not persist in demo.</Alert>}
        {saved && <Alert variant="success">{saved}</Alert>}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {([['settings','⚙️ Settings'],['features','🚩 Feature Flags'],['roles','👥 Roles & Permissions'],['audit','🧾 Audit Log']] as const).map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${activeTab===k?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500'}`}>
              {l}
            </button>
          ))}
        </div>

        {/* Settings tab */}
        {activeTab === 'settings' && (
          <div className="space-y-4">
            {loadS && <div className="flex justify-center py-8"><Spinner size="lg"/></div>}
            {SETTING_GROUPS.map(group => (
              <Card key={group.title}>
                <CardHeader>
                  <h2 className="font-bold text-gray-800 dark:text-gray-200">{group.icon} {group.title}</h2>
                </CardHeader>
                <div className="divide-y dark:divide-gray-800">
                  {group.keys.map(key => {
                    const s = settingsMap[key]
                    const isEditing = editKey === key
                    const inputType = (group.types as Record<string, string>)[key] ?? 'text'
                    return (
                      <div key={key} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{key}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{(group.descriptions as Record<string, string>)[key] ?? ''}</p>
                          {s?.Updated_By && s.Updated_By !== 'system' && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Updated by {s.Updated_By} · {new Date(s.Updated_At).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isEditing ? (
                            <>
                              <input type={inputType==='color'?'color':'text'} value={editVal} onChange={e=>setEditVal(e.target.value)}
                                className={`rounded-lg border px-2 py-1.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 ${inputType==='color'?'w-16 h-9 p-1':'w-32'}`}/>
                              <Button size="sm" disabled={savingS} onClick={()=>updateSetting({key,value:editVal})}>{savingS?'…':'Save'}</Button>
                              <Button size="sm" variant="secondary" onClick={()=>setEditKey(null)}>✕</Button>
                            </>
                          ) : (
                            <>
                              <span className={`text-sm font-bold ${inputType==='color'?'':'text-gray-900 dark:text-white'}`}>
                                {inputType === 'color'
                                  ? <span className="flex items-center gap-2"><span className="w-6 h-6 rounded border" style={{background:s?.Setting_Value}}/>{s?.Setting_Value}</span>
                                  : (s?.Setting_Value ?? '—')}
                              </span>
                              <Button size="sm" variant="secondary" onClick={()=>startEdit(key)}>Edit</Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Feature flags tab */}
        {activeTab === 'features' && (
          <Card>
            <CardHeader>
              <h2 className="font-bold text-gray-800 dark:text-gray-200">🚩 Feature Flags</h2>
              <p className="text-xs text-gray-400 mt-0.5">Toggle modules on/off without code changes. Changes take effect immediately after saving.</p>
            </CardHeader>
            {loadF && <div className="flex justify-center py-8"><Spinner size="lg"/></div>}
            <div className="divide-y dark:divide-gray-800">
              {flags.map(f => {
                const isEnabled = f.Enabled === 'TRUE' || f.Enabled === true as unknown as string
                return (
                  <div key={f.Flag_Key} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{f.Flag_Key}</p>
                        <Badge variant={isEnabled?'success':'default'}>{isEnabled?'Enabled':'Disabled'}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{FLAG_DESCRIPTIONS[f.Flag_Key] || f.Description}</p>
                    </div>
                    <button
                      disabled={savingF}
                      onClick={()=>toggleFlag({key:f.Flag_Key,enabled:!isEnabled})}
                      className={`relative w-12 h-6 rounded-full transition-all duration-200 shrink-0 ${isEnabled?'bg-blue-600':'bg-gray-200 dark:bg-gray-700'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${isEnabled?'translate-x-6':''}`}/>
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Roles tab */}
        {activeTab === 'roles' && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">👥 Roles & Permissions</h2></CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  {role:'Super Admin',colour:'#7C3AED',perms:['All permissions','All centres','All settings','User management']},
                  {role:'Regional Manager',colour:'#0369A1',perms:['View all assigned centres','View reports','No write access to master data']},
                  {role:'Centre Manager',colour:'#2563EB',perms:['Manage own centre','Start sessions','Fee management','Approve leaves']},
                  {role:'Teacher',colour:'#059669',perms:['Start attendance sessions','View own sessions','Corrections','Reports']},
                  {role:'Counsellor',colour:'#D97706',perms:['Fee management','CRM pipeline','View students','Admission support']},
                  {role:'Student',colour:'#DC2626',perms:['View own attendance','Scan QR','View own fees','Submit leave requests']},
                  {role:'Parent',colour:'#DB2777',perms:['View child attendance','View child fees','Submit leave requests','Notifications']},
                  {role:'Receptionist',colour:'#6B7280',perms:['Visitor management','Basic student lookup','No financial access']},
                ].map(({role,colour,perms})=>(
                  <div key={role} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full" style={{background:colour}}/>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{role}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {perms.map(p=><span key={p} className="text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-700">{p}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Audit Log tab */}
        {activeTab === 'audit' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-bold text-gray-800 dark:text-gray-200">🧾 Audit Log</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Every create, update, and delete across the platform — who, what, and when.</p>
                </div>
                <input
                  value={auditTableFilter}
                  onChange={e => { setAuditTableFilter(e.target.value); setAuditPage(0) }}
                  placeholder="Filter by table (e.g. Fee_Installments)"
                  className="rounded-lg border px-3 py-1.5 text-xs outline-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-full sm:w-64"
                />
              </div>
            </CardHeader>
            {loadA && <div className="flex justify-center py-8"><Spinner size="lg"/></div>}
            {IS_DEMO && <div className="px-5 py-4"><Alert variant="info">Demo mode — connect a backend to view the real audit trail.</Alert></div>}
            {!IS_DEMO && !loadA && (auditRaw?.entries?.length ?? 0) === 0 && (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No matching audit entries.</div>
            )}
            <div className="divide-y dark:divide-gray-800">
              {auditRaw?.entries?.map(entry => (
                <div key={entry.audit_id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-start gap-2 text-xs">
                  <div className="sm:w-40 shrink-0 text-gray-400">{new Date(entry.timestamp).toLocaleString()}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={entry.action === 'DELETE' ? 'danger' : entry.action === 'CREATE' ? 'success' : 'info'}>{entry.action}</Badge>
                      <span className="font-semibold text-gray-900 dark:text-white">{entry.table}</span>
                      <span className="text-gray-400">#{entry.record_id}</span>
                    </div>
                    <p className="text-gray-500 mt-0.5">by <span className="font-medium text-gray-700 dark:text-gray-300">{entry.user_id}</span> ({entry.role})</p>
                  </div>
                </div>
              ))}
            </div>
            {!IS_DEMO && auditRaw && auditRaw.total > AUDIT_PAGE_SIZE && (
              <div className="px-5 py-3 flex items-center justify-between border-t dark:border-gray-800">
                <Button size="sm" variant="secondary" disabled={auditPage === 0} onClick={() => setAuditPage(p => Math.max(0, p - 1))}>← Newer</Button>
                <span className="text-xs text-gray-400">
                  {auditPage * AUDIT_PAGE_SIZE + 1}–{Math.min((auditPage + 1) * AUDIT_PAGE_SIZE, auditRaw.total)} of {auditRaw.total}
                </span>
                <Button size="sm" variant="secondary" disabled={(auditPage + 1) * AUDIT_PAGE_SIZE >= auditRaw.total} onClick={() => setAuditPage(p => p + 1)}>Older →</Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
