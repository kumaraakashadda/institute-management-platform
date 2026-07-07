'use client'
import { useQuery } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardBody, Badge, EmptyState, Spinner } from '@/components/ui'
import { gasGet, IS_DEMO } from '@/lib/gasClient'
import { fmtDate } from '@/lib/utils/helpers'

const DEMO_NOTIFS = [
  {Notification_ID:'N1',Type:'ATTENDANCE',Title:'Attendance Alert',Message:'Your attendance is 68% — below the 75% threshold.',Status:'Sent',Created_At:new Date().toISOString(),Channel:'EMAIL'},
  {Notification_ID:'N2',Type:'FEE',Title:'Fee Reminder',Message:'Installment #3 of ₹15,000 is due on Dec 15, 2025.',Status:'Sent',Created_At:new Date(Date.now()-86400000).toISOString(),Channel:'WHATSAPP'},
  {Notification_ID:'N3',Type:'FEE',Title:'Payment Confirmed',Message:'Your payment of ₹35,000 has been received. Receipt: RCP-000002.',Status:'Sent',Created_At:new Date(Date.now()-864000000).toISOString(),Channel:'EMAIL'},
]

const TYPE_V:{[k:string]:'danger'|'warning'|'success'|'info'} = {ATTENDANCE:'warning',FEE:'info',PAYMENT:'success',ANNOUNCEMENT:'default' as 'info'}
const TYPE_I:{[k:string]:string} = {ATTENDANCE:'⚠️',FEE:'💰',PAYMENT:'✅',ANNOUNCEMENT:'📢',default:'🔔'}

export default function NotificationsPage() {
  const {data,isLoading} = useQuery({
    queryKey:['myNotifications'], queryFn:()=>gasGet<typeof DEMO_NOTIFS>('listNotifications',{filters:{}}), retry:false, enabled:!IS_DEMO
  })
  const notifs = data??(IS_DEMO?DEMO_NOTIFS:[])

  return (
    <DashboardShell title="Notifications">
      <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-4">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">🔔 Notifications</h1>
        {IS_DEMO&&<div className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5">Demo notifications — showing sample alerts.</div>}
        {isLoading&&<div className="flex justify-center py-8"><Spinner/></div>}
        {!isLoading&&notifs.length===0&&<EmptyState icon="🔔" title="No notifications yet" message="You will receive attendance alerts, fee reminders and payment confirmations here."/>}
        <div className="space-y-3">
          {notifs.map(n=>(
            <Card key={n.Notification_ID}>
              <CardBody>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 bg-gray-50 dark:bg-gray-800">{TYPE_I[n.Type]||TYPE_I.default}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <p className="font-bold text-sm text-gray-900 dark:text-white">{n.Title}</p>
                      <Badge variant={TYPE_V[n.Type]||'info'}>{n.Type}</Badge>
                      <Badge variant="default" className="text-[9px]">{n.Channel}</Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{n.Message}</p>
                    <p className="text-xs text-gray-400 mt-1">{fmtDate(n.Created_At)}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </DashboardShell>
  )
}
