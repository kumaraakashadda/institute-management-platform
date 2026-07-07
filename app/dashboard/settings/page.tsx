'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Alert, Spinner } from '@/components/ui'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'
import Link from 'next/link'

interface Setting { Setting_Key: string; Setting_Value: string; Description: string; Updated_At: string; Updated_By: string }
interface FeatureFlag { Flag_Key: string; Enabled: string; Description: string; Updated_At: string }

type InputType = 'text'|'number'|'color'|'select'|'toggle'|'email'|'url'

interface SettingDef {
  key: string; label: string; description: string; type: InputType
  options?: string[]; group: string; groupIcon: string
}

const SETTING_DEFS: SettingDef[] = [
  // ── Institute Branding
  {key:'INSTITUTE_NAME',       label:'Institute Name',      description:'Shown in emails, receipts and certificates',  type:'text',  group:'Institute Branding', groupIcon:'🏫'},
  {key:'INSTITUTE_EMAIL',      label:'Reply-to Email',      description:'Email shown in notifications and receipts',    type:'email', group:'Institute Branding', groupIcon:'🏫'},
  {key:'INSTITUTE_PHONE',      label:'Phone Number',        description:'Contact number shown in receipts',             type:'text',  group:'Institute Branding', groupIcon:'🏫'},
  {key:'INSTITUTE_ADDRESS',    label:'Address',             description:'Shown on certificates and receipts',           type:'text',  group:'Institute Branding', groupIcon:'🏫'},
  {key:'BRAND_COLOUR',         label:'Brand Colour',        description:'Primary colour for emails and certificates',   type:'color', group:'Institute Branding', groupIcon:'🏫'},
  {key:'INSTITUTE_LOGO_URL',   label:'Logo URL',            description:'URL of the institute logo for PDFs',          type:'url',   group:'Institute Branding', groupIcon:'🏫'},

  // ── Attendance Rules
  {key:'ATTENDANCE_THRESHOLD_PERCENT',  label:'Attendance Threshold %',   description:'Below this % a student is flagged as defaulter',   type:'number',  group:'Attendance Rules', groupIcon:'📋'},
  {key:'QR_EXPIRY_SECONDS',            label:'QR Expiry (seconds)',       description:'How long a QR code stays valid',                   type:'number',  group:'Attendance Rules', groupIcon:'📋'},
  {key:'GPS_RADIUS_METERS',           label:'GPS Radius (metres)',       description:'Max distance allowed for GPS validation',          type:'number',  group:'Attendance Rules', groupIcon:'📋'},
  {key:'ATTENDANCE_LATE_THRESHOLD_MINUTES', label:'Late Threshold (minutes)', description:'Student marked Late if they scan after this many minutes', type:'number', group:'Attendance Rules', groupIcon:'📋'},
  {key:'MAX_DAILY_SESSIONS',          label:'Max Daily Sessions',        description:'Maximum sessions a teacher can start per day',     type:'number',  group:'Attendance Rules', groupIcon:'📋'},
  {key:'WORKING_DAYS',                label:'Working Days',              description:'Comma-separated e.g. Mon,Tue,Wed,Thu,Fri,Sat',    type:'text',    group:'Attendance Rules', groupIcon:'📋'},
  {key:'ALLOW_MULTIPLE_SESSIONS',     label:'Allow Multiple Sessions',   description:'Can same teacher start more than one session',     type:'select',  options:['TRUE','FALSE'], group:'Attendance Rules', groupIcon:'📋'},

  // ── Validation Options
  {key:'ENABLE_GPS_VALIDATION',        label:'Enable GPS Validation',     description:'Require student to be within GPS radius',          type:'select', options:['FALSE','TRUE'], group:'Validation Options', groupIcon:'🔐'},
  {key:'ENABLE_DEVICE_FINGERPRINT',    label:'Device Fingerprint Check',  description:'Require registered device for attendance',         type:'select', options:['FALSE','TRUE'], group:'Validation Options', groupIcon:'🔐'},
  {key:'ENABLE_SELFIE_CAPTURE',        label:'Selfie Capture',            description:'Require selfie photo on attendance',               type:'select', options:['FALSE','TRUE'], group:'Validation Options', groupIcon:'🔐'},
  {key:'ENABLE_WIFI_VALIDATION',       label:'Wi-Fi Validation',          description:'Require specific network SSID for attendance',     type:'select', options:['FALSE','TRUE'], group:'Validation Options', groupIcon:'🔐'},
  {key:'DUPLICATE_CHECK_ON_ADMISSION', label:'Duplicate Detection',       description:'Check for duplicate phone/email on new admission', type:'select', options:['TRUE','FALSE'], group:'Validation Options', groupIcon:'🔐'},

  // ── Fee Rules
  {key:'LATE_FEE_GRACE_DAYS',          label:'Grace Days Before Late Fee', description:'Days after due date before late fee is applied',  type:'number', group:'Fee Rules', groupIcon:'💰'},
  {key:'DUE_REMINDER_DAYS_BEFORE',     label:'Reminder Days Before Due',   description:'Days before due date to send reminder',           type:'number', group:'Fee Rules', groupIcon:'💰'},
  {key:'LATE_FEE_PERCENT',             label:'Late Fee %',                 description:'Percentage charged as late fee',                  type:'number', group:'Fee Rules', groupIcon:'💰'},
  {key:'RECEIPT_PREFIX',               label:'Receipt Prefix',             description:'Prefix for receipt numbers e.g. RCP',             type:'text',   group:'Fee Rules', groupIcon:'💰'},
  {key:'BULK_UPLOAD_MAX_ROWS',         label:'Bulk Upload Max Rows',       description:'Maximum rows allowed per bulk upload',             type:'number', group:'Fee Rules', groupIcon:'💰'},

  // ── Notifications
  {key:'AUTO_SEND_WELCOME_EMAIL',      label:'Welcome Email on Admission', description:'Auto-send welcome email when student is admitted', type:'select', options:['TRUE','FALSE'], group:'Notifications', groupIcon:'📧'},
  {key:'NOTIFICATION_EMAIL_FROM',      label:'From Email Address',         description:'Gmail address used to send notifications',        type:'email',  group:'Notifications', groupIcon:'📧'},
  {key:'WHATSAPP_API_URL',             label:'WhatsApp API URL',           description:'Endpoint URL for WhatsApp integration',           type:'url',    group:'Notifications', groupIcon:'📧'},
  {key:'WHATSAPP_API_KEY',             label:'WhatsApp API Key',           description:'API key for WhatsApp integration',                type:'text',   group:'Notifications', groupIcon:'📧'},
  {key:'SMS_API_URL',                  label:'SMS API URL',                description:'Endpoint URL for SMS integration',                type:'url',    group:'Notifications', groupIcon:'📧'},

  // ── ID & Certificates
  {key:'STUDENT_ID_PREFIX',            label:'Student ID Prefix',          description:'Prefix for auto-generated student IDs',           type:'text',   group:'IDs & Certificates', groupIcon:'🔖'},
  {key:'ADMISSION_ID_PREFIX',          label:'Admission ID Prefix',        description:'Prefix for auto-generated admission IDs',         type:'text',   group:'IDs & Certificates', groupIcon:'🔖'},
  {key:'CERTIFICATE_HEADER_TEXT',      label:'Certificate Header Text',    description:'Text shown on attendance certificates',           type:'text',   group:'IDs & Certificates', groupIcon:'🔖'},
]

