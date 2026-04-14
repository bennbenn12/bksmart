'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, Printer, FileText, ArrowLeft, Clock, CheckCircle, RefreshCw, ListOrdered, CalendarDays, CreditCard, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { JO_STATUS_COLORS, ORDER_STATUS_COLORS, cn, formatCurrency, formatDateTime } from '@/lib/utils'
import CancelOrderButton from './CancelOrderButton'

const STATUS_HINTS = {
  Pending:   '📋 Your order is being prepared. You will be notified when ready for pickup.',
  Ready:     '🎉 Your order is ready! Visit the Bookstore to pick up your items.',
  Released:  '✅ Your order has been picked up. Thank you for shopping with us!',
  Cancelled: '❌ This order has been cancelled.',
}

const RISO_STATUS_HINTS = {
  Draft:         'Your RISO request is saved as draft. Submit it for review when ready.',
  Pending_Audit: '📄 Please bring your documents to the Bookstore. Staff will verify and approve your request.',
  Approved:        '✅ Documents received! Your request is approved and queued for printing.',
  Processing:       '🖨️ Currently printing your materials. Please wait for completion notification.',
  Completed:      '🎉 Your RISO print job is done! Ready for pickup at the Bookstore.',
  Rejected:       '❌ Your RISO request was rejected. Please check with Bookstore staff for details.',
}

