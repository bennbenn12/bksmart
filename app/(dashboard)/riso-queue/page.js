'use client'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Pagination } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { JO_STATUS_COLORS, formatDateTime, fmtStatus, cn, formatCurrency } from '@/lib/utils'
import { sendEmailClient, EmailTemplates } from '@/lib/emailClient'
import { Printer, Play, CheckCircle, Clock, Package, Calculator, RefreshCw, Eye, ArrowRight, Pause } from 'lucide-react'

// RISO-specific statuses for queue management
const RISO_STATUSES = ['Pending', 'Processing', 'Completed']

export default function RisoQueuePage() {
  const { profile } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  // Default to showing Approved jobs for risographers so they can start printing
  const isRisographer = profile?.role_type === 'risographer'
  const [statusFilter, setStat] = useState(isRisographer ? 'Approved' : '')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [viewJob, setViewJob] = useState(null)
  const [acting, setActing] = useState(false)
  const [showComputeModal, setShowComputeModal] = useState(false)
  const PAGE = 10
  const supabase = useMemo(() => createClient(), [])
  const isStaff = ['bookstore_manager', 'bookstore_staff'].includes(profile?.role_type)

  const fetchJobs = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    let q = supabase.from('job_orders')
      .select('*, requester:requester_id(first_name,last_name,department,id_number), riso_items:riso_job_items(*)', { count: 'exact' })
      .eq('job_type', 'RISO')
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE, page * PAGE - 1)
    
    if (statusFilter) q = q.eq('status', statusFilter)
    
    const { data, count } = await q
    setJobs(data || [])
    setTotal(count || 0)
    setLoading(false)
  }, [profile, statusFilter, page])

  useRealtime({ tables: ['job_orders'], onRefresh: fetchJobs, enabled: !!profile })
  useEffect(() => { fetchJobs() }, [profile, statusFilter, page])

  async function startProcessing(jobId) {
    setActing(true)
    try {
      const now = new Date().toISOString()
      const { error } = await supabase.from('job_orders').update({
        status: 'Processing',
        risographer_id: profile.user_id,
        processing_at: now
      }).eq('job_id', jobId)
      if (error) throw error
      
      // Update local state immediately so UI shows Complete button
      setJobs(prev => prev.map(j => 
        j.job_id === jobId 
          ? { ...j, status: 'Processing', risographer_id: profile.user_id, processing_at: now }
          : j
      ))
      
      // Add to RISO queue
      await supabase.from('riso_queue').insert({
        job_id: jobId,
        risographer_id: profile.user_id,
        status: 'Processing'
      })
      
      // Send email notification to teacher
      const { data: job } = await supabase.from('job_orders')
        .select('*, requester:requester_id(first_name,last_name,email)')
        .eq('job_id', jobId)
        .single()
      
      if (job?.requester?.email) {
        try {
          await sendEmailClient({
            to: job.requester.email,
            ...EmailTemplates.risoJobStarted(job, job.requester)
          })
        } catch (emailErr) {
          console.error('Failed to send started email:', emailErr)
        }
      }
      
      toast('Started processing RISO job', 'success')
      await fetchJobs() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch (e) { toast(e.message, 'error') } finally { setActing(false) }
  }

  async function completeJob(jobId) {
    setActing(true)
    try {
      // First compute costs
      setShowComputeModal(true)
      setViewJob(jobs.find(j => j.job_id === jobId))
    } catch (e) { toast(e.message, 'error') } finally { setActing(false) }
  }

  async function finalizeCompletion(jobId, costs) {
    try {
      const { error } = await supabase.from('job_orders').update({
        status: 'Completed',
        completed_at: new Date().toISOString(),
        paper_used: costs.paperUsed,
        ink_used: costs.inkUsed,
        masters_used: costs.mastersUsed,
        total_amount: costs.totalCost
      }).eq('job_id', jobId)
      if (error) throw error

      // Update RISO queue
      await supabase.from('riso_queue').update({
        status: 'Completed',
        completed_at: new Date().toISOString()
      }).eq('job_id', jobId)

      // Deduct inventory
      await deductInventory(jobId, costs)

      // Send pickup notification (email + in-app)
      await notifyPickup(jobId, costs)

      toast('RISO job completed successfully', 'success')
      setShowComputeModal(false)
      setViewJob(null)
      await fetchJobs() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch (e) { toast(e.message, 'error') }
  }

  async function deductInventory(jobId, costs) {
    try {
      // Deduct paper
      const { data: paperItem } = await supabase.from('bookstore_items')
        .select('item_id, stock_quantity').eq('sku', 'RISO-PAPER').single()
      if (paperItem && costs.paperUsed > 0) {
        await supabase.from('bookstore_items').update({
          stock_quantity: Math.max(0, paperItem.stock_quantity - costs.paperUsed)
        }).eq('item_id', paperItem.item_id)
        
        await supabase.from('inventory_logs').insert({
          item_id: paperItem.item_id,
          changed_by: profile.user_id,
          change_type: 'Deduct',
          quantity_before: paperItem.stock_quantity,
          quantity_after: Math.max(0, paperItem.stock_quantity - costs.paperUsed),
          delta: -costs.paperUsed,
          reference_id: jobId,
          notes: `RISO Job Order ${jobId} paper consumption`
        })
      }

      // Deduct ink
      const { data: inkItem } = await supabase.from('bookstore_items')
        .select('item_id, stock_quantity').eq('sku', 'RISO-INK').single()
      if (inkItem && costs.inkUsed > 0) {
        await supabase.from('bookstore_items').update({
          stock_quantity: Math.max(0, inkItem.stock_quantity - costs.inkUsed)
        }).eq('item_id', inkItem.item_id)
        
        await supabase.from('inventory_logs').insert({
          item_id: inkItem.item_id,
          changed_by: profile.user_id,
          change_type: 'Deduct',
          quantity_before: inkItem.stock_quantity,
          quantity_after: Math.max(0, inkItem.stock_quantity - costs.inkUsed),
          delta: -costs.inkUsed,
          reference_id: jobId,
          notes: `RISO Job Order ${jobId} ink consumption`
        })
      }

      // Deduct masters
      const { data: masterItem } = await supabase.from('bookstore_items')
        .select('item_id, stock_quantity').eq('sku', 'RISO-MASTER').single()
      if (masterItem && costs.mastersUsed > 0) {
        await supabase.from('bookstore_items').update({
          stock_quantity: Math.max(0, masterItem.stock_quantity - costs.mastersUsed)
        }).eq('item_id', masterItem.item_id)
        
        await supabase.from('inventory_logs').insert({
          item_id: masterItem.item_id,
          changed_by: profile.user_id,
          change_type: 'Deduct',
          quantity_before: masterItem.stock_quantity,
          quantity_after: Math.max(0, masterItem.stock_quantity - costs.mastersUsed),
          delta: -costs.mastersUsed,
          reference_id: jobId,
          notes: `RISO Job Order ${jobId} master consumption`
        })
      }
    } catch (e) { console.error('Inventory deduction error:', e) }
  }

  async function notifyPickup(jobId, costs = null) {
    // Get job details with requester email
    const { data: job } = await supabase.from('job_orders')
      .select('requester_id, job_number, total_amount, requester:requester_id(first_name,last_name,email)')
      .eq('job_id', jobId)
      .single()
    
    if (job) {
      // In-app notification
      await supabase.from('notifications').insert({
        user_id: job.requester_id,
        title: '🎉 RISO Job Order Ready for Pickup',
        message: `Your RISO Job Order ${job.job_number} has been completed and is ready for pickup at the Bookstore.`,
        type: 'success',
        reference_type: 'job_order',
        reference_id: jobId
      })
      
      // Email notification
      if (job?.requester?.email) {
        try {
          await sendEmailClient({
            to: job.requester.email,
            ...EmailTemplates.risoJobCompleted(
              job,
              job.requester,
              costs || { totalCost: job.total_amount }
            )
          })
        } catch (emailErr) {
          console.error('Failed to send completion email:', emailErr)
        }
      }
    }
  }

  const badge = (s) => (
    <span className={cn('badge', JO_STATUS_COLORS[s] || 'bg-slate-100 text-slate-600')}>
      {fmtStatus(s)}
    </span>
  )

  // Calculate queue statistics
  const pendingCount = jobs.filter(j => j.status === 'Approved').length
  const processingCount = jobs.filter(j => j.status === 'Processing').length
  const completedToday = jobs.filter(j => 
    j.status === 'Completed' && 
    new Date(j.completed_at).toDateString() === new Date().toDateString()
  ).length

  return (
    <div className="page-enter h-[100vh]">
      <Header title="RISO Queue Management"/>
      <div className="p-6 space-y-5">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 bg-yellow-50 border-yellow-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock size={20} className="text-yellow-700"/>
              </div>
              <div>
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-800">{pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-purple-50 border-purple-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Printer size={20} className="text-purple-700"/>
              </div>
              <div>
                <p className="text-sm text-purple-700">Processing</p>
                <p className="text-2xl font-bold text-purple-800">{processingCount}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 bg-green-50 border-green-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle size={20} className="text-green-700"/>
              </div>
              <div>
                <p className="text-sm text-green-700">Completed Today</p>
                <p className="text-2xl font-bold text-green-800">{completedToday}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot"/> Live — updates automatically
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <select className="input w-48" value={statusFilter}
            onChange={e => { setStat(e.target.value); setPage(1) }}>
            <option value="">All RISO Jobs</option>
            <option value="Pending_Audit">Pending Audit (Wait for Staff)</option>
            <option value="Approved">Ready to Print (Approved)</option>
            <option value="Processing">Currently Processing</option>
            <option value="Completed">Completed</option>
          </select>
          <button onClick={fetchJobs} className="btn-ghost gap-1 text-xs">
            <RefreshCw size={12}/> Refresh
          </button>
        </div>

        {/* RISO Jobs Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="th">Job #</th>
                  <th className="th">Requested By</th>
                  <th className="th">Department</th>
                  <th className="th">Exam Type</th>
                  <th className="th">Items</th>
                  <th className="th">Status</th>
                  <th className="th">Priority</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading
                  ? <tr><td colSpan={8} className="py-12"><LoadingSpinner/></td></tr>
                  : jobs.length === 0
                    ? <tr><td colSpan={8}>
                      <EmptyState icon={Printer} title="No RISO jobs in queue" 
                        message="RISO jobs will appear here once teachers submit them."/>
                    </td></tr>
                    : jobs.map(job => (
                  <tr key={job.job_id} className="hover:bg-slate-50 transition-colors">
                    <td className="td font-mono text-xs text-brand-700 font-bold">
                      {job.job_number || job.job_id.slice(0, 8)}
                    </td>
                    <td className="td">
                      <div className="font-medium text-slate-700">
                        {job.requester?.first_name} {job.requester?.last_name}
                      </div>
                      <div className="text-xs text-slate-400">{job.requester?.department}</div>
                    </td>
                    <td className="td">
                      <span className="badge bg-slate-100 text-slate-600 text-xs">
                        {job.department_account}
                      </span>
                    </td>
                    <td className="td">
                      {job.exam_type ? (
                        <span className="badge bg-blue-50 text-blue-700 text-xs">{job.exam_type}</span>
                      ) : '—'}
                    </td>
                    <td className="td">
                      <span className="text-xs font-medium">{job.riso_items?.length || 0} subjects</span>
                      <div className="text-xs text-slate-400">
                        {job.riso_items?.reduce((sum, item) => sum + (item.total_paper_used || 0), 0)} sheets
                      </div>
                    </td>
                    <td className="td">{badge(job.status)}</td>
                    <td className="td">
                      {job.status === 'Pending_Audit' && (
                        <span className="text-xs text-orange-600 font-medium">Waiting for Staff Approval</span>
                      )}
                      {job.status === 'Approved' && (
                        <span className="text-xs text-yellow-600 font-medium">Ready to Print - Start Now</span>
                      )}
                      {job.status === 'Processing' && (
                        <span className="text-xs text-purple-600 font-medium">
                          {job.risographer_id === profile?.id_number ? 'You are printing this' : 'Another risographer'}
                        </span>
                      )}
                      {job.status === 'Completed' && (
                        <span className="text-xs text-green-600 font-medium">Done</span>
                      )}
                    </td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* View Details - Always Available */}
                        <button onClick={() => setViewJob(job)} className="btn-ghost p-1.5" title="View Details">
                          <Eye size={13}/>
                        </button>
                        
                        {/* Start Processing - Only for Approved jobs */}
                        {(isRisographer || isStaff) && job.status === 'Approved' && (
                          <button disabled={acting} onClick={() => startProcessing(job.job_id)}
                            className="btn-primary py-1 px-2 text-xs gap-1" title="Start Printing">
                            <Play size={11}/> Start
                          </button>
                        )}
                        
                        {/* Complete - Only for Processing jobs assigned to this risographer */}
                        {(isRisographer || isStaff) && job.status === 'Processing' && (
                          <button 
                            disabled={acting || (job.risographer_id && job.risographer_id !== profile?.id_number && !isStaff)} 
                            onClick={() => completeJob(job.job_id)}
                            className="btn-primary py-1 px-2 text-xs bg-green-600 hover:bg-green-700 gap-1 disabled:opacity-50"
                            title={job.risographer_id && job.risographer_id !== profile?.id_number ? 'Assigned to another risographer' : 'Mark as Complete'}>
                            <CheckCircle size={11}/> Complete
                          </button>
                        )}
                        
                        {/* Message for Pending Audit */}
                        {job.status === 'Pending_Audit' && (
                          <span className="text-xs text-slate-400 italic">Wait for staff approval</span>
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

      {/* View Job Modal */}
      {viewJob && (
        <ViewJobModal 
          job={viewJob} 
          onClose={() => setViewJob(null)} 
          isStaff={isStaff}
          isRisographer={isRisographer}
          acting={acting}
          onStart={() => startProcessing(viewJob.job_id)}
          onComplete={() => completeJob(viewJob.job_id)}
        />
      )}

      {/* Compute Costs Modal */}
      {showComputeModal && viewJob && (
        <ComputeCostsModal 
          job={viewJob}
          onClose={() => { setShowComputeModal(false); setViewJob(null) }}
          onComplete={(costs) => finalizeCompletion(viewJob.job_id, costs)}
        />
      )}
    </div>
  )
}

// View Job Modal Component
function ViewJobModal({ job, onClose, isStaff, isRisographer, acting, onStart, onComplete }) {
  const totalPaper = job.riso_items?.reduce((sum, item) => sum + (item.total_paper_used || 0), 0) || 0
  const totalCopies = job.riso_items?.reduce((sum, item) => sum + ((item.num_masters || 0) * (item.copies_per_master || 0)), 0) || 0

  return (
    <Modal open={true} onClose={onClose} title={`RISO Job — ${job.job_number}`} size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
        <div className="flex items-center gap-3 flex-wrap">
          <span className={cn('badge', JO_STATUS_COLORS[job.status] || 'bg-slate-100')}>
            {fmtStatus(job.status)}
          </span>
          {job.exam_type && (
            <span className="badge bg-blue-50 text-blue-700">{job.exam_type}</span>
          )}
          <span className="text-xs text-slate-400">{formatDateTime(job.created_at)}</span>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label">Department / Cost Center</p>
            <p className="font-semibold text-slate-700">{job.department_account}</p>
            {job.cost_center && <p className="text-xs text-slate-500">{job.cost_center}</p>}
          </div>
          <div>
            <p className="label">Requested By</p>
            <p className="font-semibold text-slate-700">
              {job.requester?.first_name} {job.requester?.last_name}
            </p>
            <p className="text-xs text-slate-500">{job.requester?.department}</p>
          </div>
          {job.charge_to && (
            <div>
              <p className="label">Charge To</p>
              <p className="font-semibold text-slate-700">{job.charge_to}</p>
            </div>
          )}
          {job.processing_at && (
            <div>
              <p className="label">Started Processing</p>
              <p className="font-semibold text-slate-700">{formatDateTime(job.processing_at)}</p>
            </div>
          )}
        </div>

        {/* RISO Items Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
            <p className="font-medium text-sm text-slate-700">RISO Job Items</p>
            <span className="text-xs text-slate-500">{job.riso_items?.length || 0} subjects</span>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="th text-left">Subject</th>
                <th className="th text-center">Masters</th>
                <th className="th text-center">Print Type</th>
                <th className="th text-center">Copies/Master</th>
                <th className="th text-right">Total Paper</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {job.riso_items?.map((item, idx) => (
                <tr key={idx}>
                  <td className="td font-medium">{item.subject}</td>
                  <td className="td text-center">{item.num_masters}</td>
                  <td className="td text-center">
                    <span className="badge bg-slate-100 text-slate-600 text-xs">
                      {item.print_type === 'B_to_B' ? 'B to B' : '1 Side'}
                    </span>
                  </td>
                  <td className="td text-center">{item.copies_per_master}</td>
                  <td className="td text-right font-medium">{item.total_paper_used} sheets</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold">
                <td className="td" colSpan={4}>TOTAL</td>
                <td className="td text-right text-brand-700">{totalPaper} sheets</td>
              </tr>
            </tbody>
          </table>
        </div>

        {job.description && (
          <div>
            <p className="label">Description / Notes</p>
            <p className="text-slate-600 bg-slate-50 p-3 rounded-xl">{job.description}</p>
          </div>
        )}

        {/* Cost Summary (if completed) */}
        {job.status === 'Completed' && job.total_amount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="label text-green-800">Cost Summary</p>
            <div className="grid grid-cols-3 gap-4 text-sm mt-2">
              <div>
                <p className="text-green-600">Paper Used</p>
                <p className="font-semibold text-green-800">{job.paper_used} sheets</p>
              </div>
              <div>
                <p className="text-green-600">Ink Used</p>
                <p className="font-semibold text-green-800">{job.ink_used} ml</p>
              </div>
              <div>
                <p className="text-green-600">Masters Used</p>
                <p className="font-semibold text-green-800">{job.masters_used}</p>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-green-200 flex justify-between items-center">
              <span className="font-semibold text-green-800">Total Cost:</span>
              <span className="text-xl font-bold text-green-800">{formatCurrency(job.total_amount)}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {(isStaff || isRisographer) && (
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            {job.status === 'Approved' && (
              <button disabled={acting} onClick={onStart}
                className="btn-primary gap-1">
                <Play size={14}/> Start Processing
              </button>
            )}
            {job.status === 'Processing' && (
              <button disabled={acting} onClick={onComplete}
                className="btn-primary bg-green-600 hover:bg-green-700 gap-1">
                <CheckCircle size={14}/> Mark Completed
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}

// Compute Costs Modal
function ComputeCostsModal({ job, onClose, onComplete }) {
  const totalPaper = job.riso_items?.reduce((sum, item) => sum + (item.total_paper_used || 0), 0) || 0
  const [costs, setCosts] = useState({
    paperUsed: totalPaper,
    inkUsed: 0,
    mastersUsed: job.riso_items?.length || 0,
    paperCost: 0,
    inkCost: 0,
    masterCost: 0,
    totalCost: 0
  })
  const [saving, setSaving] = useState(false)

  const calculateTotal = () => {
    return costs.paperCost + costs.inkCost + costs.masterCost
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    const total = calculateTotal()
    try {
      onComplete({ ...costs, totalCost: total })
    } finally { setSaving(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="Complete RISO Job — Enter Costs" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Alert type="info" message="Enter actual material usage to deduct from inventory and calculate total cost."/>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Paper Used (sheets) <span className="text-red-500">*</span></label>
            <input type="number" min="0" className="input" value={costs.paperUsed}
              onChange={e => setCosts(c => ({...c, paperUsed: parseInt(e.target.value) || 0}))}/>
            <p className="text-xs text-slate-400 mt-1">Estimated: {totalPaper} sheets</p>
          </div>
          <div>
            <label className="label">Paper Cost (₱) <span className="text-red-500">*</span></label>
            <input type="number" step="0.01" min="0" className="input" value={costs.paperCost}
              onChange={e => setCosts(c => ({...c, paperCost: parseFloat(e.target.value) || 0}))}/>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Ink Used (ml)</label>
            <input type="number" step="0.1" min="0" className="input" value={costs.inkUsed}
              onChange={e => setCosts(c => ({...c, inkUsed: parseFloat(e.target.value) || 0}))}/>
          </div>
          <div>
            <label className="label">Ink Cost (₱)</label>
            <input type="number" step="0.01" min="0" className="input" value={costs.inkCost}
              onChange={e => setCosts(c => ({...c, inkCost: parseFloat(e.target.value) || 0}))}/>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Masters Used</label>
            <input type="number" min="0" className="input" value={costs.mastersUsed}
              onChange={e => setCosts(c => ({...c, mastersUsed: parseInt(e.target.value) || 0}))}/>
          </div>
          <div>
            <label className="label">Master Cost (₱)</label>
            <input type="number" step="0.01" min="0" className="input" value={costs.masterCost}
              onChange={e => setCosts(c => ({...c, masterCost: parseFloat(e.target.value) || 0}))}/>
          </div>
        </div>

        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-brand-800">Total Cost:</span>
            <span className="text-2xl font-bold text-brand-700">{formatCurrency(calculateTotal())}</span>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary bg-green-600 hover:bg-green-700 gap-1">
            {saving ? <span className="animate-spin">⋯</span> : <><CheckCircle size={14}/> Complete Job</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}