const FLAG_DEFS: {key:string; label:string; description:string; icon:string}[] = [
  {key:'ATTENDANCE_MODULE',      label:'Attendance Module',       description:'Enable QR attendance system, sessions and reports', icon:'✅'},
  {key:'FEE_MODULE',             label:'Fee Management Module',   description:'Enable fee plans, installments and CRM pipeline',  icon:'💰'},
  {key:'PARENT_PORTAL',          label:'Parent Portal',           description:'Allow parents to log in and view child progress',  icon:'👨‍👩‍👧'},
  {key:'NOTIFICATIONS_EMAIL',    label:'Email Notifications',     description:'Send emails via Gmail for alerts and reminders',   icon:'📧'},
  {key:'NOTIFICATIONS_WHATSAPP', label:'WhatsApp Notifications',  description:'Queue WhatsApp messages (requires API key)',       icon:'💬'},
  {key:'NOTIFICATIONS_SMS',      label:'SMS Notifications',       description:'Queue SMS messages (requires API key)',            icon:'📱'},
]

// Demo defaults
const DEMO_SETTINGS: Setting[] = SETTING_DEFS.map(d => ({
  Setting_Key: d.key, Setting_Value: {
    INSTITUTE_NAME:'My Institute',INSTITUTE_EMAIL:'info@myinstitute.com',BRAND_COLOUR:'#2563eb',
    ATTENDANCE_THRESHOLD_PERCENT:'75',QR_EXPIRY_SECONDS:'90',GPS_RADIUS_METERS:'150',
    LATE_FEE_GRACE_DAYS:'3',DUE_REMINDER_DAYS_BEFORE:'3',RECEIPT_PREFIX:'RCP',
    STUDENT_ID_PREFIX:'STU',ADMISSION_ID_PREFIX:'ADM',WORKING_DAYS:'Mon,Tue,Wed,Thu,Fri,Sat',
    MAX_DAILY_SESSIONS:'3',ALLOW_MULTIPLE_SESSIONS:'TRUE',ATTENDANCE_LATE_THRESHOLD_MINUTES:'10',
    ENABLE_GPS_VALIDATION:'FALSE',ENABLE_DEVICE_FINGERPRINT:'FALSE',ENABLE_SELFIE_CAPTURE:'FALSE',
    ENABLE_WIFI_VALIDATION:'FALSE',DUPLICATE_CHECK_ON_ADMISSION:'TRUE',AUTO_SEND_WELCOME_EMAIL:'TRUE',
    BULK_UPLOAD_MAX_ROWS:'500',LATE_FEE_PERCENT:'0',CERTIFICATE_HEADER_TEXT:'This is to certify that',
  }[d.key] ?? '', Description: d.description, Updated_At: new Date().toISOString(), Updated_By: 'system'
}))

