'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { Card, CardHeader, CardBody, Badge, Button, Input, Modal, Alert, Spinner, EmptyState } from '@/components/ui'
import { gasGet, gasPost, IS_DEMO } from '@/lib/gasClient'

type TableName = 'Centres'|'Courses'|'Batches'|'Subjects'|'Target_Years'|'Segments'

const TABLE_CONFIG: Record<TableName,{label:string;icon:string;fields:{key:string;label:string;required?:boolean}[]}> = {
  Centres:     {label:'Centres',     icon:'🏫', fields:[{key:'Centre_Name',label:'Centre Name',required:true},{key:'City',label:'City'},{key:'Address',label:'Address'},{key:'Phone',label:'Phone'},{key:'Manager',label:'Manager'},{key:'Latitude',label:'Latitude (for GPS attendance)'},{key:'Longitude',label:'Longitude (for GPS attendance)'}]},
  Courses:     {label:'Courses',     icon:'📚', fields:[{key:'Course_Name',label:'Course Name',required:true},{key:'Description',label:'Description'},{key:'Duration_Months',label:'Duration (months)'}]},
  Batches:     {label:'Batches',     icon:'👥', fields:[{key:'Batch_Name',label:'Batch Name',required:true},{key:'Centre',label:'Centre'},{key:'Course',label:'Course'},{key:'Capacity',label:'Capacity'},{key:'Start_Date',label:'Start Date'}]},
  Subjects:    {label:'Subjects',    icon:'📖', fields:[{key:'Subject_Name',label:'Subject Name',required:true},{key:'Course',label:'Course'},{key:'Code',label:'Code'}]},
  Target_Years:{label:'Target Years',icon:'🎯', fields:[{key:'Year',label:'Year',required:true},{key:'Description',label:'Description'}]},
  Segments:    {label:'Segments',    icon:'🏷️', fields:[{key:'Segment_Name',label:'Segment Name',required:true},{key:'Description',label:'Description'}]},
}

const DEMO_DATA: Record<TableName, Record<string,string>[]> = {
  Centres:     [{Centre_ID:'CTR001',Centre_Name:'Delhi Rohini',City:'Delhi',Status:'Active'},{Centre_ID:'CTR002',Centre_Name:'Delhi Dwarka',City:'Delhi',Status:'Active'}],
  Courses:     [{Course_ID:'CRS001',Course_Name:'JEE Advanced',Duration_Months:'24',Status:'Active'},{Course_ID:'CRS002',Course_Name:'NEET',Duration_Months:'12',Status:'Active'}],
  Batches:     [{Batch_ID:'BAT001',Batch_Name:'JEE-2026-A',Course:'JEE Advanced',Capacity:'45',Status:'Active'},{Batch_ID:'BAT002',Batch_Name:'NEET-2025-B',Course:'NEET',Capacity:'40',Status:'Active'}],
  Subjects:    [{Subject_ID:'SUB001',Subject_Name:'Physics',Course:'JEE Advanced',Status:'Active'},{Subject_ID:'SUB002',Subject_Name:'Chemistry',Course:'JEE Advanced',Status:'Active'},{Subject_ID:'SUB003',Subject_Name:'Maths',Course:'JEE Advanced',Status:'Active'},{Subject_ID:'SUB004',Subject_Name:'Biology',Course:'NEET',Status:'Active'}],
  Target_Years:[{Year_ID:'TY001',Year:'2026',Status:'Active'},{Year_ID:'TY002',Year:'2025',Status:'Active'}],
  Segments:    [{Segment_ID:'SEG001',Segment_Name:'Classroom',Status:'Active'},{Segment_ID:'SEG002',Segment_Name:'Online',Status:'Active'}],
}

const ID_KEYS: Record<TableName, string> = {Centres:'Centre_ID',Courses:'Course_ID',Batches:'Batch_ID',Subjects:'Subject_ID',Target_Years:'Year_ID',Segments:'Segment_ID'}

