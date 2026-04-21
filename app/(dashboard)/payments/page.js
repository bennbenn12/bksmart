'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Badge, Pagination } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { PAYMENT_SOURCE_COLORS, formatCurrency, formatDateTime, cn } from '@/lib/utils'
import { CreditCard, Search, CheckCircle, Eye, Loader2, AlertTriangle, Plus, RefreshCw, Package, ArrowRight } from 'lucide-react'
import { sendPaymentEmail } from '@/app/actions/email'

export default function PaymentsPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const [payments, setPayments]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [sourceFilter, setSrc]      = useState('')
  const [page, setPage]             = useState(1)
  const [total, setTotal]           = useState(0)
  const [showRecord, setShowRecord] = useState(false)
  const [acting, setActing]         = useState(false)
  const [form, setForm]             = useState({ order_id:'', amount:'', payment_source:'Bookstore', or_number:'', notes:'' })
  const [pendingOrders, setPending] = useState([])
  const [preSelectedOrder, setPreSelectedOrder] = useState(null)
  const PAGE = 12
  const supabase = createClient()
  const searchParams = useSearchParams()
  const preSelectedOrderId = searchParams.get('orderId')

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/mysql/payments?search=${encodeURIComponent(search)}&source=${encodeURIComponent(sourceFilter)}&page=${page}&limit=${PAGE}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setPayments(json.data || [])
      setTotal(json.count || 0)
    } catch(e) {
      toast(e.message, 'error')
    } finally {
      setLoading(false)
    }
  }, [sourceFilter, search, page])

  useRealtime({ tables:['payments','orders'], onRefresh:fetchPayments, enabled:!!profile })
  useEffect(() => { if (profile) fetchPayments() }, [profile, sourceFilter, search, page])

  // Auto-open payment modal if orderId is in URL
  useEffect(() => {
    if (preSelectedOrderId && profile) {
      setShowRecord(true)
      loadPendingOrders()
    }
  }, [preSelectedOrderId, profile])

  async function loadPendingOrders() {
    const { data } = await supabase.from('orders').select('order_id,order_number,total_amount,user:user_id(first_name,last_name)').in('status',['Pending','Ready']).order('created_at',{ascending:false}).limit(30)
    setPending(data||[])
    // If preSelectedOrderId exists, find and set that order
    if (preSelectedOrderId && data) {
      const matched = data.find(o => o.order_id === preSelectedOrderId)
      if (matched) {
        setPreSelectedOrder(matched)
        // Auto-fill the form
        setForm({
          order_id: matched.order_id,
          amount: String(matched.total_amount),
          payment_source: matched.total_amount >= 100 ? 'Teller' : 'Bookstore',
          or_number: '',
          notes: ''
        })
      }
    }
  }

  async function recordPayment() {
    if (!form.order_id) { toast('Please select an order.','warning'); return }
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast('Enter a valid amount.','warning'); return }
    const amount = parseFloat(form.amount)
    if (form.payment_source==='Teller' && !form.or_number.trim()) { toast('OR number is required for Teller payments.','warning'); return }
    setActing(true)
    try {
      await supabase.from('payments').insert({ order_id:form.order_id, amount, payment_source:form.payment_source, or_number:form.or_number||null, notes:form.notes||null, date_paid:new Date().toISOString(), verified_by:profile.user_id, verified_at:new Date().toISOString() })

      // Notify the customer (in-app notification)
      const order = pendingOrders.find(o=>o.order_id===form.order_id)
      if (order) {
        await supabase.from('notifications').insert({ user_id:order.user_id, title:'Payment Verified', message:`Payment of ₱${amount.toFixed(2)} has been verified for your order #${order.order_number}. Staff will prepare your order shortly.`, type:'success', reference_type:'order', reference_id:order.order_id })
        
        // Send email notification
        try {
          await sendPaymentEmail({
            type: 'PAYMENT_VERIFIED',
            user: order.user,
            order,
            amount
          })
        } catch (emailError) {
          console.error('Failed to send payment verification email:', emailError)
        }
      }

      toast('Payment recorded and verified.','success')
      setShowRecord(false); setForm({order_id:'',amount:'',payment_source:'Bookstore',or_number:'',notes:''})
      await fetchPayments() // Immediate client-side refresh
      router.refresh() // Server-side refresh
      // Redirect to orders page with the order highlighted for release
      router.push(`/orders?highlight=${form.order_id}&action=release`)
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  const srcBadge = (s) => <span className={cn('badge', PAYMENT_SOURCE_COLORS[s]||'bg-slate-100')}>{s}</span>

  return (
    <div className="page-enter h-[100vh]">
      <Header title="Payments" />
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search OR #, name, or item..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
          </div>
          <select className="input w-36" value={sourceFilter} onChange={e=>{setSrc(e.target.value);setPage(1)}}>
            <option value="">All Sources</option>
            <option value="Bookstore">Bookstore</option>
            <option value="Teller">Teller</option>
          </select>
          <button onClick={fetchPayments} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
          <button onClick={()=>{ setShowRecord(true); loadPendingOrders() }} className="btn-primary ml-auto">
            {preSelectedOrderId ? <><Package size={14}/> Record Payment for Order</> : <><Plus size={14}/> Record Payment</>}
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="th">Order #</th><th className="th">Student</th><th className="th">Amount</th>
                  <th className="th">Source</th><th className="th">OR Number</th><th className="th">Date</th><th className="th">Verified</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={7} className="py-12"><LoadingSpinner/></td></tr>
                : payments.length === 0 ? <tr><td colSpan={7}><EmptyState icon={CreditCard} title="No payments found"/></td></tr>
                : payments.map(p=>(
                  <tr key={p.payment_id} className="hover:bg-slate-50">
                    <td className="td font-mono text-xs text-brand-700 font-bold">{p.order?.order_number}</td>
                    <td className="td">
                      <div className="font-medium text-slate-700">{p.order?.user?.first_name} {p.order?.user?.last_name}</div>
                      <div className="text-xs text-slate-400">{p.order?.user?.id_number}</div>
                      {p.order?.items_ordered && <div className="text-[10px] text-slate-500 mt-0.5 max-w-[200px] truncate" title={p.order.items_ordered}>{p.order.items_ordered}</div>}
                    </td>
                    <td className="td font-bold">{formatCurrency(p.amount)}</td>
                    <td className="td">{srcBadge(p.payment_source)}</td>
                    <td className="td font-mono text-xs">{p.or_number||'—'}</td>
                    <td className="td text-xs text-slate-400">{formatDateTime(p.date_paid)}</td>
                    <td className="td">{p.verified_at ? <span className="text-green-600 flex items-center gap-1 text-xs"><CheckCircle size={11}/>Verified</span> : <span className="text-yellow-600 text-xs">Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={PAGE} onPageChange={setPage}/>
        </div>
      </div>

      <Modal open={showRecord} onClose={()=>setShowRecord(false)} title={preSelectedOrder ? `Record Payment - ${preSelectedOrder.order_number}` : "Record Payment"} size="md">
        <div className="space-y-4">
          {preSelectedOrder ? (
            <div className="p-3 bg-brand-50 border border-brand-100 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Package size={14} className="text-brand-600"/>
                <span className="font-semibold text-brand-800">{preSelectedOrder.order_number}</span>
              </div>
              <div className="text-sm text-brand-700">
                {preSelectedOrder.user?.first_name} {preSelectedOrder.user?.last_name} · {formatCurrency(preSelectedOrder.total_amount)}
              </div>
              <button onClick={()=>{setPreSelectedOrder(null); setForm({order_id:'',amount:'',payment_source:'Bookstore',or_number:'',notes:''})}} className="text-xs text-brand-600 underline mt-2">Change order</button>
            </div>
          ) : (
            <div>
              <label className="label">Order</label>
              <select className="input" value={form.order_id} onChange={e=>{const o=pendingOrders.find(x=>x.order_id===e.target.value); setForm(f=>({...f,order_id:e.target.value,amount:o?String(o.total_amount):'',payment_source:o?(o.total_amount>=100?'Teller':'Bookstore'):f.payment_source}))}} >
                <option value="">— Select Order —</option>
                {pendingOrders.map(o=><option key={o.order_id} value={o.order_id}>{o.order_number} — {o.user?.first_name} {o.user?.last_name} — ₱{o.total_amount}</option>)}
              </select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount (₱)</label><input className="input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
            <div><label className="label">Payment Source</label>
              <div className={cn('input flex items-center font-bold cursor-default', form.payment_source==='Teller'?'text-orange-700 bg-orange-50':'text-green-700 bg-green-50')}>{form.payment_source==='Teller'?'Teller (₱100+)':'Bookstore (below ₱100)'}</div>
            </div>
          </div>
          {form.payment_source==='Teller' && (
            <div><label className="label">OR Number <span className="text-red-500">*</span></label><input className="input" placeholder="Official Receipt #" value={form.or_number} onChange={e=>setForm(f=>({...f,or_number:e.target.value}))}/></div>
          )}
          {form.payment_source==='Bookstore' && <Alert type="info" message="Below ₱100 — Student pays directly at the Bookstore counter."/>}
          {form.payment_source==='Teller' && <Alert type="warning" message="₱100+ — Must present Official Receipt from the school Teller."/>}
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={()=>setShowRecord(false)} className="btn-secondary">Cancel</button>
            <button onClick={recordPayment} disabled={acting} className="btn-primary">{acting?<Loader2 size={14} className="animate-spin"/>:'Record Payment'}</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