const DEMO_FLAGS: FeatureFlag[] = FLAG_DEFS.map(f => ({
  Flag_Key: f.key, Enabled: ['ATTENDANCE_MODULE','FEE_MODULE'].includes(f.key) ? 'TRUE' : 'FALSE',
  Description: f.description, Updated_At: new Date().toISOString()
}))

export default function SettingsPage() {
  const qc = useQueryClient()
  const [tab, setTab]         = useState<'settings'|'features'|'roles'>('settings')
  const [editKey, setEditKey] = useState<string|null>(null)
  const [editVal, setEditVal] = useState('')
  const [saved, setSaved]     = useState('')

  const { data: settingsRaw, isLoading: loadS } = useQuery({ queryKey:['settings'], queryFn:()=>gasGet<Setting[]>('listSettings',{}), enabled:!IS_DEMO, retry:false })
  const { data: flagsRaw,    isLoading: loadF } = useQuery({ queryKey:['flags'],    queryFn:()=>gasGet<FeatureFlag[]>('listFeatureFlags',{}), enabled:!IS_DEMO, retry:false })

  const settings    = settingsRaw ?? DEMO_SETTINGS
  const flags       = flagsRaw    ?? DEMO_FLAGS
  const settingsMap = Object.fromEntries(settings.map(s => [s.Setting_Key, s]))

  const { mutateAsync: updateSetting, isPending: savingS } = useMutation({
    mutationFn: ({key,value}:{key:string;value:string}) => gasPost('updateSetting',{key,value}),
    onSuccess: () => { qc.invalidateQueries({queryKey:['settings']}); setSaved('Setting saved!'); setEditKey(null); setTimeout(()=>setSaved(''),2500) }
  })
  const { mutateAsync: toggleFlag, isPending: savingF } = useMutation({
    mutationFn: ({key,enabled}:{key:string;enabled:boolean}) => gasPost('toggleFeatureFlag',{key,enabled}),
    onSuccess: () => { qc.invalidateQueries({queryKey:['flags']}); setSaved('Feature flag updated!'); setTimeout(()=>setSaved(''),2500) }
  })

  function startEdit(key: string) { setEditKey(key); setEditVal(settingsMap[key]?.Setting_Value ?? '') }

  // Group settings
  const groups = [...new Set(SETTING_DEFS.map(d => d.group))]

  return (
    <DashboardShell title="Settings">
      <div className="p-4 md:p-6 space-y-5 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-white">⚙️ Settings & Configuration</h1>
            <p className="text-sm text-gray-500 mt-0.5">Configure everything without touching code</p>
          </div>
          <Link href="/dashboard/settings/master-data">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
              🗄️ Master Data
            </button>
          </Link>
        </div>

        {IS_DEMO && <Alert variant="info">Demo mode — settings changes will not persist. Connect backend to save real configuration.</Alert>}
        {saved && <Alert variant="success">✅ {saved}</Alert>}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {([['settings','⚙️ All Settings'],['features','🚩 Feature Flags'],['roles','👥 Roles & Permissions']] as const).map(([k,l])=>(
            <button key={k} onClick={()=>setTab(k)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${tab===k?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500'}`}>{l}</button>
          ))}
        </div>

        {/* Settings tab — all 30 settings grouped */}
        {tab === 'settings' && (
          <div className="space-y-5">
            {loadS && <div className="flex justify-center py-8"><Spinner size="lg"/></div>}
            {groups.map(group => {
              const groupDefs = SETTING_DEFS.filter(d => d.group === group)
              const icon = groupDefs[0]?.groupIcon ?? '⚙️'
              return (
                <Card key={group}>
                  <CardHeader>
                    <h2 className="font-bold text-gray-800 dark:text-gray-200">{icon} {group}</h2>
                  </CardHeader>
                  <div className="divide-y dark:divide-gray-800">
                    {groupDefs.map(def => {
                      const s = settingsMap[def.key]
                      const isEditing = editKey === def.key
                      const currentVal = s?.Setting_Value ?? ''
                      return (
                        <div key={def.key} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{def.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{def.description}</p>
                            {s?.Updated_By && s.Updated_By !== 'system' && (
                              <p className="text-[10px] text-gray-400 mt-0.5">Updated by {s.Updated_By}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {isEditing ? (
                              <>
                                {def.type === 'select' && def.options ? (
                                  <select value={editVal} onChange={e=>setEditVal(e.target.value)}
                                    className="rounded-xl border px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500 w-32">
                                    {def.options.map(o => <option key={o}>{o}</option>)}
                                  </select>
                                ) : def.type === 'color' ? (
                                  <input type="color" value={editVal} onChange={e=>setEditVal(e.target.value)} className="w-12 h-9 rounded-lg border p-0.5 cursor-pointer"/>
                                ) : (
                                  <input type={def.type === 'number' ? 'number' : def.type === 'email' ? 'email' : def.type === 'url' ? 'url' : 'text'}
                                    value={editVal} onChange={e=>setEditVal(e.target.value)}
                                    className="rounded-xl border px-3 py-1.5 text-sm dark:bg-gray-800 dark:border-gray-700 outline-none focus:border-blue-500 w-44"/>
                                )}
                                <Button size="sm" disabled={savingS} onClick={()=>updateSetting({key:def.key,value:editVal})}>{savingS?'…':'Save'}</Button>
                                <Button size="sm" variant="secondary" onClick={()=>setEditKey(null)}>✕</Button>
                              </>
                            ) : (
                              <>
                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                  {def.type === 'color' && currentVal
                                    ? <span className="flex items-center gap-2"><span className="w-5 h-5 rounded border" style={{background:currentVal}}/>{currentVal}</span>
                                    : currentVal || <span className="text-gray-400 italic">Not set</span>}
                                </span>
                                <Button size="sm" variant="secondary" onClick={()=>startEdit(def.key)}>Edit</Button>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {/* Feature flags tab */}
        {tab === 'features' && (
          <Card>
            <CardHeader>
              <h2 className="font-bold text-gray-800 dark:text-gray-200">🚩 Feature Flags</h2>
              <p className="text-xs text-gray-400 mt-0.5">Toggle modules on/off without code changes. Changes take effect immediately.</p>
            </CardHeader>
            {loadF && <div className="flex justify-center py-8"><Spinner size="lg"/></div>}
            <div className="divide-y dark:divide-gray-800">
              {FLAG_DEFS.map(def => {
                const f     = flags.find(ff => ff.Flag_Key === def.key)
                const isOn  = f?.Enabled === 'TRUE' || f?.Enabled === 'true'
                return (
                  <div key={def.key} className="px-5 py-4 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{def.icon}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{def.label}</p>
                          <p className="text-xs text-gray-400">{def.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={isOn?'success':'default'}>{isOn?'On':'Off'}</Badge>
                      <button disabled={savingF} onClick={()=>toggleFlag({key:def.key,enabled:!isOn})}
                        className={`relative w-12 h-6 rounded-full transition-all duration-200 ${isOn?'bg-blue-600':'bg-gray-200 dark:bg-gray-700'}`}>
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${isOn?'translate-x-6':''}`}/>
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        {/* Roles tab */}
        {tab === 'roles' && (
          <Card>
            <CardHeader><h2 className="font-bold text-gray-800 dark:text-gray-200">👥 Roles & Permissions</h2></CardHeader>
            <CardBody>
              <div className="space-y-3">
                {[
                  {role:'Super Admin',      colour:'#7C3AED', perms:['All permissions','All centres','Settings & configuration','User management','Feature flags','Bulk upload','Reports export']},
                  {role:'Regional Manager', colour:'#0369A1', perms:['View assigned centres','View all reports','Centre comparison','Teacher rankings']},
                  {role:'Centre Manager',   colour:'#2563EB', perms:['Manage own centre','Start sessions','Fee management','Approve leaves','Corrections']},
                  {role:'Teacher',          colour:'#059669', perms:['Start attendance sessions','Monitor live','View own sessions','Corrections','Student search','Performance reports']},
                  {role:'Counsellor',       colour:'#D97706', perms:['Fee management','CRM pipeline','Assign fee plans','Student lookup','Follow-up log']},
                  {role:'Student',          colour:'#DC2626', perms:['View own attendance','Scan QR','View own fees','Submit leave requests','Download certificate']},
                  {role:'Parent',           colour:'#DB2777', perms:['View child attendance','View child fees','Submit leave requests','Receive notifications']},
                  {role:'Receptionist',     colour:'#6B7280', perms:['Visitor management','Basic student lookup','No financial access']},
                ].map(({role,colour,perms}) => (
                  <div key={role} className="p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{background:colour}}/>
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{role}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {perms.map(p => <span key={p} className="text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-lg border border-gray-100 dark:border-gray-700">{p}</span>)}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </DashboardShell>
  )
}
