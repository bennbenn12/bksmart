'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Badge, Pagination, ConfirmDialog } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { ORDER_STATUS_COLORS, formatCurrency, formatDateTime, CATEGORIES, SHOPS, shopLabel, cn } from '@/lib/utils'
import { ShoppingCart, Plus, Search, Eye, CheckCircle, Package, Trash2, Minus, Loader2, X, RefreshCw } from 'lucide-react'

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
  const PAGE = 10
  const supabase = createClient()
  const isStaff = ['bookstore_manager','bookstore_staff','working_student'].includes(profile?.role_id)

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('orders')
      .select('*, user:user_id(first_name,last_name,student_id), items:order_items(order_item_id,quantity,unit_price,item:item_id(name,category,image_url))', {count:'exact'})
      .order('created_at',{ascending:false})
      .range((page-1)*PAGE, page*PAGE-1)
    if (!isStaff) q = q.eq('user_id', profile.user_id)
    if (statusFilter) q = q.eq('status', statusFilter)
    if (search) q = q.ilike('order_number', `%${search}%`)
    const { data, count } = await q
    setOrders(data||[]); setTotal(count||0); setLoading(false)
  }, [profile, isStaff, statusFilter, search, page])

  useRealtime({ tables:['orders','order_items'], onRefresh:fetchOrders, enabled:!!profile })
  useEffect(() => { if (profile) fetchOrders() }, [profile, statusFilter, search, page])

  async function updateStatus(id, status) {
    setActing(true)
    try {
      await supabase.from('orders').update({ status, ...(status==='Released'?{released_at:new Date().toISOString(), processed_by:profile.user_id}:{}) }).eq('order_id', id)
      toast(`Order marked as ${status}`, 'success')
      if (viewOrder?.order_id === id) setViewOrder(o => ({...o, status}))
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  const statusBadge = (s) => {
    const cls = ORDER_STATUS_COLORS[s] || 'bg-slate-100 text-slate-600'
    return <span className={cn('badge', cls)}>{s}</span>
  }

  return (
    <div className="page-enter">
      <Header title="Orders" />
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot" /> Live — updates automatically
        </div>

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

        {/* Table */}
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
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
                  <tr><td colSpan={7} className="py-12"><LoadingSpinner /></td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7}><EmptyState icon={ShoppingCart} title="No orders found" description="Try adjusting your filters." /></td></tr>
                ) : orders.map(o => (
                  <tr key={o.order_id} className="hover:bg-slate-50 transition-colors">
                    <td className="td font-mono font-bold text-brand-700 text-xs">{o.order_number}</td>
                    {isStaff && <td className="td"><div className="font-medium text-slate-700">{o.user?.first_name} {o.user?.last_name}</div><div className="text-xs text-slate-400">{o.user?.student_id}</div></td>}
                    <td className="td text-xs text-slate-500">{o.items?.length || 0} item(s)</td>
                    <td className="td font-bold text-slate-700">{formatCurrency(o.total_amount)}</td>
                    <td className="td">{statusBadge(o.status)}</td>
                    <td className="td text-xs text-slate-400">{formatDateTime(o.created_at)}</td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={()=>setViewOrder(o)} className="btn-ghost p-1.5 text-xs"><Eye size={13}/></button>
                        {isStaff && o.status==='Pending' && <button disabled={acting} onClick={()=>updateStatus(o.order_id,'Ready')} className="btn-primary py-1 px-2 text-xs">Mark Ready</button>}
                        {isStaff && o.status==='Ready' && <button disabled={acting} onClick={()=>updateStatus(o.order_id,'Released')} className="btn-primary py-1 px-2 text-xs bg-green-600 hover:bg-green-700">Release</button>}
                        {isStaff && (o.status==='Pending'||o.status==='Ready') && <button disabled={acting} onClick={()=>updateStatus(o.order_id,'Cancelled')} className="btn-ghost py-1 px-2 text-xs text-red-500">Cancel</button>}
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

      {/* View Order Modal */}
      {viewOrder && (
        <Modal open={!!viewOrder} onClose={()=>setViewOrder(null)} title={`Order ${viewOrder.order_number}`} size="lg">
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              {statusBadge(viewOrder.status)}
              <span className="text-xs text-slate-400">{formatDateTime(viewOrder.created_at)}</span>
              {isStaff && <span className="text-xs text-slate-500">{viewOrder.user?.first_name} {viewOrder.user?.last_name} · {viewOrder.user?.student_id}</span>}
            </div>
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50"><tr><th className="th">Item</th><th className="th text-right">Qty</th><th className="th text-right">Price</th><th className="th text-right">Sub</th></tr></thead>
                <tbody className="divide-y divide-slate-50">
                  {viewOrder.items?.map(it=>(
                    <tr key={it.order_item_id}>
                      <td className="td">{it.item?.name}</td>
                      <td className="td text-right">{it.quantity}</td>
                      <td className="td text-right">{formatCurrency(it.unit_price)}</td>
                      <td className="td text-right font-bold">{formatCurrency(it.unit_price*it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-50 border-t border-slate-100">
                  <tr><td colSpan={3} className="td text-right font-bold">Total</td><td className="td text-right font-black text-brand-700 text-base">{formatCurrency(viewOrder.total_amount)}</td></tr>
                </tfoot>
              </table>
            </div>
            {viewOrder.total_amount >= 100 && viewOrder.status==='Pending' && (
              <Alert type="warning" message="This order is ₱100+. Student must pay at the school Teller and provide OR number before release." />
            )}
            {viewOrder.total_amount < 100 && viewOrder.status==='Pending' && (
              <Alert type="info" message="Below ₱100 — Student can pay directly at the Bookstore counter." />
            )}
            {isStaff && (
              <div className="flex gap-2 justify-end pt-2">
                {viewOrder.status==='Pending' && <button disabled={acting} onClick={()=>updateStatus(viewOrder.order_id,'Ready')} className="btn-primary">Mark Ready</button>}
                {viewOrder.status==='Ready' && <button disabled={acting} onClick={()=>updateStatus(viewOrder.order_id,'Released')} className="btn-primary bg-green-600 hover:bg-green-700">Release Order</button>}
                {(viewOrder.status==='Pending'||viewOrder.status==='Ready') && <button disabled={acting} onClick={()=>updateStatus(viewOrder.order_id,'Cancelled')} className="btn-danger">Cancel Order</button>}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
