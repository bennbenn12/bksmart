'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Package, Printer, FileText, ArrowLeft, CheckCircle, RefreshCw, ListOrdered, CalendarDays, CreditCard, MessageSquare, Clock } from 'lucide-react'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { JO_STATUS_COLORS, ORDER_STATUS_COLORS, cn, formatCurrency, formatDateTime } from '@/lib/utils'
import OrderCard from './OrderCard'

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
  const fetchData = useCallback(async (silent = false) => {
    if (!profile) return
    if (!silent) setLoading(true)
    
    // Fetch regular orders
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('*, items:order_items(order_item_id,quantity,unit_price,item:item_id(name,image_url,category)), payments(payment_id,verified_at)')
      .eq('user_id', profile.user_id)
      .order('created_at',{ascending:false})
      .limit(50)
    
    if (orderError) console.error('[Orders] Error:', orderError)
    
    setOrders(orderData || [])
    
    // Fetch RISO job orders for teachers
    if (isTeacher) {
      const { data: jobs } = await supabase
        .from('job_orders')
        .select('*, riso_items:riso_job_items(*)')
        .eq('requester_id', profile.user_id)
        .eq('job_type', 'RISO')
        .order('created_at', { ascending: false })
        .limit(50)
      setRisoJobs(jobs || [])
    }
    
    setLoading(false)
  }, [profile, supabase, isTeacher])
  
  useRealtime({ tables:['orders','job_orders'], onRefresh:fetchData, enabled:!!profile })
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
                  {job.riso_job_items?.length || 0} subject(s)
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
                  {job.riso_job_items?.slice(0, 3).map((item, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>{item.subject}</span>
                      <span>{item.num_masters} master(s) × {item.copies_per_master} copies ({item.print_type === 'B_to_B' ? 'B to B' : '1 side'})</span>
                    </div>
                  ))}
                  {job.riso_job_items?.length > 3 && (
                    <p className="text-slate-400">+{job.riso_job_items.length - 3} more subject(s)</p>
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
                  {o.items?.length || 0} item(s) · {o.items?.slice(0,2).map(i => i.item?.name).join(', ')}
                  {o.items?.length > 2 && '...'}
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
          {orders.map(o => <OrderCard key={o.order_id} order={o} />)}
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
