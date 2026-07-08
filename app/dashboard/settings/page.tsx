'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Alert, Spinner, Input } from '@/components/ui'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'
import { useSettingsStore } from '@/lib/settingsStore'

interface Setting    { Setting_Key: string; Setting_Value: string; Description: string; Updated_At: string; Updated_By: string }
interface FeatureFlag{ Flag_Key: string; Enabled: string; Description: string; Updated_At: string }
interface AuditEntry { audit_id: string; user_id: string; role: string; action: string; table: string; record_id: string; old_value: unknown; new_value: unknown; timestamp: string; ip: string }
interface AuditPage  { total: number; limit: number; offset: number; entries: AuditEntry[] }

// All settings groups with types
const SETTING_GROUPS = [
  {
    title: 'Institute Branding', icon: '🏫',
    keys: ['INSTITUTE_NAME','INSTITUTE_EMAIL','INSTITUTE_PHONE','INSTITUTE_WEBSITE','INSTITUTE_LOGO_URL','BRAND_COLOUR','ACADEMIC_YEAR'],
    descriptions: {
      INSTITUTE_NAME:    'Institute name shown across the platform, emails, and student ID cards',
      INSTITUTE_EMAIL:   'Reply-to email address for all outgoing notifications',
      INSTITUTE_PHONE:   'Contact phone number shown in communications',
      INSTITUTE_WEBSITE: 'Institute website URL',
      INSTITUTE_LOGO_URL:'URL to the institute logo (Google Drive share link or hosted URL)',
      BRAND_COLOUR:      'Primary brand colour (hex code) used in emails and student ID cards',
      ACADEMIC_YEAR:     'Current academic year label (e.g. 2025-26)',
    } as Record<string,string>,
    types: { BRAND_COLOUR:'color' } as Record<string,string>,
  },
  {
    title: 'Attendance Rules', icon: '📋',
    keys: ['ATTENDANCE_THRESHOLD_PERCENT','QR_EXPIRY_SECONDS','GPS_RADIUS_METERS','WORKING_DAYS'],
    descriptions: {
      ATTENDANCE_THRESHOLD_PERCENT: 'Minimum attendance % required before a student is flagged as a defaulter',
      QR_EXPIRY_SECONDS:            'How long (in seconds) an attendance QR code stays valid before auto-refresh',
      GPS_RADIUS_METERS:            'Maximum allowed distance (metres) from classroom for GPS attendance validation',
      WORKING_DAYS:                 'Comma-separated working days (e.g. Mon,Tue,Wed,Thu,Fri,Sat)',
    } as Record<string,string>,
    types: { ATTENDANCE_THRESHOLD_PERCENT:'number', QR_EXPIRY_SECONDS:'number', GPS_RADIUS_METERS:'number' } as Record<string,string>,
  },
  {
    title: 'Student & Admission IDs', icon: '🔖',
    keys: ['STUDENT_ID_PREFIX','ADMISSION_ID_PREFIX'],
    descriptions: {
      STUDENT_ID_PREFIX:   'Prefix for auto-generated Student IDs (e.g. STU → STU000001)',
      ADMISSION_ID_PREFIX: 'Prefix for auto-generated Admission IDs (e.g. ADM → ADM000001)',
    } as Record<string,string>,
    types: {} as Record<string,string>,
  },
  {
    title: 'Fee Rules', icon: '💰',
    keys: ['LATE_FEE_GRACE_DAYS','DUE_REMINDER_DAYS_BEFORE'],
    descriptions: {
      LATE_FEE_GRACE_DAYS:        'Grace days after due date before late fees apply',
      DUE_REMINDER_DAYS_BEFORE:   'How many days before due date to send fee reminder notifications',
    } as Record<string,string>,
    types: { LATE_FEE_GRACE_DAYS:'number', DUE_REMINDER_DAYS_BEFORE:'number' } as Record<string,string>,
  },
]

