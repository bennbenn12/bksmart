'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Pagination } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { JO_STATUS_COLORS, formatDateTime, fmtStatus, cn, formatCurrency } from '@/lib/utils'
import { sendEmailClient, EmailTemplates } from '@/lib/emailClient'
import { ClipboardList, Plus, Search, Eye, ShieldCheck, CheckCircle, XCircle, Loader2, RefreshCw, Printer, Package, Calculator, FileCheck, CheckSquare } from 'lucide-react'

// Job Order Statuses: Draft → Pending_Audit → Approved → Processing → Completed / Rejected
const JO_STATUSES = ['Draft','Pending_Audit','Approved','Processing','Completed','Rejected']

// RISO Exam Types matching physical form
const EXAM_TYPES = ['Prelim', 'Midterm', 'Pre-Final', 'Final', 'Elem. Test', 'HS Test']

export default function JobOrdersPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const [jos, setJos]           = useState([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStat] = useState('')
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [showCreate, setCreate] = useState(false)
  const [viewJO, setViewJO]     = useState(null)
  const [acting, setActing]     = useState(false)
  const [showRisoForm, setShowRisoForm] = useState(false)
  const [showComputeModal, setShowComputeModal] = useState(false)
  const [risoItems, setRisoItems] = useState([])
  const [selectedJO, setSelectedJO] = useState(null)
  const PAGE = 10
  const supabase = createClient()
  const isStaff   = ['bookstore_manager','bookstore_staff'].includes(profile?.role_type)
  const isRisographer = profile?.role_type === 'risographer'
  const isTeacher = profile?.role_type === 'teacher'
  const canManageRiso = isStaff || isRisographer

  const fetchJOs = useCallback(async (silent = false) => {
    if (!profile) return
    if (!silent) setLoading(true)
    let q = supabase.from('job_orders')
      .select('*, requester:requester_id(first_name,last_name,department,id_number), riso_items:riso_job_items(*)', { count:'exact' })
      .order('created_at', { ascending:false })
      .range((page-1)*PAGE, page*PAGE-1)
    // Teachers see their own, risographers see RISO jobs, staff see all
    if (isTeacher) q = q.eq('requester_id', profile.user_id)
    if (isRisographer) q = q.eq('job_type', 'RISO')
    if (statusFilter) q = q.eq('status', statusFilter)
    if (search) q = q.ilike('job_number', `%${search}%`)
    const { data, count } = await q
    setJos(data||[]); setTotal(count||0); setLoading(false)
  }, [profile, isStaff, isRisographer, isTeacher, statusFilter, search, page])

  useRealtime({ tables:['job_orders'], onRefresh:fetchJOs, enabled:!!profile })
  useEffect(() => { fetchJOs() }, [profile, statusFilter, search, page])

  async function updateStatus(id, status, auditNotes = '') {
    setActing(true)
    try {
      const updates = { status }
      // Get job details for email notification
      const { data: job } = await supabase.from('job_orders')
        .select('*, requester:requester_id(first_name,last_name,email,department,id_number), riso_items:riso_job_items(*)')
        .eq('job_id', id)
        .single()
      
      // Stamp the right audit fields based on transition
      if (status === 'Pending_Audit') {
        // Teacher submits → no extra fields needed
        // Send submission confirmation email
        if (job?.job_type === 'RISO' && job?.requester?.email) {
          await sendEmailClient({
            to: job.requester.email,
            ...EmailTemplates.risoJobSubmitted(job, job.requester, job.riso_items)
          })
        }
      }
      if (status === 'Approved') {
        updates.audited_by  = profile.user_id
        updates.audited_at  = new Date().toISOString()
        updates.approved_by = profile.user_id
        updates.approved_at = new Date().toISOString()
        if (auditNotes) updates.audit_notes = auditNotes
        
        // Send approval email for RISO jobs
        if (job?.job_type === 'RISO' && job?.requester?.email) {
          await sendEmailClient({
            to: job.requester.email,
            ...EmailTemplates.risoJobApproved(job, job.requester, job.riso_items)
          })
        }
      }
      if (status === 'Rejected') {
        updates.audited_by = profile.user_id
        updates.audited_at = new Date().toISOString()
        if (auditNotes) updates.audit_notes = auditNotes
        
        // Send rejection email for RISO jobs
        if (job?.job_type === 'RISO' && job?.requester?.email) {
          await sendEmailClient({
            to: job.requester.email,
            ...EmailTemplates.risoJobRejected(job, job.requester, auditNotes)
          })
        }
      }
      if (status === 'Processing') {
        updates.risographer_id = profile.user_id
        updates.processing_at = new Date().toISOString()
        
        // Send "printing started" email for RISO jobs
        if (job?.job_type === 'RISO' && job?.requester?.email) {
          await sendEmailClient({
            to: job.requester.email,
            ...EmailTemplates.risoJobStarted(job, job.requester)
          })
        }
      }
      if (status === 'Completed') {
        updates.completed_at = new Date().toISOString()
        // Send pickup notification
        await notifyPickup(id)
      }
      await supabase.from('job_orders').update(updates).eq('job_id', id)
      toast(`Job Order ${fmtStatus(status)}.`, 'success')
      if (viewJO?.job_id === id) setViewJO(j => ({ ...j, status, ...updates }))
      await fetchJOs() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  async function notifyPickup(jobId) {
    // Create notification for teacher to pickup completed job
    const { data: job } = await supabase.from('job_orders')
      .select('requester_id, job_number, total_amount, paper_used, ink_used, masters_used, requester:requester_id(first_name,last_name,email)')
      .eq('job_id', jobId)
      .single()
    if (job) {
      // In-app notification
      await supabase.from('notifications').insert({
        user_id: job.requester_id,
        title: 'RISO Job Order Ready for Pickup',
        message: `Your RISO Job Order ${job.job_number} has been completed and is ready for pickup at the Bookstore.`,
        type: 'success',
        reference_type: 'job_order',
        reference_id: jobId
      })
      
      // Email notification for RISO completion
      if (job?.requester?.email && job.job_type === 'RISO') {
        const costs = job.total_amount > 0 ? {
          totalCost: job.total_amount,
          paperUsed: job.paper_used,
          inkUsed: job.ink_used,
          mastersUsed: job.masters_used
        } : null
        
        await sendEmailClient({
          to: job.requester.email,
          ...EmailTemplates.risoJobCompleted(job, job.requester, costs)
        })
      }
    }
  }

  async function addRisoItem(jobId, item) {
    try {
      const { error } = await supabase.from('riso_job_items').insert({
        job_id: jobId,
        subject: item.subject,
        num_masters: item.numMasters,
        print_type: item.printType,
        copies_per_master: item.copiesPerMaster,
        total_paper_used: item.totalPaper
      })
      if (error) throw error
      toast('RISO item added successfully', 'success')
    } catch(e) { toast(e.message, 'error') }
  }

  async function computeCosts(jobId, costs) {
    try {
      const { error } = await supabase.from('job_orders').update({
        paper_used: costs.paperUsed,
        ink_used: costs.inkUsed,
        masters_used: costs.mastersUsed,
        total_amount: costs.totalCost,
        computed_by: profile.user_id,
        computed_at: new Date().toISOString()
      }).eq('job_id', jobId)
      if (error) throw error
      toast('Costs computed and saved', 'success')
      setShowComputeModal(false)
      await fetchJOs() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch(e) { toast(e.message, 'error') }
  }

  async function approveFinal(jobId) {
    try {
      const { error } = await supabase.from('job_orders').update({
        final_approved_by: profile.user_id,
        final_approved_at: new Date().toISOString(),
        status: 'Approved'
      }).eq('job_id', jobId)
      if (error) throw error
      toast('Job Order finally approved for printing', 'success')
      await fetchJOs() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch(e) { toast(e.message, 'error') }
  }

  async function deductInventory(jobId) {
    // Deduct RISO materials from inventory
    try {
      const { data: job } = await supabase.from('job_orders').select('paper_used, ink_used, masters_used').eq('job_id', jobId).single()
      if (!job) return
      
      // Find RISO paper and ink items
      const { data: paperItem } = await supabase.from('bookstore_items').select('item_id, stock_quantity').eq('sku', 'RISO-PAPER').single()
      const { data: inkItem } = await supabase.from('bookstore_items').select('item_id, stock_quantity').eq('sku', 'RISO-INK').single()
      const { data: masterItem } = await supabase.from('bookstore_items').select('item_id, stock_quantity').eq('sku', 'RISO-MASTER').single()
      
      if (paperItem && job.paper_used > 0) {
        await supabase.from('bookstore_items').update({ 
          stock_quantity: Math.max(0, paperItem.stock_quantity - job.paper_used) 
        }).eq('item_id', paperItem.item_id)
        await supabase.from('inventory_logs').insert({
          item_id: paperItem.item_id,
          changed_by: profile.user_id,
          change_type: 'Deduct',
          quantity_before: paperItem.stock_quantity,
          quantity_after: Math.max(0, paperItem.stock_quantity - job.paper_used),
          delta: -job.paper_used,
          reference_id: jobId,
          notes: `RISO Job Order ${jobId} paper consumption`
        })
      }
      
      toast('Inventory deducted successfully', 'success')
      await fetchJOs() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch(e) { toast(e.message, 'error') }
  }

  const badge = (s) => (
    <span className={cn('badge', JO_STATUS_COLORS[s] || 'bg-slate-100 text-slate-600')}>
      {fmtStatus(s)}
    </span>
  )

  return (
    <div className="page-enter h-[100vh]">
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
                        <div className="text-xs font-mono font-bold text-brand-600">{jo.requester?.id_number || '—'}</div>
                        {jo.requester?.department && <div className="text-xs text-slate-400">{jo.requester.department}</div>}
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
                <p className="text-xs font-mono font-bold text-brand-600">{viewJO.requester?.id_number || '—'}</p>
                {viewJO.requester?.department && <p className="text-xs text-slate-400">{viewJO.requester.department}</p>}
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
  const [form, setForm] = useState({ 
    department_account: '', 
    cost_center: '',
    description: '', 
    notes: '',
    job_type: 'RISO',
    exam_type: '',
    charge_to: ''
  })
  const [risoItems, setRisoItems] = useState([{ subject: '', numMasters: 1, printType: '1_side', copiesPerMaster: 1 }])
  const [saving, setSaving] = useState(false)
  const isRiso = true
  const supabase = createClient()

  const DEPTS = [
    'Accounting','Registrar','CICT','Engineering','Business',
    'Education','Nursing','LibArts','Graduate School','Administration'
  ]

  const addRisoItem = () => {
    setRisoItems([...risoItems, { subject: '', numMasters: 1, printType: '1_side', copiesPerMaster: 1 }])
  }

  const updateRisoItem = (index, field, value) => {
    const newItems = [...risoItems]
    newItems[index][field] = value
    // Auto-calculate total paper
    if (field === 'numMasters' || field === 'copiesPerMaster') {
      newItems[index].totalPaper = newItems[index].numMasters * newItems[index].copiesPerMaster
    }
    setRisoItems(newItems)
  }

  const removeRisoItem = (index) => {
    if (risoItems.length > 1) {
      setRisoItems(risoItems.filter((_, i) => i !== index))
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!form.department_account.trim()) { toast('Department account is required.','warning'); return }
    if (isRiso && risoItems.some(item => !item.subject.trim())) { 
      toast('All RISO items must have a subject.','warning'); return 
    }
    
    setSaving(true)
    try {
      // Insert job order
      const { generateJobNumber } = await import('@/lib/utils')
      const { data: jobData, error: jobError } = await supabase.from('job_orders').insert({
        requester_id: profile.user_id,
        department_account: form.department_account,
        cost_center: form.cost_center || null,
        description: form.description,
        notes: form.notes || null,
        job_type: 'RISO',
        exam_type: form.exam_type || null,
        charge_to: form.charge_to || null,
        status: 'Draft',
        job_number: generateJobNumber(),
      }).select('job_id').single()
      
      if (jobError) throw jobError

      // Insert RISO items if RISO job
      if (jobData) {
        const itemsToInsert = risoItems.map(item => ({
          job_id: jobData.job_id,
          subject: item.subject,
          num_masters: parseInt(item.numMasters) || 1,
          print_type: item.printType,
          copies_per_master: parseInt(item.copiesPerMaster) || 1,
          total_paper_used: (parseInt(item.numMasters) || 1) * (parseInt(item.copiesPerMaster) || 1)
        }))
        
        const { error: itemsError } = await supabase.from('riso_job_items').insert(itemsToInsert)
        if (itemsError) throw itemsError
      }
      
      onCreated()
    } catch(e) { toast(e.message,'error') } finally { setSaving(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Submit RISO Job Order" size="lg">
      <form onSubmit={submit} className="space-y-4">
        <Alert type="info" message="RISO Job Orders require approval before printing."/>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Department Account <span className="text-red-500">*</span></label>
            <input className="input" list="depts" value={form.department_account}
              onChange={e => setForm(f=>({...f,department_account:e.target.value}))}
              placeholder="e.g. CICT, Accounting..."/>
            <datalist id="depts">{DEPTS.map(d => <option key={d} value={d}/>)}</datalist>
          </div>
          <div>
            <label className="label">Cost Center</label>
            <input className="input" value={form.cost_center}
              onChange={e => setForm(f=>({...f,cost_center:e.target.value}))}
              placeholder="e.g. CAS, COECS..."/>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Exam Type</label>
            <select className="input" value={form.exam_type}
              onChange={e => setForm(f => ({...f, exam_type: e.target.value}))}>
              <option value="">Select exam type...</option>
              {EXAM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Charge To</label>
            <input className="input" value={form.charge_to}
              onChange={e => setForm(f => ({...f, charge_to: e.target.value}))}
              placeholder="Account to charge..."/>
          </div>
        </div>

        {/* RISO Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
            <p className="font-medium text-sm text-slate-700">RISO Job Items</p>
          </div>
          <div className="p-4 space-y-3">
            {risoItems.map((item, index) => (
              <div key={index} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-4">
                  <label className="text-xs text-slate-500">Subject</label>
                  <input className="input text-sm" value={item.subject}
                    onChange={e => updateRisoItem(index, 'subject', e.target.value)}
                    placeholder="Subject name..."/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500"># of Masters</label>
                  <input type="number" min="1" className="input text-sm" value={item.numMasters}
                    onChange={e => updateRisoItem(index, 'numMasters', e.target.value)}/>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Print Type</label>
                  <select className="input text-sm" value={item.printType}
                    onChange={e => updateRisoItem(index, 'printType', e.target.value)}>
                    <option value="1_side">1 Side</option>
                    <option value="B_to_B">B to B</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-slate-500">Copies/Master</label>
                  <input type="number" min="1" className="input text-sm" value={item.copiesPerMaster}
                    onChange={e => updateRisoItem(index, 'copiesPerMaster', e.target.value)}/>
                </div>
                <div className="col-span-1">
                  <button type="button" onClick={() => removeRisoItem(index)}
                    className="btn-ghost text-red-500 p-1" disabled={risoItems.length === 1}>
                    <XCircle size={16}/>
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addRisoItem}
              className="btn-ghost text-xs gap-1 w-full justify-center">
              <Plus size={12}/> Add Another Subject
            </button>
          </div>
        </div>

        <div>
          <label className="label">Description / Purpose <span className="text-red-500">*</span></label>
          <textarea className="input resize-none" rows={3} value={form.description}
            onChange={e => setForm(f=>({...f,description:e.target.value}))}
            placeholder="Additional instructions for RISO printing..."/>
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

// RISO Compute Costs Modal
function ComputeCostsModal({ job, onClose, onComputed }) {
  const { profile } = useAuth()
  const toast = useToast()
  const supabase = createClient()
  const [costs, setCosts] = useState({
    paperUsed: job?.paper_used || 0,
    inkUsed: job?.ink_used || 0,
    mastersUsed: job?.masters_used || 0,
    paperCost: 0,
    inkCost: 0,
    masterCost: 0,
    totalCost: job?.total_amount || 0
  })
  const [saving, setSaving] = useState(false)

  const calculateTotal = () => {
    const total = (costs.paperCost + costs.inkCost + costs.masterCost)
    setCosts(c => ({ ...c, totalCost: total }))
  }

  useEffect(() => {
    calculateTotal()
  }, [costs.paperCost, costs.inkCost, costs.masterCost])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    try {
      const { error } = await supabase.from('job_orders').update({
        paper_used: costs.paperUsed,
        ink_used: costs.inkUsed,
        masters_used: costs.mastersUsed,
        total_amount: costs.totalCost,
        computed_by: profile.user_id,
        computed_at: new Date().toISOString()
      }).eq('job_id', job.job_id)
      if (error) throw error
      toast('Costs computed and saved', 'success')
      onComputed()
    } catch(e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Compute RISO Costs" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert type="info" message="Enter material usage and costs based on actual printing."/>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Paper Used (sheets)</label>
            <input type="number" className="input" value={costs.paperUsed}
              onChange={e => setCosts(c => ({...c, paperUsed: parseInt(e.target.value) || 0}))}/>
          </div>
          <div>
            <label className="label">Paper Cost (₱)</label>
            <input type="number" step="0.01" className="input" value={costs.paperCost}
              onChange={e => setCosts(c => ({...c, paperCost: parseFloat(e.target.value) || 0}))}/>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ink Used (ml)</label>
            <input type="number" step="0.1" className="input" value={costs.inkUsed}
              onChange={e => setCosts(c => ({...c, inkUsed: parseFloat(e.target.value) || 0}))}/>
          </div>
          <div>
            <label className="label">Ink Cost (₱)</label>
            <input type="number" step="0.01" className="input" value={costs.inkCost}
              onChange={e => setCosts(c => ({...c, inkCost: parseFloat(e.target.value) || 0}))}/>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Masters Used</label>
            <input type="number" className="input" value={costs.mastersUsed}
              onChange={e => setCosts(c => ({...c, mastersUsed: parseInt(e.target.value) || 0}))}/>
          </div>
          <div>
            <label className="label">Master Cost (₱)</label>
            <input type="number" step="0.01" className="input" value={costs.masterCost}
              onChange={e => setCosts(c => ({...c, masterCost: parseFloat(e.target.value) || 0}))}/>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-slate-700">Total Cost:</span>
            <span className="text-xl font-bold text-brand-700">{formatCurrency(costs.totalCost)}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin"/> : <><Calculator size={14}/> Save Computation</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}