export default function MyOrdersPage() {
  const { profile, user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  
  const [orders, setOrders] = useState([])
  const [risoJobs, setRisoJobs] = useState([])
  const [loading, setLoading] = useState(true)
  
  const isTeacher = profile?.role_type === 'teacher'
  const hasAnyOrders = (orders?.length > 0) || (risoJobs?.length > 0)
  
  // Fetch orders and RISO jobs
  const fetchData = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    
    // Fetch regular orders
    const { data: orderData } = await supabase
      .from('orders')
      .select('*, order_items(order_item_id,quantity,unit_price,bookstore_items(name,image_url,category)), payments(payment_id,verified_at)')
      .eq('user_id', profile.id_number)
      .order('created_at',{ascending:false})
      .limit(50)
    setOrders(orderData || [])
    
    // Fetch RISO job orders for teachers
    if (isTeacher) {
      const { data: jobs } = await supabase
        .from('job_orders')
        .select('*, riso_items:riso_job_items(*)')
        .eq('requester_id', profile.id_number)
        .eq('job_type', 'RISO')
        .order('created_at', { ascending: false })
        .limit(50)
      setRisoJobs(jobs || [])
    }
    
    setLoading(false)
  }, [profile, supabase, isTeacher])
  
  useEffect(() => {
    fetchData()
  }, [fetchData])
  
  if (!profile) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/shop/profile" className="btn-ghost p-1.5"><ArrowLeft size={16}/></Link>
        <h1 className="text-2xl font-display font-bold text-hnu-dark">My Orders</h1>
        <Link href="/shop" className="btn-primary ml-auto text-sm"><Package size={14}/> New Order</Link>
      </div>

      {/* Status Summary */}
      {orders && orders.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'All', count: orders.length, filter: '' },
            { label: 'Pending', count: orders.filter(o => o.status === 'Pending').length, filter: 'Pending' },
            { label: 'Ready', count: orders.filter(o => o.status === 'Ready').length, filter: 'Ready', highlight: true },
            { label: 'Released', count: orders.filter(o => o.status === 'Released').length, filter: 'Released' },
          ].map(tab => (
            <button
              key={tab.label}
              className={cn(
                'px-4 py-2 rounded-full text-xs font-bold border transition-all',
                tab.highlight && tab.count > 0 ? 'bg-green-100 border-green-300 text-green-700' : 'bg-white border-slate-200 text-slate-600 hover:border-brand-300'
              )}
            >
              {tab.label} {tab.count > 0 && <span className="ml-1 opacity-60">({tab.count})</span>}
            </button>
          ))}
        </div>
      )}

      {/* Refresh button */}
      {isTeacher && (
        <div className="flex items-center gap-2">
          <button onClick={fetchData} className="btn-ghost gap-1 text-xs ml-auto">
            <RefreshCw size={12}/> Refresh
          </button>
        </div>
      )}

      {/* RISO Jobs Section (Teachers only) */}
      {isTeacher && risoJobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
            <Printer size={18} className="text-purple-600"/>
            RISO Printing Jobs
          </h2>
          {risoJobs.map(job => (
            <div key={job.job_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between px-5 py-4 bg-purple-50 border-b border-purple-100">
                <div className="flex items-center gap-3">
                  <FileText size={16} className="text-purple-600"/>
                  <span className="font-mono text-sm font-bold text-purple-700">{job.job_number || job.job_id.slice(0,8)}</span>
                  <span className={cn('badge text-xs', JO_STATUS_COLORS[job.status] || 'bg-slate-100')}>
                    {job.status?.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-purple-600">
                  {job.riso_items?.length || 0} subject(s)
                </div>
              </div>
              
              <div className="px-5 py-3">
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <span className="font-medium">Dept:</span> {job.department_account}
                  {job.exam_type && (
                    <>
                      <span className="text-slate-300">|</span>
                      <span className="badge bg-blue-50 text-blue-700 text-xs">{job.exam_type}</span>
                    </>
                  )}
                </div>
                
                {/* RISO Items Summary */}
                <div className="text-xs text-slate-500 space-y-1">
                  {job.riso_items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.subject}</span>
                      <span>{item.num_masters} master(s) × {item.copies_per_master} copies ({item.print_type === 'B_to_B' ? 'B to B' : '1 side'})</span>
                    </div>
                  ))}
                  {job.riso_items?.length > 3 && (
                    <p className="text-slate-400">+{job.riso_items.length - 3} more subject(s)</p>
                  )}
                </div>
              </div>

              {/* Status hint with visual indicators */}
              <div className="px-5 py-3 border-t border-slate-100">
                {/* Status progress bar */}
                <div className="flex items-center gap-1 mb-3">
                  {['Pending_Audit', 'Approved', 'Processing', 'Completed'].map((s, idx) => {
                    const isActive = ['Pending_Audit', 'Approved', 'Processing', 'Completed'].indexOf(job.status) >= idx
                    const isCurrent = job.status === s
                    return (
                      <div key={s} className="flex-1 flex items-center">
                        <div className={cn(
                          'h-2 rounded-full flex-1 transition-all',
                          isActive ? (isCurrent ? 'bg-purple-600' : 'bg-purple-300') : 'bg-slate-200'
                        )}/>
                        {idx < 3 && <div className="w-1"/>}
                      </div>
                    )
                  })}
                </div>
                
                <p className="text-sm text-slate-600 flex items-start gap-2">
                  <Clock size={14} className="shrink-0 mt-0.5"/>
                  {RISO_STATUS_HINTS[job.status] || 'Status update pending.'}
                </p>
                
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-slate-400">
                    Submitted: {formatDateTime(job.created_at)}
                  </span>
                  
                  {/* Action buttons based on status */}
                  {job.status === 'Pending_Audit' && (
                    <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full">
                      📄 Bring Documents to Bookstore
                    </span>
                  )}
                  {job.status === 'Completed' && (
                    <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      🎉 Ready for Pickup!
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ready Orders Quick Pickup */}
      {orders?.some(o => o.status === 'Ready') && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-center gap-2 text-green-800">
            <CheckCircle size={20}/>
            <h2 className="font-bold text-lg">Ready for Pickup</h2>
            <span className="text-sm text-green-600 ml-auto">
              {orders.filter(o => o.status === 'Ready').length} order(s)
            </span>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {orders.filter(o => o.status === 'Ready').map(o => (
              <div key={o.order_id} className="bg-white rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-brand-700">{o.order_number}</span>
                  <span className="font-bold text-slate-700">{formatCurrency(o.total_amount)}</span>
                </div>
                <p className="text-xs text-slate-500 mb-3">
                  {o.order_items?.length || 0} item(s) · {o.order_items?.slice(0,2).map(i => i.bookstore_items?.name).join(', ')}
                  {o.order_items?.length > 2 && '...'}
                </p>
                <div className="flex gap-2">
                  <Link 
                    href={`/shop/queue?orderId=${o.order_id}`} 
                    className="flex-1 btn-primary bg-green-600 hover:bg-green-700 text-center text-xs py-2"
                  >
                    <ListOrdered size={12}/> Join Queue
                  </Link>
                  <Link 
                    href={`/shop/appointments?orderId=${o.order_id}`} 
                    className="flex-1 btn-secondary text-center text-xs py-2"
                  >
                    <CalendarDays size={12}/> Book Appt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regular Orders Section */}
      {orders?.length > 0 && (
        <div className="space-y-4">
          {risoJobs.length > 0 && (
            <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
              <Package size={18} className="text-brand-600"/>
              All Orders
            </h2>
          )}
          {orders.map(o=>{
        const isPaid = o.payments?.some(p => p.verified_at)
        const needsTeller = parseFloat(o.total_amount) >= 100
        return (
        <div key={o.order_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-brand-700">{o.order_number}</span>
              <span className={cn('badge text-xs',ORDER_STATUS_COLORS[o.status]||'bg-slate-100')}>{o.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">{formatCurrency(o.total_amount)}</span>
              {o.status === 'Pending' && <CancelOrderButton orderId={o.order_id} orderNumber={o.order_number} />}
              <Link href={`/shop/orders/${o.order_id}/slip`} className="btn-secondary py-1 px-3 text-xs">View Slip</Link>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {o.order_items?.slice(0,3).map(item=>(
              <div key={item.order_item_id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden text-lg">
                  {item.bookstore_items?.image_url ? <img src={item.bookstore_items.image_url} className="w-full h-full object-cover"/> : '📖'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 text-sm truncate">{item.bookstore_items?.name}</p>
                  <p className="text-xs text-slate-400">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-bold text-slate-600 text-sm shrink-0">{formatCurrency(item.quantity*item.unit_price)}</p>
              </div>
            ))}
            {o.order_items?.length > 3 && <p className="px-5 py-2 text-xs text-slate-400">+{o.order_items.length-3} more item(s)</p>}
          </div>

          {/* Status hint + contextual actions */}
          <div className="px-5 py-3 border-t border-slate-100 space-y-2">
            {STATUS_HINTS[o.status] && (
              <p className="text-xs text-slate-500 flex items-center gap-1.5">
                <Clock size={11} className="shrink-0"/>
                {o.status === 'Pending' && needsTeller && !isPaid
                  ? 'Please pay at the University Teller and present your Official Receipt at the Bookstore.'
                  : o.status === 'Pending' && !needsTeller && !isPaid
                  ? 'Visit the Bookstore to pay and pick up your items.'
                  : STATUS_HINTS[o.status]}
              </p>
            )}
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs text-slate-400">Placed: {formatDateTime(o.created_at)}</span>
              {o.status==='Released' && o.released_at && <span className="text-xs text-slate-400">· Released: {formatDateTime(o.released_at)}</span>}
              {o.status==='Cancelled' && o.notes && <span className="text-xs text-red-400">· Reason: {o.notes}</span>}
              <div className="ml-auto flex items-center gap-2">
                {o.status === 'Pending' && needsTeller && !isPaid && (
                  <Link href={`/shop/orders/${o.order_id}/slip`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                    <CreditCard size={11}/> Print Teller Slip
                  </Link>
                )}
                {o.status === 'Ready' && (
                  <Link href={`/shop/queue?orderId=${o.order_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    <ListOrdered size={11}/> Join Queue for Pickup
                  </Link>
                )}
                {o.status === 'Ready' && (
                  <Link href={`/shop/appointments?orderId=${o.order_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700">
                    <CalendarDays size={11}/> Book Pickup Appointment
                  </Link>
                )}
                {o.status === 'Released' && (
                  <Link href="/shop/feedback" className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700">
                    <MessageSquare size={11}/> Give Feedback
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )})}
        </div>
      )}

      {/* Empty State */}
      {!hasAnyOrders && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Package size={48} className="mx-auto text-slate-200 mb-4"/>
          <p className="font-semibold text-slate-500">No orders yet.</p>
          <Link href="/shop" className="btn-primary mt-4 inline-flex">Browse Shop</Link>
        </div>
      )}
    </div>
  )
}