const FLAG_DESCRIPTIONS: Record<string,string> = {
  ATTENDANCE_MODULE:     'Enable QR attendance system, live sessions, corrections, and reports',
  FEE_MODULE:           'Enable fee management, installments, CRM pipeline, and collection reports',
  PARENT_PORTAL:        'Allow parents to log in and view their child\'s attendance, fees, and notifications',
  NOTIFICATIONS_EMAIL:  'Send automated emails via Gmail for attendance alerts and fee reminders',
  NOTIFICATIONS_WHATSAPP:'Queue WhatsApp messages for dues and attendance (requires Meta Business API)',
  NOTIFICATIONS_SMS:    'Queue SMS messages (requires SMS API integration)',
  ENABLE_GPS_VALIDATION:'Require students and teachers to be within GPS_RADIUS_METERS to mark/start attendance',
}

const DEMO_SETTINGS: Setting[] = [
  {Setting_Key:'INSTITUTE_NAME',    Setting_Value:'My Institute',     Description:'Institute name',    Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'INSTITUTE_EMAIL',   Setting_Value:'info@institute.com',Description:'Institute email',  Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'INSTITUTE_PHONE',   Setting_Value:'',                 Description:'Phone',             Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'INSTITUTE_WEBSITE', Setting_Value:'',                 Description:'Website',           Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'INSTITUTE_LOGO_URL',Setting_Value:'',                 Description:'Logo URL',          Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'BRAND_COLOUR',      Setting_Value:'#2563EB',          Description:'Brand colour',      Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'ACADEMIC_YEAR',     Setting_Value:'2025-26',          Description:'Academic year',     Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'ATTENDANCE_THRESHOLD_PERCENT',Setting_Value:'75',     Description:'Min attendance %',  Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'QR_EXPIRY_SECONDS', Setting_Value:'90',               Description:'QR expiry',         Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'GPS_RADIUS_METERS', Setting_Value:'150',              Description:'GPS radius',        Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'WORKING_DAYS',      Setting_Value:'Mon,Tue,Wed,Thu,Fri,Sat',Description:'Working days',Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'STUDENT_ID_PREFIX', Setting_Value:'STU',              Description:'Student ID prefix', Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'ADMISSION_ID_PREFIX',Setting_Value:'ADM',             Description:'Admission prefix',  Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'LATE_FEE_GRACE_DAYS',Setting_Value:'3',               Description:'Grace days',        Updated_At:new Date().toISOString(),Updated_By:'system'},
  {Setting_Key:'DUE_REMINDER_DAYS_BEFORE',Setting_Value:'3',          Description:'Reminder days',     Updated_At:new Date().toISOString(),Updated_By:'system'},
]

const DEMO_FLAGS: FeatureFlag[] = [
  {Flag_Key:'ATTENDANCE_MODULE',    Enabled:'TRUE', Description:'Attendance module',    Updated_At:new Date().toISOString()},
  {Flag_Key:'FEE_MODULE',           Enabled:'TRUE', Description:'Fee module',           Updated_At:new Date().toISOString()},
  {Flag_Key:'PARENT_PORTAL',        Enabled:'FALSE',Description:'Parent portal',        Updated_At:new Date().toISOString()},
  {Flag_Key:'NOTIFICATIONS_EMAIL',  Enabled:'FALSE',Description:'Email notifications',  Updated_At:new Date().toISOString()},
  {Flag_Key:'NOTIFICATIONS_WHATSAPP',Enabled:'FALSE',Description:'WhatsApp',            Updated_At:new Date().toISOString()},
  {Flag_Key:'NOTIFICATIONS_SMS',    Enabled:'FALSE',Description:'SMS notifications',    Updated_At:new Date().toISOString()},
  {Flag_Key:'ENABLE_GPS_VALIDATION',Enabled:'FALSE',Description:'GPS validation',       Updated_At:new Date().toISOString()},
]