export default function MasterDataPage() {
  const qc = useQueryClient()
  const [activeTable,setTable] = useState<TableName>('Centres')
  const [showCreate,setShowCreate] = useState(false)
  const [editRow,setEditRow] = useState<Record<string,string>|null>(null)
  const [success,setSuccess] = useState('')

  const cfg = TABLE_CONFIG[activeTable]
  const idKey = ID_KEYS[activeTable]

  const {data,isLoading} = useQuery({
    queryKey:['masterData',activeTable],
    queryFn:()=>gasGet<Record<string,string>[]>('listMasterData',{table:activeTable}),
    retry:false, enabled:!IS_DEMO
  })
  const rows = data??(IS_DEMO?DEMO_DATA[activeTable]:[])

  const {mutateAsync:create,isPending:creating,error:createErr} = useMutation({
    mutationFn:(f:Record<string,string>)=>gasPost('createMasterData',{table:activeTable,fields:f}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['masterData',activeTable]});setShowCreate(false);setSuccess(`${cfg.label} created successfully!`);setTimeout(()=>setSuccess(''),3000)}
  })
  const {mutateAsync:update,isPending:updating} = useMutation({
    mutationFn:({id,fields}:{id:string;fields:Record<string,string>})=>gasPost('updateMasterData',{table:activeTable,id,fields}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['masterData',activeTable]});setEditRow(null);setSuccess('Updated!');setTimeout(()=>setSuccess(''),3000)}
  })
  const {mutateAsync:del} = useMutation({
    mutationFn:(id:string)=>gasPost('deleteMasterData',{table:activeTable,id}),
    onSuccess:()=>{qc.invalidateQueries({queryKey:['masterData',activeTable]})}
  })

  return (
    <DashboardShell title="Master Data">
      <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
        <div className="flex items-center justify-between">
          <div><h1 className="text-2xl font-black text-gray-900 dark:text-white">🗄️ Master Data</h1><p className="text-sm text-gray-500">Configure centres, courses, batches, subjects, segments</p></div>
          <Button onClick={()=>setShowCreate(true)}>+ Add {cfg.label.slice(0,-1)}</Button>
        </div>
        {IS_DEMO&&<Alert variant="info">Demo mode — showing sample data. Connect backend to manage real master data.</Alert>}
        {success&&<Alert variant="success">{success}</Alert>}

        {/* Table tabs */}
        <div className="flex gap-1 flex-wrap bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          {(Object.keys(TABLE_CONFIG) as TableName[]).map(t=>(
            <button key={t} onClick={()=>setTable(t)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${activeTable===t?'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm':'text-gray-500'}`}>
              <span>{TABLE_CONFIG[t].icon}</span><span>{TABLE_CONFIG[t].label}</span>
            </button>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 dark:text-gray-200">{cfg.icon} {cfg.label} <span className="text-gray-400 font-normal">({rows.length})</span></h2>
            </div>
          </CardHeader>
          {isLoading&&<CardBody><div className="flex justify-center py-8"><Spinner size="lg"/></div></CardBody>}
          {!isLoading&&rows.length===0&&<CardBody><EmptyState icon={cfg.icon} title={`No ${cfg.label} yet`} message={`Add your first ${cfg.label.slice(0,-1)} to get started.`}/></CardBody>}
          {!isLoading&&rows.length>0&&(
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase">
                  <tr>
                    {cfg.fields.slice(0,3).map(f=><th key={f.key} className="px-4 py-3 text-left font-bold text-gray-500">{f.label}</th>)}
                    <th className="px-4 py-3 text-left font-bold text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left font-bold text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-800">
                  {rows.filter(r=>r.Status!=='Deleted').map((row,i)=>(
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      {cfg.fields.slice(0,3).map(f=><td key={f.key} className="px-4 py-3 text-gray-700 dark:text-gray-300">{row[f.key]||'—'}</td>)}
                      <td className="px-4 py-3"><Badge variant={row.Status==='Active'?'success':'default'}>{row.Status||'Active'}</Badge></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={()=>setEditRow(row)} className="text-xs text-blue-600 hover:underline font-medium">Edit</button>
                          <button onClick={()=>{if(confirm('Delete this record?'))del(row[idKey])}} className="text-xs text-red-500 hover:underline font-medium">Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Create modal */}
        {showCreate&&<CrudModal title={`Add ${cfg.label.slice(0,-1)}`} fields={cfg.fields} onClose={()=>setShowCreate(false)} onSubmit={async f=>{await create(f)}} isPending={creating} error={createErr}/>}
        {/* Edit modal */}
        {editRow&&<CrudModal title={`Edit ${cfg.label.slice(0,-1)}`} fields={cfg.fields} initial={editRow} onClose={()=>setEditRow(null)} onSubmit={async f=>{await update({id:editRow[idKey],fields:f})}} isPending={updating}/>}
      </div>
    </DashboardShell>
  )
}

function CrudModal({title,fields,initial,onClose,onSubmit,isPending,error}:{title:string;fields:{key:string;label:string;required?:boolean}[];initial?:Record<string,string>;onClose:()=>void;onSubmit:(f:Record<string,string>)=>Promise<void>;isPending:boolean;error?:Error|null}) {
  const [form,setForm] = useState<Record<string,string>>(Object.fromEntries(fields.map(f=>[f.key,initial?.[f.key]||''])))
  const [err,setErr] = useState('')
  async function submit(e:React.FormEvent){
    e.preventDefault();setErr('')
    const missing=fields.filter(f=>f.required&&!form[f.key]?.trim())
    if(missing.length){setErr('Required: '+missing.map(f=>f.label).join(', '));return}
    try{await onSubmit(form)}catch(ex){setErr(ex instanceof Error?ex.message:'Error')}
  }
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        {fields.map(f=>(
          <div key={f.key}>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{f.label}{f.required&&' *'}</label>
            <input value={form[f.key]||''} onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
              className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
          </div>
        ))}
        {(err||(error instanceof Error&&error.message))&&<Alert variant="danger">{err||(error instanceof Error?error.message:'Error')}</Alert>}
        <Button type="submit" disabled={isPending} className="w-full">{isPending?'Saving…':'Save'}</Button>
      </form>
    </Modal>
  )
}
