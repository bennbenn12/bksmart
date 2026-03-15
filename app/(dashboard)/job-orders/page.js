'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Pagination } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { JO_STATUS_COLORS, formatDateTime, fmtStatus, cn } from '@/lib/utils'
import { ClipboardList, Plus, Search, Eye, ShieldCheck, CheckCircle, XCircle, Loader2, RefreshCw } from 'lucide-react'

// Matches real DB enum: Draft → Pending_Audit → Approved → Completed / Rejected
const JO_STATUSES = ['Draft','Pending_Audit','Approved','Completed','Rejected']

export default function JobOrdersPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [jos, setJos]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStat] = useState('')
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [showCreate, setCreate] = useState(false)
  const [viewJO, setViewJO]     = useState(null)
  const [acting, setActing]     = useState(false)
  const PAGE = 10
  const supabase = createClient()
  const isStaff   = ['bookstore_manager','bookstore_staff'].includes(profile?.role_id)
  const isTeacher = profile?.role_id === 'teacher'

  const fetchJOs = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    let q = supabase.from('job_orders')
      .select('*, requester:requester_id(first_name,last_name,department,employee_id)', { count:'exact' })
      .order('created_at', { ascending:false })
      .range((page-1)*PAGE, page*PAGE-1)
    if (!isStaff) q = q.eq('requester_id', profile.user_id)
    if (statusFilter) q = q.eq('status', statusFilter)
    if (search) q = q.ilike('job_number', `%${search}%`)
    const { data, count } = await q
    setJos(data||[]); setTotal(count||0); setLoading(false)
  }, [profile, isStaff, statusFilter, search, page])

  useRealtime({ tables:['job_orders'], onRefresh:fetchJOs, enabled:!!profile })
  useEffect(() => { fetchJOs() }, [profile, statusFilter, search, page])

  async function updateStatus(id, status) {
    setActing(true)
    try {
      const updates = { status }
      // Stamp the right audit fields based on transition
      if (status === 'Pending_Audit') {
        // Teacher submits → no extra fields needed
      }
      if (status === 'Approved') {
        updates.audited_by  = profile.user_id
        updates.audited_at  = new Date().toISOString()
        updates.approved_by = profile.user_id
        updates.approved_at = new Date().toISOString()
      }
      if (status === 'Rejected') {
        updates.audited_by = profile.user_id
        updates.audited_at = new Date().toISOString()
      }
      if (status === 'Completed') {
        updates.completed_at = new Date().toISOString()
      }
      await supabase.from('job_orders').update(updates).eq('job_id', id)
      toast(`Job Order ${fmtStatus(status)}.`, 'success')
      if (viewJO?.job_id === id) setViewJO(j => ({ ...j, status, ...updates }))
    } catch(e) { toast(e.message, 'error') } finally { setActing(false) }
  }

  const badge = (s) => (
    <span className={cn('badge', JO_STATUS_COLORS[s] || 'bg-slate-100 text-slate-600')}>
      {fmtStatus(s)}
    </span>
  )

  return (
    <div className="page-enter">
      <Header title="Job Orders"/>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot"/> Live — updates automatically
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="input pl-9" placeholder="Search job #..." value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}/>
          </div>
          <select className="input w-40" value={statusFilter}
            onChange={e => { setStat(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            {JO_STATUSES.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
          </select>
          <button onClick={fetchJOs} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
          {(isTeacher || isStaff) && (
            <button onClick={() => setCreate(true)} className="btn-primary ml-auto">
              <Plus size={14}/> New Job Order
            </button>
          )}
        </div>

        {/* Status pills */}
        <div className="flex gap-2 flex-wrap">
          {['', ...JO_STATUSES].map(s => (
            <button key={s} onClick={() => { setStat(s); setPage(1) }}
              className={cn('px-3 py-1 rounded-full text-xs font-bold border transition-all',
                statusFilter === s
                  ? 'bg-brand-600 text-white border-brand-600'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-brand-300')}>
              {s ? fmtStatus(s) : 'All'}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="th">Job #</th>
                  {isStaff && <th className="th">Requested By</th>}
                  <th className="th">Department</th>
                  <th className="th">Description</th>
                  <th className="th">Status</th>
                  <th className="th">Date</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? <tr><td colSpan={7} className="py-12"><LoadingSpinner/></td></tr>
                  : jos.length === 0
                    ? <tr><td colSpan={7}><EmptyState icon={ClipboardList} title="No job orders found"/></td></tr>
                    : jos.map(jo => (
                  <tr key={jo.job_id} className="hover:bg-slate-50 transition-colors">
                    <td className="td font-mono text-xs text-brand-700 font-bold">
                      {jo.job_number || jo.job_id.slice(0,8)}
                    </td>
                    {isStaff && (
                      <td className="td">
                        <div className="font-medium text-slate-700">
                          {jo.requester?.first_name} {jo.requester?.last_name}
                        </div>
                        <div className="text-xs text-slate-400">{jo.requester?.department}</div>
                      </td>
                    )}
                    <td className="td">
                      <span className="badge bg-slate-100 text-slate-600 text-xs">
                        {jo.department_account || '—'}
                      </span>
                    </td>
                    <td className="td text-slate-500 max-w-[200px] truncate">{jo.description}</td>
                    <td className="td">{badge(jo.status)}</td>
                    <td className="td text-xs text-slate-400">{formatDateTime(jo.created_at)}</td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setViewJO(jo)} className="btn-ghost p-1.5">
                          <Eye size={13}/>
                        </button>
                        {/* Teacher: submit draft */}
                        {jo.status === 'Draft' && !isStaff && (
                          <button disabled={acting} onClick={() => updateStatus(jo.job_id,'Pending_Audit')}
                            className="btn-primary py-1 px-2 text-xs gap-1">
                            Submit
                          </button>
                        )}
                        {/* Staff: approve / reject pending */}
                        {isStaff && jo.status === 'Pending_Audit' && (
                          <>
                            <button disabled={acting} onClick={() => updateStatus(jo.job_id,'Approved')}
                              className="btn-primary py-1 px-2 text-xs gap-1">
                              <ShieldCheck size={11}/> Approve
                            </button>
                            <button disabled={acting} onClick={() => updateStatus(jo.job_id,'Rejected')}
                              className="btn-danger py-1 px-2 text-xs gap-1">
                              <XCircle size={11}/> Reject
                            </button>
                          </>
                        )}
                        {/* Staff: complete approved */}
                        {isStaff && jo.status === 'Approved' && (
                          <button disabled={acting} onClick={() => updateStatus(jo.job_id,'Completed')}
                            className="btn-primary py-1 px-2 text-xs bg-green-600 hover:bg-green-700 gap-1">
                            <CheckCircle size={11}/> Complete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={PAGE} onPageChange={setPage}/>
        </div>
      </div>

      {/* View modal */}
      {viewJO && (
        <Modal open={!!viewJO} onClose={() => setViewJO(null)}
          title={`Job Order — ${viewJO.job_number || viewJO.job_id.slice(0,8)}`} size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {badge(viewJO.status)}
              <span className="text-xs text-slate-400">{formatDateTime(viewJO.created_at)}</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><p className="label">Department Account</p>
                <p className="font-semibold text-slate-700">{viewJO.department_account || '—'}</p></div>
              <div><p className="label">Requested By</p>
                <p className="font-semibold text-slate-700">
                  {viewJO.requester?.first_name} {viewJO.requester?.last_name}
                </p>
                <p className="text-xs text-slate-400">{viewJO.requester?.department}</p>
              </div>
              <div className="col-span-2"><p className="label">Description</p>
                <p className="text-slate-600 bg-slate-50 p-3 rounded-xl leading-relaxed">
                  {viewJO.description}
                </p>
              </div>
              {viewJO.approved_at && (
                <div><p className="label">Approved At</p>
                  <p className="font-semibold text-slate-700">{formatDateTime(viewJO.approved_at)}</p></div>
              )}
              {viewJO.completed_at && (
                <div><p className="label">Completed At</p>
                  <p className="font-semibold text-slate-700">{formatDateTime(viewJO.completed_at)}</p></div>
              )}
              {viewJO.audit_notes && (
                <div className="col-span-2"><p className="label">Audit Notes</p>
                  <p className="text-slate-600 bg-yellow-50 p-3 rounded-xl">{viewJO.audit_notes}</p></div>
              )}
            </div>
            {isStaff && (
              <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
                {viewJO.status === 'Pending_Audit' && (
                  <>
                    <button disabled={acting} onClick={() => updateStatus(viewJO.job_id,'Approved')}
                      className="btn-primary gap-1"><ShieldCheck size={14}/> Approve</button>
                    <button disabled={acting} onClick={() => updateStatus(viewJO.job_id,'Rejected')}
                      className="btn-danger gap-1"><XCircle size={14}/> Reject</button>
                  </>
                )}
                {viewJO.status === 'Approved' && (
                  <button disabled={acting} onClick={() => updateStatus(viewJO.job_id,'Completed')}
                    className="btn-primary bg-green-600 hover:bg-green-700 gap-1">
                    <CheckCircle size={14}/> Mark Completed
                  </button>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {showCreate && (
        <CreateJOModal
          onClose={() => setCreate(false)}
          onCreated={() => { setCreate(false); fetchJOs(); toast('Job Order submitted!','success') }}
        />
      )}
    </div>
  )
}

function CreateJOModal({ onClose, onCreated }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [form, setForm]   = useState({ department_account:'', description:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  async function submit(e) {
    e.preventDefault()
    if (!form.department_account.trim()) { toast('Department account is required.','warning'); return }
    if (!form.description.trim()) { toast('Description is required.','warning'); return }
    setSaving(true)
    try {
      const { error } = await supabase.from('job_orders').insert({
        requester_id: profile.user_id,
        department_account: form.department_account,
        description: form.description,
        notes: form.notes || null,
        status: 'Draft',
        // job_number intentionally omitted — generated by DB trigger
      })
      if (error) throw error
      onCreated()
    } catch(e) { toast(e.message,'error') } finally { setSaving(false) }
  }

  const DEPTS = [
    'Accounting','Registrar','CICT','Engineering','Business',
    'Education','Nursing','LibArts','Graduate School','Administration'
  ]

  return (
    <Modal open={true} onClose={onClose} title="Submit Job Order" size="md">
      <form onSubmit={submit} className="space-y-4">
        <Alert type="info" message="Job Orders are saved as Draft first. Submit for review when ready."/>
        <div>
          <label className="label">Department Account <span className="text-red-500">*</span></label>
          <input className="input" list="depts" value={form.department_account}
            onChange={e => setForm(f=>({...f,department_account:e.target.value}))}
            placeholder="e.g. CICT, Accounting..."/>
          <datalist id="depts">{DEPTS.map(d => <option key={d} value={d}/>)}</datalist>
        </div>
        <div>
          <label className="label">Description / Purpose <span className="text-red-500">*</span></label>
          <textarea className="input resize-none" rows={4} value={form.description}
            onChange={e => setForm(f=>({...f,description:e.target.value}))}
            placeholder="Describe what you need from the bookstore/print shop..."/>
        </div>
        <div>
          <label className="label">Additional Notes</label>
          <input className="input" value={form.notes}
            onChange={e => setForm(f=>({...f,notes:e.target.value}))}
            placeholder="Any special instructions..."/>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <><ClipboardList size={14}/> Save as Draft</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}