export default function SettingsPage() {
  const qc = useQueryClient()
  const settingsStore = useSettingsStore()
  const [tab, setTab]           = useState<'settings'|'features'|'roles'|'audit'>('settings')
  const [editKey, setEditKey]   = useState<string|null>(null)
  const [editVal, setEditVal]   = useState('')
  const [toast, setToast]       = useState<{msg:string;type:'success'|'danger'}|null>(null)
  const [auditPage, setAuditPage] = useState(0)
  const [auditFilter, setAuditFilter] = useState('')

  function showToast(msg:string, type:'success'|'danger'='success') {
    setToast({msg,type}); setTimeout(()=>setToast(null), 3000)
  }

  const { data: settingsRaw, isLoading: loadS } = useQuery({
    queryKey:['settings'], queryFn:()=>gasGet<Setting[]>('listSettings',{}), retry:false,
    enabled:!IS_DEMO,
  })
  const { data: flagsRaw, isLoading: loadF } = useQuery({
    queryKey:['flags'], queryFn:()=>gasGet<FeatureFlag[]>('listFeatureFlags',{}), retry:false,
    enabled:!IS_DEMO,
  })
  const { data: auditRaw, isLoading: loadA } = useQuery({
    queryKey:['audit-log', auditPage, auditFilter],
    queryFn:()=>gasGet<AuditPage>('getAuditLog',{ filters:{ limit:25, offset:auditPage*25, table:auditFilter||undefined }}),
    enabled:!IS_DEMO && tab==='audit', retry:false,
  })

  // Merge live data with store (store acts as override layer for both demo AND live)
  const rawSettings = settingsRaw ?? DEMO_SETTINGS
  const settings: Setting[] = rawSettings.map(s => {
    const storeVal = settingsStore.values[s.Setting_Key]
    return storeVal !== undefined ? { ...s, Setting_Value: storeVal } : s
  })
  const flags = flagsRaw ?? DEMO_FLAGS
  const sMap  = Object.fromEntries(settings.map(s=>[s.Setting_Key, s]))

  // Apply brand colour from settings to CSS variable so it reflects live
  const brandColour = sMap['BRAND_COLOUR']?.Setting_Value || '#2563EB'
  useEffect(() => {
    document.documentElement.style.setProperty('--brand', brandColour)
  }, [brandColour])

  const { mutateAsync: saveSetting, isPending: saving } = useMutation({
    mutationFn: ({key,value}:{key:string;value:string}) => gasPost('updateSetting',{key,value}),
    onSuccess: (_,vars) => {
      qc.invalidateQueries({queryKey:['settings']})
      showToast(`✅ ${vars.key} saved successfully`)
      setEditKey(null)
    },
    onError: (e) => showToast('❌ ' + String(e).replace('Error:',''), 'danger'),
  })

  const { mutateAsync: toggleFlag, isPending: togglingFlag } = useMutation({
    mutationFn: ({key,enabled}:{key:string;enabled:boolean}) => gasPost('toggleFeatureFlag',{key,enabled}),
    onSuccess: (_,vars) => {
      qc.invalidateQueries({queryKey:['flags']})
      showToast(`✅ ${vars.key} ${vars.enabled?'enabled':'disabled'}`)
    },
    onError: (e) => showToast('❌ ' + String(e).replace('Error:',''), 'danger'),
  })

  function startEdit(key:string) { setEditKey(key); setEditVal(sMap[key]?.Setting_Value ?? '') }

  function handleSave(key:string) {
    // Always write to the store — this reflects changes immediately in the
    // header (brand colour, institute name) and persists across page nav.
    settingsStore.setValue(key, editVal)

    if (IS_DEMO) {
      showToast(`✅ ${key} saved — reflected in UI (demo mode, not persisted to backend)`)
      setEditKey(null)
    } else {
      saveSetting({ key, value: editVal })
    }
  }

  function handleToggle(key:string, currentlyEnabled:boolean) {
    if (IS_DEMO) {
      showToast('Demo mode — connect backend to toggle feature flags')
      return
    }
    toggleFlag({key, enabled:!currentlyEnabled})
  }

  const instituteName = sMap['INSTITUTE_NAME']?.Setting_Value || 'My Institute'

  return (
    <DashboardShell title="Settings">
      <div className="p-4 md:p-6 space-y-5 max-w-4xl mx-auto">

        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">⚙️ Settings & Configuration</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure the entire platform without touching any code</p>
          </div>
          {/* Live branding preview pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-100 dark:border-gray-800 text-xs font-semibold shrink-0"
            style={{ background: brandColour + '15', color: brandColour, borderColor: brandColour + '30' }}>
            <span className="w-2 h-2 rounded-full" style={{ background: brandColour }} />
            {instituteName}
          </div>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — settings save locally for this session but are not persisted to the backend. Connect a GAS backend to save permanently.</Alert>}
        {toast && <Alert variant={toast.type}>{toast.msg}</Alert>}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {(['settings','features','roles','audit'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all ${tab===t?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
              {t === 'settings' ? '⚙️ Settings' : t === 'features' ? '🚩 Feature Flags' : t === 'roles' ? '👥 Roles' : '🧾 Audit Log'}
            </button>
          ))}
        </div>

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <div className="space-y-4">
            {loadS && <div className="flex justify-center py-8"><Spinner size="lg" /></div>}
            {SETTING_GROUPS.map(group => (
              <Card key={group.title}>
                <CardHeader>
                  <h2 className="font-bold text-gray-800 dark:text-gray-200">{group.icon} {group.title}</h2>
                </CardHeader>
                <div className="divide-y dark:divide-gray-800">
                  {group.keys.map(key => {
                    const s = sMap[key]
                    const isEditing = editKey === key
                    const inputType = group.types[key] ?? 'text'
                    const currentVal = s?.Setting_Value ?? ''
                    return (
                      <div key={key} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white">{key}</p>
                          <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{group.descriptions[key]}</p>
                          {s?.Updated_By && s.Updated_By !== 'system' && (
                            <p className="text-[10px] text-gray-400 mt-0.5">Last updated by {s.Updated_By} · {new Date(s.Updated_At).toLocaleDateString('en-IN')}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {isEditing ? (
                            <>
                              {inputType === 'color' ? (
                                <div className="flex items-center gap-2">
                                  <input type="color" value={editVal} onChange={e=>setEditVal(e.target.value)}
                                    className="w-10 h-9 rounded-lg border border-gray-200 dark:border-gray-700 p-0.5 cursor-pointer" />
                                  <input type="text" value={editVal} onChange={e=>setEditVal(e.target.value)}
                                    className="w-24 rounded-lg border px-2 py-1.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-mono" />
                                </div>
                              ) : (
                                <input type={inputType} value={editVal} onChange={e=>setEditVal(e.target.value)}
                                  className="rounded-lg border px-3 py-1.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-52" />
                              )}
                              <Button size="sm" disabled={saving} onClick={() => handleSave(key)}>
                                {saving ? '…' : 'Save'}
                              </Button>
                              <Button size="sm" variant="secondary" onClick={() => setEditKey(null)}>✕</Button>
                            </>
                          ) : (
                            <>
                              <div className="text-sm font-semibold text-gray-900 dark:text-white max-w-[180px] text-right">
                                {inputType === 'color' ? (
                                  <span className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded border border-gray-200" style={{background:currentVal}} />
                                    <span className="font-mono text-xs">{currentVal}</span>
                                  </span>
                                ) : currentVal ? (
                                  <span className="truncate block">{currentVal}</span>
                                ) : (
                                  <span className="text-gray-300 dark:text-gray-600 italic">Not set</span>
                                )}
                              </div>
                              <Button size="sm" variant="secondary" onClick={() => startEdit(key)}>Edit</Button>
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}

            {/* Instructions for existing deployment */}
            <Card>
              <CardBody>
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">📌 First-time setup (existing deployment)</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 leading-relaxed">
                    If INSTITUTE_NAME / BRAND_COLOUR / INSTITUTE_EMAIL are not saving, open Apps Script → run <strong>seedDefaultSettings()</strong> once. This adds the missing rows to your Settings sheet. Then save from this page.
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        )}

        {/* ── FEATURE FLAGS TAB ── */}
        {tab === 'features' && (
          <Card>
            <CardHeader>
              <h2 className="font-bold text-gray-800 dark:text-gray-200">🚩 Feature Flags</h2>
              <p className="text-xs text-gray-400 mt-0.5">Toggle modules on/off instantly. Changes take effect for all users immediately.</p>
            </CardHeader>
            {loadF && <div className="flex justify-center py-8"><Spinner /></div>}
            <div className="divide-y dark:divide-gray-800">
              {flags.map(f => {
                const on = f.Enabled === 'TRUE' || String(f.Enabled).toLowerCase() === 'true'
                return (
                  <div key={f.Flag_Key} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{f.Flag_Key}</p>
                        <Badge variant={on?'success':'default'}>{on?'Enabled':'Disabled'}</Badge>
                      </div>
                      <p className="text-xs text-gray-400 mt-0.5">{FLAG_DESCRIPTIONS[f.Flag_Key] || f.Description}</p>
                    </div>
                    <button onClick={() => handleToggle(f.Flag_Key, on)} disabled={togglingFlag}
                      className={`relative w-12 h-6 rounded-full transition-all duration-200 shrink-0 focus:outline-none focus:ring-2 focus:ring-offset-1 ${on?'bg-blue-600 focus:ring-blue-500':'bg-gray-200 dark:bg-gray-700 focus:ring-gray-400'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${on?'translate-x-6':''}`} />
                    </button>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* ── ROLES TAB ── */}
        {tab === 'roles' && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">👥 Role Permissions Reference</h2></CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  {role:'Super Admin',     colour:'#7C3AED', perms:['All permissions','All centres','All settings','User management','Audit log access','Feature flag control']},
                  {role:'Regional Manager',colour:'#0369A1', perms:['View all assigned centres','View cross-centre reports','Centre comparison analytics','No write access to master data']},
                  {role:'Centre Manager',  colour:'#2563EB', perms:['Manage own centre','Start sessions','Fee management','Approve leaves','Announcements','Master data view']},
                  {role:'Teacher',         colour:'#059669', perms:['Start attendance sessions','View own sessions','Attendance corrections','Reports for own batches']},
                  {role:'Counsellor',      colour:'#D97706', perms:['Fee management','CRM pipeline','Student lookup','Admission support','Follow-up log']},
                  {role:'Student',         colour:'#DC2626', perms:['View own attendance','Scan QR to mark attendance','View own fees & receipts','Leave requests','Form vault']},
                  {role:'Parent',          colour:'#DB2777', perms:['View child attendance','View child fees','Download receipts','Leave requests','Notifications']},
                  {role:'Receptionist',    colour:'#6B7280', perms:['Visitor management','Basic student lookup','Announcement viewing','No financial access']},
                ].map(({role,colour,perms})=>(
                  <div key={role} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{background:colour}} />
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

        {/* ── AUDIT LOG TAB ── */}
        {tab === 'audit' && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h2 className="font-bold text-gray-800 dark:text-gray-200">🧾 Audit Log</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Every create, update, delete — who changed what and when.</p>
                </div>
                <input value={auditFilter} onChange={e=>{setAuditFilter(e.target.value);setAuditPage(0)}}
                  placeholder="Filter by table (e.g. Settings, Fee_Installments)"
                  className="rounded-lg border px-3 py-1.5 text-xs outline-none border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 w-full sm:w-72" />
              </div>
            </CardHeader>
            {IS_DEMO && <div className="px-5 py-4"><Alert variant="info">Demo mode — audit trail available only with a connected backend.</Alert></div>}
            {!IS_DEMO && loadA && <div className="flex justify-center py-8"><Spinner /></div>}
            {!IS_DEMO && !loadA && !auditRaw?.entries?.length && <div className="px-5 py-8 text-center text-sm text-gray-400">No matching audit entries.</div>}
            <div className="divide-y dark:divide-gray-800">
              {auditRaw?.entries?.map(e => (
                <div key={e.audit_id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-start gap-2 text-xs">
                  <div className="sm:w-36 shrink-0 text-gray-400 font-mono">{new Date(e.timestamp).toLocaleString('en-IN')}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={e.action==='DELETE'?'danger':e.action==='CREATE'?'success':'info'}>{e.action}</Badge>
                      <span className="font-semibold text-gray-900 dark:text-white">{e.table}</span>
                      <span className="text-gray-400 font-mono">#{e.record_id}</span>
                    </div>
                    <p className="text-gray-500 mt-0.5">by <span className="font-medium text-gray-700 dark:text-gray-300">{e.user_id}</span> ({e.role})</p>
                  </div>
                </div>
              ))}
            </div>
            {!IS_DEMO && auditRaw && auditRaw.total > 25 && (
              <div className="px-5 py-3 flex items-center justify-between border-t dark:border-gray-800">
                <Button size="sm" variant="secondary" disabled={auditPage===0} onClick={()=>setAuditPage(p=>p-1)}>← Newer</Button>
                <span className="text-xs text-gray-400">{auditPage*25+1}–{Math.min((auditPage+1)*25, auditRaw.total)} of {auditRaw.total}</span>
                <Button size="sm" variant="secondary" disabled={(auditPage+1)*25>=auditRaw.total} onClick={()=>setAuditPage(p=>p+1)}>Older →</Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
