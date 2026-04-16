'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Badge, Pagination, ConfirmDialog } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { ORDER_STATUS_COLORS, formatCurrency, formatDateTime, CATEGORIES, SHOPS, shopLabel, cn, needsSize, CLOTHING_SIZES } from '@/lib/utils'
import { ShoppingCart, Plus, Search, Eye, CheckCircle, Package, Trash2, Minus, Loader2, X, RefreshCw, Hash, Copy, CreditCard, AlertTriangle, CheckSquare, Square } from 'lucide-react'
import Link from 'next/link'
import { sendOrderStatusEmail } from '@/app/actions/email'

const STATUSES = ['Pending','Ready','Released','Cancelled']

export default function OrdersPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [orders, setOrders]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [viewOrder, setViewOrder]   = useState(null)
  const [acting, setActing]         = useState(false)
  const [cancelTarget, setCancelTarget] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [selectedOrders, setSelectedOrders] = useState([])
  const [bulkAction, setBulkAction] = useState('')
  const [showBulkModal, setShowBulkModal] = useState(false)
  const PAGE = 10
  const supabase = createClient()
  const isStaff = ['bookstore_manager','bookstore_staff','working_student'].includes(profile?.role_type)
  const searchParams = useSearchParams()
  const highlightOrderId = searchParams.get('highlight')
  const action = searchParams.get('action')

  // Handle highlight and auto-open order for release after payment
  useEffect(() => {
    if (highlightOrderId && orders.length > 0) {
      const order = orders.find(o => o.order_id === highlightOrderId)
      if (order) {
        setViewOrder(order)
        // Scroll to the order in the list
        setTimeout(() => {
          const element = document.getElementById(`order-${highlightOrderId}`)
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }, 100)
      }
    }
  }, [highlightOrderId, orders])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('orders')
      .select('*, user:user_id(first_name,last_name,id_number), items:order_items(order_item_id,quantity,unit_price,item:item_id(name,category,image_url)), payments:payments(payment_id,verified_at,amount)', {count:'exact'})
      .order('created_at',{ascending:false})
      .range((page-1)*PAGE, page*PAGE-1)
    if (!isStaff) q = q.eq('user_id', profile.id_number)
    if (statusFilter) q = q.eq('status', statusFilter)
    if (search) q = q.ilike('order_number', `%${search}%`)
    const { data, count } = await q
    setOrders(data||[]); setTotal(count||0); setLoading(false)
  }, [profile, isStaff, statusFilter, search, page])

  useRealtime({ tables:['orders','order_items'], onRefresh:fetchOrders, enabled:!!profile })
  useEffect(() => { if (profile) fetchOrders() }, [profile, statusFilter, search, page])

  const isPaid = (o) => o?.payments?.some(p => p.verified_at) || false

  function openCancelModal(orderId) {
    setCancelTarget(orderId)
    setCancelReason('')
  }

  async function updateStatus(id, status, reason) {
    setActing(true)
    try {
      if (status === 'Released') {
        const { data: pmts } = await supabase.from('payments').select('payment_id,verified_at').eq('order_id', id)
        if (!pmts?.some(p => p.verified_at)) {
          toast('Cannot release — no verified payment found. Please record payment first.', 'error')
          setActing(false)
          return
        }
      }
      const updates = { status, ...(status==='Released'?{released_at:new Date().toISOString(), processed_by:profile.id_number}:{}), ...(status==='Cancelled' && reason ? { notes: reason } : {}) }
      await supabase.from('orders').update(updates).eq('order_id', id)

      // On release: deduct actual stock and release reserved quantity
      if (status === 'Released') {
        const { data: orderItems } = await supabase.from('order_items').select('item_id, quantity').eq('order_id', id)
        if (orderItems?.length) {
          for (const oi of orderItems) {
            const { data: cur } = await supabase.from('bookstore_items').select('stock_quantity, reserved_quantity').eq('item_id', oi.item_id).single()
            if (cur) {
              await supabase.from('bookstore_items').update({
                stock_quantity: Math.max(0, cur.stock_quantity - oi.quantity),
                reserved_quantity: Math.max(0, cur.reserved_quantity - oi.quantity),
              }).eq('item_id', oi.item_id)
            }
          }
        }
        // Complete any connected appointments and notify user
        const { data: linkedAppts } = await supabase.from('appointments').select('appointment_id,user_id,schedule_date').eq('order_id', id).in('status', ['Pending','Confirmed'])
        if (linkedAppts?.length) {
          for (const appt of linkedAppts) {
            await supabase.from('appointments').update({
              status: 'Completed',
              notes: 'Order released - items claimed',
              completed_at: new Date().toISOString()
            }).eq('appointment_id', appt.appointment_id)
            // Notify user
            await supabase.from('notifications').insert({
              user_id: appt.user_id,
              title: 'Appointment Completed',
              message: `Your appointment on ${appt.schedule_date} was completed because your order was claimed/released. No need to come for pickup.`,
              type: 'success',
              reference_type: 'appointment',
              reference_id: appt.appointment_id
            })
          }
        }
      }

      // On cancel: release reserved stock
      if (status === 'Cancelled') {
        const { data: orderItems } = await supabase.from('order_items').select('item_id, quantity').eq('order_id', id)
        if (orderItems?.length) {
          for (const oi of orderItems) {
            const { data: cur } = await supabase.from('bookstore_items').select('reserved_quantity').eq('item_id', oi.item_id).single()
            if (cur) {
              await supabase.from('bookstore_items').update({
                reserved_quantity: Math.max(0, cur.reserved_quantity - oi.quantity),
              }).eq('item_id', oi.item_id)
            }
          }
        }
      }

      // Notify the customer
      const order = orders.find(o => o.order_id === id) || viewOrder
      if (order) {
        const cancelMsg = reason ? `Your order #${order.order_number} has been cancelled. Reason: ${reason}` : `Your order #${order.order_number} has been cancelled.`
        const notifMap = {
          Ready:     { title:'Order Ready for Pickup', message:`Your order #${order.order_number} is ready! Please visit the Bookstore or join the queue to pick up your items.`, type:'success' },
          Released:  { title:'Order Completed',   message:`Your order #${order.order_number} has been released. Thank you for shopping at BookSmart!`, type:'success' },
          Cancelled: { title:'Order Cancelled',  message:cancelMsg, type:'alert' },
        }
        const n = notifMap[status]
        if (n) {
          await supabase.from('notifications').insert({ user_id:order.user_id, title:n.title, message:n.message, type:n.type, reference_type:'order', reference_id:order.order_id })
        }
      }

      // Send email notifications for status changes
      if (order && order.user) {
        try {
          if (status === 'Ready') {
            await fetch('/api/email/order-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'ORDER_READY',
                user: order.user,
                order
              })
            })
          } else if (status === 'Released') {
            await fetch('/api/email/order-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'ORDER_RELEASED',
                user: order.user,
                order
              })
            })
          } else if (status === 'Cancelled') {
            await fetch('/api/email/order-status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'ORDER_CANCELLED',
                user: order.user,
                order,
                reason
              })
            })
          }
        } catch (emailError) {
          console.error('Failed to send email:', emailError)
          // Don't block the flow if email fails
        }
      }

      toast(`Order marked as ${status}`, 'success')
      if (viewOrder?.order_id === id) setViewOrder(o => ({...o, status, ...(reason ? { notes: reason } : {})}))
      setCancelTarget(null)
      fetchOrders()
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  async function generateRefNumber(order) {
    setActing(true)
    try {
      const prefix = 'TXN'
      const datePart = new Date().toISOString().slice(2,10).replace(/-/g,'')
      const rand = Math.random().toString(36).substring(2,8).toUpperCase()
      const refNumber = `${prefix}-${datePart}-${rand}`
      await supabase.from('orders').update({ transaction_id: refNumber }).eq('order_id', order.order_id)
      toast(`Reference # generated: ${refNumber}`, 'success')
      setViewOrder(o => o ? {...o, transaction_id: refNumber} : o)
      fetchOrders()
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  function copyRef(ref) {
    navigator.clipboard.writeText(ref)
    toast('Reference # copied to clipboard.', 'success')
  }

  // Bulk operations
  function toggleOrderSelection(orderId) {
    setSelectedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId)
        : [...prev, orderId]
    )
  }

  function selectAllOrders() {
    const allOrderIds = orders.map(o => o.order_id)
    setSelectedOrders(allOrderIds)
  }

  async function executeBulkAction() {
    if (!bulkAction || selectedOrders.length === 0) return
    
    setActing(true)
    setShowBulkModal(false)
    
    try {
      let successCount = 0
      
      for (const orderId of selectedOrders) {
        try {
          await updateStatus(orderId, bulkAction)
          successCount++
        } catch (error) {
          console.error(`Failed to update order ${orderId}:`, error)
        }
      }
      
      toast(`Updated ${successCount} of ${selectedOrders.length} orders to ${bulkAction}`, 'success')
      setSelectedOrders([])
      setBulkAction('')
    } catch (error) {
      toast('Bulk operation failed', 'error')
    } finally {
      setActing(false)
    }
  }

  const statusBadge = (s) => {
    const cls = ORDER_STATUS_COLORS[s] || 'bg-slate-100 text-slate-600'
    return <span className={cn('badge', cls)}>{s}</span>
  }

  return (
    <div className="page-enter h-[100vh]">
      <Header title="Orders" />
      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search order #..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
          </div>
          <select className="input w-36" value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1)}}>
            <option value="">All Status</option>
            {STATUSES.map(s=><option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={fetchOrders} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
          {isStaff && <button onClick={()=>setShowCreate(true)} className="btn-primary ml-auto"><Plus size={14}/> New Order</button>}
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 flex-wrap">
          {['',  ...STATUSES].map(s => (
            <button key={s} onClick={()=>{setStatus(s);setPage(1)}}
              className={cn('px-3 py-1 rounded-full text-xs font-bold border transition-all', statusFilter===s?'bg-brand-600 text-white border-brand-600':'bg-white text-slate-500 border-slate-200 hover:border-brand-300')}>
              {s||'All'}
            </button>
          ))}
        </div>

        {/* Bulk Operations Bar */}
        {isStaff && selectedOrders.length > 0 && (
          <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
            <span className="text-sm font-semibold text-yellow-800">
              {selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex-1" />
            <select 
              className="input w-40 text-sm" 
              value={bulkAction} 
              onChange={(e) => setBulkAction(e.target.value)}
            >
              <option value="">Bulk Action...</option>
              <option value="Ready">Mark as Ready</option>
              <option value="Released">Release Orders</option>
            </select>
            <button 
              onClick={() => setShowBulkModal(true)}
              disabled={!bulkAction}
              className="btn-primary text-sm disabled:opacity-50"
            >
              Apply
            </button>
            <button 
              onClick={() => setSelectedOrders([])}
              className="btn-ghost text-sm"
            >
              Clear
            </button>
          </div>
        )}

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  {isStaff && (
                    <th className="th w-8">
                      <button 
                        onClick={selectAllOrders}
                        className="p-1 hover:bg-slate-200 rounded"
                        title="Select all"
                      >
                        <CheckSquare size={14} />
                      </button>
                    </th>
                  )}
                  <th className="th">Order #</th>
                  {isStaff && <th className="th">Customer</th>}
                  <th className="th">Items</th>
                  <th className="th">Total</th>
                  <th className="th">Status</th>
                  <th className="th">Date</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  <tr><td colSpan={isStaff ? 8 : 7} className="py-12"><LoadingSpinner /></td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={isStaff ? 8 : 7}><EmptyState icon={ShoppingCart} title="No orders found" description="Try adjusting your filters." /></td></tr>
                ) : orders.map(o => (
                  <tr 
                    key={o.order_id} 
                    id={`order-${o.order_id}`}
                    className={cn(
                      'hover:bg-slate-50 transition-colors',
                      highlightOrderId === o.order_id && 'bg-yellow-50 ring-2 ring-yellow-400 ring-inset',
                      selectedOrders.includes(o.order_id) && 'bg-blue-50'
                    )}
                  >
                    {isStaff && (
                      <td className="td w-8">
                        <button
                          onClick={() => toggleOrderSelection(o.order_id)}
                          className="p-1 hover:bg-slate-200 rounded"
                        >
                          {selectedOrders.includes(o.order_id) ? (
                            <CheckSquare size={14} className="text-brand-600" />
                          ) : (
                            <Square size={14} className="text-slate-400" />
                          )}
                        </button>
                      </td>
                    )}
                    <td className="td font-mono font-bold text-brand-700 text-xs">{o.order_number}</td>
                    {isStaff && <td className="td"><div className="font-medium text-slate-700">{o.user?.first_name} {o.user?.last_name}</div><div className="text-xs font-mono text-brand-600">{o.user?.id_number || '—'}</div></td>}
                    <td className="td text-xs text-slate-500">{o.items?.length || 0} item(s)</td>
                    <td className="td font-bold text-slate-700">{formatCurrency(o.total_amount)}</td>
                    <td className="td">{statusBadge(o.status)}{o.status==='Cancelled' && o.notes && <p className="text-[10px] text-red-400 mt-0.5 max-w-[160px] truncate" title={o.notes}>Reason: {o.notes}</p>}</td>
                    <td className="td text-xs text-slate-400">{formatDateTime(o.created_at)}</td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={()=>setViewOrder(o)} className="btn-ghost p-1.5 text-xs"><Eye size={13}/></button>
                        {isStaff && o.status==='Pending' && <button disabled={acting} onClick={()=>updateStatus(o.order_id,'Ready')} className="btn-primary py-1 px-2 text-xs">Mark Ready</button>}
                        {isStaff && o.status==='Ready' && isPaid(o) && <button disabled={acting} onClick={()=>updateStatus(o.order_id,'Released')} className="btn-primary py-1 px-2 text-xs bg-green-600 hover:bg-green-700">Release</button>}
                        {isStaff && o.status==='Ready' && !isPaid(o) && <Link href={`/payments?orderId=${o.order_id}`} className="btn-primary py-1 px-2 text-xs bg-orange-500 hover:bg-orange-600 inline-flex items-center gap-1"><CreditCard size={11}/> Record Payment</Link>}
                        {isStaff && (o.status==='Pending'||o.status==='Ready') && <button disabled={acting} onClick={()=>openCancelModal(o.order_id)} className="btn-ghost py-1 px-2 text-xs text-red-500">Cancel</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={PAGE} onPageChange={setPage} />
        </div>
      </div>

      {/* Create Order Modal */}
      {showCreate && <CreateOrderModal onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);fetchOrders()}} />}

      {/* Cancel Reason Modal */}
      {cancelTarget && (
        <Modal open={true} onClose={()=>setCancelTarget(null)} title="Cancel Order" size="md">
          <div className="space-y-4">
            <p className="text-sm text-slate-600">Are you sure you want to cancel this order?</p>
            <div>
              <label className="label">Reason (optional)</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {['Out of stock','Customer request','Duplicate order','Payment issue','Policy violation'].map(r=>(
                  <button key={r} type="button" onClick={()=>setCancelReason(cancelReason===r?'':r)}
                    className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', cancelReason===r ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300')}>
                    {r}
                  </button>
                ))}
              </div>
              <input className="input text-sm" placeholder="Or type a custom reason..." value={['Out of stock','Customer request','Duplicate order','Payment issue','Policy violation'].includes(cancelReason)?'':cancelReason} onChange={e=>setCancelReason(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={()=>setCancelTarget(null)} className="btn-secondary">Keep Order</button>
              <button disabled={acting} onClick={()=>updateStatus(cancelTarget,'Cancelled',cancelReason)} className="btn-danger flex items-center gap-1.5">
                {acting ? <Loader2 size={14} className="animate-spin"/> : <X size={14}/>} Confirm Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* View Order Modal */}
      {viewOrder && (
        <Modal open={!!viewOrder} onClose={()=>setViewOrder(null)} title={`Order ${viewOrder.order_number}`} size="lg">
          <div className="space-y-4">
            {/* Ready to Release Banner - shown when coming from payment */}
            {action === 'release' && viewOrder.status === 'Ready' && isPaid(viewOrder) && (
              <div className="p-4 bg-green-100 border border-green-300 rounded-xl flex items-center gap-3">
                <div className="p-2 bg-green-200 rounded-full"><CheckCircle size={20} className="text-green-700"/></div>
                <div className="flex-1">
                  <p className="font-bold text-green-800">Payment Verified - Ready to Release!</p>
                  <p className="text-sm text-green-700">This order has been paid and is ready for pickup. Click "Release Order" below to complete.</p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-3 flex-wrap">
              {statusBadge(viewOrder.status)}
              <span className="text-xs text-slate-400">{formatDateTime(viewOrder.created_at)}</span>
              {isStaff && <span className="text-xs text-slate-500">{viewOrder.user?.first_name} {viewOrder.user?.last_name} · <span className="font-mono font-bold text-brand-600">{viewOrder.user?.id_number || '—'}</span></span>}
            </div>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="th">Item</th><th className="th">Size</th><th className="th text-right">Qty</th><th className="th text-right">Price</th><th className="th text-right">Sub</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {viewOrder.items?.map(it=>(
                    <tr key={it.order_item_id}>
                      <td className="td">{it.item?.name}</td>
                      <td className="td text-xs">{it.size || '—'}</td>
                      <td className="td text-right">{it.quantity}</td>
                      <td className="td text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="td text-right font-bold">{formatCurrency(it.unit_price*it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-100">
                  <tr><td colSpan={4} className="td text-right font-bold">Total</td><td className="td text-right font-black text-brand-700 text-base">{formatCurrency(viewOrder.total_amount)}</td></tr>
                </tfoot>
              </table>
            </div>
            {/* Transaction Reference Number */}
            {viewOrder.transaction_id ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                <Hash size={14} className="text-green-600"/>
                <span className="text-sm font-bold text-green-700">Ref #: {viewOrder.transaction_id}</span>
                <button onClick={()=>copyRef(viewOrder.transaction_id)} className="ml-auto btn-ghost p-1 text-green-600 hover:text-green-800"><Copy size={13}/></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <Hash size={14} className="text-slate-400"/>
                <span className="text-sm text-slate-500">No transaction reference yet.</span>
                <button disabled={acting} onClick={()=>generateRefNumber(viewOrder)} className="ml-auto btn-secondary text-xs gap-1"><Hash size={12}/> Generate Ref #</button>
              </div>
            )}

            {/* Quick Record Payment Button in Order Details */}
            {isStaff && viewOrder.status==='Ready' && !isPaid(viewOrder) && (
              <Link href={`/payments?orderId=${viewOrder.order_id}`} className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors">
                <CreditCard size={16} className="text-orange-600"/>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-orange-700">Ready to Pay</p>
                  <p className="text-xs text-orange-600">Click to record payment for this order</p>
                </div>
                <span className="btn-primary py-1.5 px-3 text-xs bg-orange-500">Record Payment →</span>
              </Link>
            )}

            {/* Payment Status */}
            {isPaid(viewOrder) ? (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-100 rounded-xl">
                <CheckCircle size={14} className="text-green-600"/>
                <span className="text-sm font-bold text-green-700">Payment Verified</span>
                <span className="ml-auto text-sm font-bold text-green-700">{formatCurrency(viewOrder.payments.reduce((s,p)=>s+parseFloat(p.amount||0),0))}</span>
              </div>
            ) : (viewOrder.status !== 'Cancelled' && viewOrder.status !== 'Released') && (
              <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
                <AlertTriangle size={14} className="text-orange-600"/>
                <span className="text-sm font-bold text-orange-700">Not yet paid</span>
                {isStaff && <Link href="/payments" className="ml-auto btn-primary py-1.5 px-3 text-xs bg-orange-500 hover:bg-orange-600 inline-flex items-center gap-1"><CreditCard size={12}/> Record Payment</Link>}
              </div>
            )}

            {viewOrder.status==='Cancelled' && viewOrder.notes && (
              <div className="flex items-start gap-2.5 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0"/>
                <div>
                  <p className="text-sm font-bold text-red-700">Cancellation Reason</p>
                  <p className="text-sm text-red-600 mt-0.5">{viewOrder.notes}</p>
                </div>
              </div>
            )}
            {viewOrder.total_amount >= 100 && viewOrder.status==='Pending' && (
              <Alert type="warning" message="This order is ₱100+. Student must pay at the school Teller and provide OR number before release." />
            )}
            {viewOrder.total_amount < 100 && viewOrder.status==='Pending' && (
              <Alert type="info" message="Below ₱100 — Student can pay directly at the Bookstore counter." />
            )}
            {isStaff && (
              <div className="flex gap-2 justify-end pt-2">
                {viewOrder.status==='Pending' && <button disabled={acting} onClick={()=>updateStatus(viewOrder.order_id,'Ready')} className="btn-primary">Mark Ready</button>}
                {viewOrder.status==='Ready' && isPaid(viewOrder) && <button disabled={acting} onClick={()=>updateStatus(viewOrder.order_id,'Released')} className="btn-primary bg-green-600 hover:bg-green-700">Release Order</button>}
                {viewOrder.status==='Ready' && !isPaid(viewOrder) && <Link href={`/payments?orderId=${viewOrder.order_id}`} className="btn-primary bg-orange-500 hover:bg-orange-600 inline-flex items-center gap-1"><CreditCard size={14}/> Record Payment</Link>}
                {(viewOrder.status==='Pending'||viewOrder.status==='Ready') && <button disabled={acting} onClick={()=>{setViewOrder(null);openCancelModal(viewOrder.order_id)}} className="btn-danger">Cancel Order</button>}
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* Bulk Operations Modal */}
      {showBulkModal && (
        <Modal open={true} onClose={() => setShowBulkModal(false)} title="Confirm Bulk Action" size="md">
          <div className="space-y-4">
            <p className="text-slate-600">
              You are about to mark <strong>{selectedOrders.length} order{selectedOrders.length > 1 ? 's' : ''}</strong> as <strong>{bulkAction}</strong>.
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ This action cannot be undone. Please verify before proceeding.
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowBulkModal(false)} className="btn-secondary">Cancel</button>
              <button 
                onClick={executeBulkAction} 
                disabled={acting}
                className={cn(
                  'btn-primary',
                  bulkAction === 'Ready' && 'bg-brand-600',
                  bulkAction === 'Released' && 'bg-green-600'
                )}
              >
                {acting ? <Loader2 size={14} className="animate-spin" /> : `Confirm ${bulkAction}`}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function CreateOrderModal({ onClose, onCreated }) {
  const supabase = createClient()
  const toast = useToast()
  const { profile } = useAuth()
  const [saving, setSaving] = useState(false)

  // Student search
  const [studentSearch, setStudentSearch] = useState('')
  const [students, setStudents] = useState([])
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Items
  const [items, setItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(true)
  const [itemSearch, setItemSearch] = useState('')
  const [cart, setCart] = useState([])

  useEffect(() => {
    async function loadItems() {
      const { data } = await supabase.from('bookstore_items').select('item_id,name,price,stock_quantity,reserved_quantity,category,unit,sizes,image_url').eq('is_active', true).order('name')
      setItems(data || [])
      setLoadingItems(false)
    }
    loadItems()
  }, [])

  async function searchStudents(q) {
    setStudentSearch(q)
    if (q.length < 2) { setStudents([]); return }
    setLoadingStudents(true)
    const { data } = await supabase.from('users').select('id_number,first_name,last_name,role_type').ilike('id_number', `%${q}%`).limit(10)
    setStudents(data || [])
    setLoadingStudents(false)
  }

  const cKey = (c) => c.selectedSize ? `${c.item_id}_${c.selectedSize}` : c.item_id

  function addToCart(item, size) {
    const entry = size ? { ...item, selectedSize: size } : { ...item }
    setCart(prev => {
      const key = cKey(entry)
      const exists = prev.find(c => cKey(c) === key)
      if (exists) return prev.map(c => cKey(c) === key ? { ...c, quantity: c.quantity + 1 } : c)
      return [...prev, { ...entry, quantity: 1 }]
    })
  }

  function updateQty(key, qty) {
    if (qty < 1) return removeFromCart(key)
    setCart(prev => prev.map(c => cKey(c) === key ? { ...c, quantity: qty } : c))
  }

  function removeFromCart(key) {
    setCart(prev => prev.filter(c => cKey(c) !== key))
  }

  const cartTotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0)
  const availableStock = (item) => item.stock_quantity - (item.reserved_quantity || 0)
  const filteredItems = items.filter(i => i.name.toLowerCase().includes(itemSearch.toLowerCase()) && availableStock(i) > 0)

  async function submit() {
    if (!selectedStudent) return toast('Please select a student.', 'error')
    if (cart.length === 0) return toast('Please add at least one item.', 'error')
    setSaving(true)
    try {
      const { generateOrderNumber } = await import('@/lib/utils')
      const { data: order, error: orderErr } = await supabase.from('orders').insert({
        user_id: selectedStudent.id_number,
        total_amount: cartTotal,
        status: 'Pending',
        order_number: generateOrderNumber(),
      }).select('order_id,order_number').single()
      if (orderErr) throw orderErr

      const { error: itemsErr } = await supabase.from('order_items').insert(
        cart.map(c => ({ order_id: order.order_id, item_id: c.item_id, quantity: c.quantity, unit_price: c.price, ...(c.selectedSize ? { size: c.selectedSize } : {}) }))
      )
      if (itemsErr) throw itemsErr

      for (const c of cart) {
        const { error: rpcErr } = await supabase.rpc('increment_reserved', { p_item_id: c.item_id, p_qty: c.quantity })
        if (rpcErr) {
          const { data: cur } = await supabase.from('bookstore_items').select('reserved_quantity').eq('item_id', c.item_id).single()
          if (cur) await supabase.from('bookstore_items').update({ reserved_quantity: cur.reserved_quantity + c.quantity }).eq('item_id', c.item_id)
        }
      }

      // Notify the student
      await supabase.from('notifications').insert({ user_id:selectedStudent.id_number, title:'Order Placed', message:`Your order #${order.order_number} has been placed. Total: ₱${cartTotal.toFixed(2)}`, type:'info', reference_type:'order', reference_id:order.order_id })

      toast(`Order ${order.order_number} created!`, 'success')
      onCreated()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title="New Order" size="xl">
      <div className="space-y-5">
        {/* Student Search */}
        <div>
          <label className="label">Student</label>
          {selectedStudent ? (
            <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-100 rounded-xl">
              <div className="flex-1">
                <span className="font-bold text-slate-700">{selectedStudent.first_name} {selectedStudent.last_name}</span>
                <span className="ml-2 text-xs font-mono text-brand-600">{selectedStudent.id_number}</span>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="p-1 rounded hover:bg-brand-100 text-slate-400"><X size={14} /></button>
            </div>
          ) : (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search by ID number..." value={studentSearch} onChange={e => searchStudents(e.target.value)} />
              {students.length > 0 && (
                <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                  {students.map(s => (
                    <button key={s.id_number} onClick={() => { setSelectedStudent(s); setStudents([]); setStudentSearch('') }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm flex items-center gap-2">
                      <span className="font-medium">{s.first_name} {s.last_name}</span>
                      <span className="text-xs font-mono text-brand-600">{s.id_number}</span>
                    </button>
                  ))}
                </div>
              )}
              {loadingStudents && <div className="absolute right-3 top-1/2 -translate-y-1/2"><Loader2 size={14} className="animate-spin text-slate-400" /></div>}
            </div>
          )}
        </div>

        {/* Item Search & Add */}
        <div>
          <label className="label">Add Items</label>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search items..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
          </div>
          {loadingItems ? <LoadingSpinner /> : (
            <div className="mt-2 max-h-40 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
              {filteredItems.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-3">No items found</p>
              ) : filteredItems.slice(0, 20).map(item => (
                <div key={item.item_id} className="px-4 py-2 hover:bg-slate-50 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-slate-700">{item.name}</span>
                      <span className="ml-2 text-xs text-slate-400">{item.category} · {formatCurrency(item.price)} · Stock: {availableStock(item)}</span>
                    </div>
                    {!needsSize(item) && <button onClick={() => addToCart(item)} className="btn-ghost text-xs p-1"><Plus size={14} /></button>}
                  </div>
                  {needsSize(item) && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.sizes.split(',').map(s=>s.trim()).filter(Boolean).map(size => (
                        <button key={size} onClick={() => addToCart(item, size)} className="px-2 py-0.5 rounded-md text-[10px] font-bold border border-slate-200 hover:border-brand-500 hover:bg-brand-50 transition-all">{size}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart */}
        {cart.length > 0 && (
          <div>
            <label className="label">Order Items ({cart.length})</label>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="th">Item</th><th className="th">Size</th><th className="th text-center">Qty</th><th className="th text-right">Price</th><th className="th text-right">Sub</th><th className="th"></th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {cart.map(c => (
                    <tr key={cKey(c)}>
                      <td className="td font-medium text-slate-700">{c.name}</td>
                      <td className="td text-xs">{c.selectedSize || '—'}</td>
                      <td className="td text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => updateQty(cKey(c), c.quantity - 1)} className="p-0.5 rounded hover:bg-slate-100"><Minus size={12} /></button>
                          <span className="w-8 text-center font-bold">{c.quantity}</span>
                          <button onClick={() => updateQty(cKey(c), c.quantity + 1)} className="p-0.5 rounded hover:bg-slate-100"><Plus size={12} /></button>
                        </div>
                      </td>
                      <td className="td text-right">{formatCurrency(c.price)}</td>
                      <td className="td text-right font-bold">{formatCurrency(c.price * c.quantity)}</td>
                      <td className="td text-right"><button onClick={() => removeFromCart(cKey(c))} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={13} /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-100">
                  <tr><td colSpan={4} className="td text-right font-bold">Total</td><td className="td text-right font-black text-brand-700 text-base">{formatCurrency(cartTotal)}</td><td></td></tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving || cart.length === 0 || !selectedStudent} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <><ShoppingCart size={14} /> Place Order</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}
