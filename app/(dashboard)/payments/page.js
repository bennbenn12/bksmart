'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Badge, Pagination } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { PAYMENT_SOURCE_COLORS, formatCurrency, formatDateTime, cn } from '@/lib/utils'
import { CreditCard, Search, CheckCircle, Eye, Loader2, AlertTriangle, Plus, RefreshCw } from 'lucide-react'

export default function PaymentsPage() {
  const { profile } = useAuth()
  const toast = useToast()
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
  const PAGE = 12
  const supabase = createClient()

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('payments')
      .select('*, order:order_id(order_number,total_amount,user_id,user:user_id(first_name,last_name,student_id))', {count:'exact'})
      .order('date_paid',{ascending:false})
      .range((page-1)*PAGE, page*PAGE-1)
    if (sourceFilter) q = q.eq('payment_source', sourceFilter)
    if (search) q = q.ilike('or_number', `%${search}%`)
    const { data, count } = await q
    setPayments(data||[]); setTotal(count||0); setLoading(false)
  }, [sourceFilter, search, page])

  useRealtime({ tables:['payments','orders'], onRefresh:fetchPayments, enabled:!!profile })
  useEffect(() => { if (profile) fetchPayments() }, [profile, sourceFilter, search, page])

  async function loadPendingOrders() {
    const { data } = await supabase.from('orders').select('order_id,order_number,total_amount,user:user_id(first_name,last_name)').in('status',['Pending','Ready']).order('created_at',{ascending:false}).limit(30)
    setPending(data||[])
  }

  async function recordPayment() {
    if (!form.order_id) { toast('Please select an order.','warning'); return }
    if (!form.amount || isNaN(parseFloat(form.amount))) { toast('Enter a valid amount.','warning'); return }
    const amount = parseFloat(form.amount)
    if (form.payment_source==='Teller' && !form.or_number.trim()) { toast('OR number is required for Teller payments.','warning'); return }
    setActing(true)
    try {
      await supabase.from('payments').insert({ order_id:form.order_id, amount, payment_source:form.payment_source, or_number:form.or_number||null, notes:form.notes||null, date_paid:new Date().toISOString(), verified_by:profile.user_id, verified_at:new Date().toISOString() })
      await supabase.from('orders').update({ status:'Ready' }).eq('order_id', form.order_id)
      toast('Payment recorded. Order marked Ready.','success')
      setShowRecord(false); setForm({order_id:'',amount:'',payment_source:'Bookstore',or_number:'',notes:''})
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  const srcBadge = (s) => <span className={cn('badge', PAYMENT_SOURCE_COLORS[s]||'bg-slate-100')}>{s}</span>

  return (
    <div className="page-enter">
      <Header title="Payments" />
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot" /> Live — updates automatically
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search OR number..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} />
          </div>
          <select className="input w-36" value={sourceFilter} onChange={e=>{setSrc(e.target.value);setPage(1)}}>
            <option value="">All Sources</option>
            <option value="Bookstore">Bookstore</option>
            <option value="Teller">Teller</option>
          </select>
          <button onClick={fetchPayments} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
          <button onClick={()=>{ setShowRecord(true); loadPendingOrders() }} className="btn-primary ml-auto"><Plus size={14}/> Record Payment</button>
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
                    <td className="td"><div className="font-medium text-slate-700">{p.order?.user?.first_name} {p.order?.user?.last_name}</div><div className="text-xs text-slate-400">{p.order?.user?.student_id}</div></td>
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

      <Modal open={showRecord} onClose={()=>setShowRecord(false)} title="Record Payment" size="md">
        <div className="space-y-4">
          <div>
            <label className="label">Order</label>
            <select className="input" value={form.order_id} onChange={e=>{const o=pendingOrders.find(x=>x.order_id===e.target.value); setForm(f=>({...f,order_id:e.target.value,amount:o?String(o.total_amount):''}))}} >
              <option value="">— Select Order —</option>
              {pendingOrders.map(o=><option key={o.order_id} value={o.order_id}>{o.order_number} — {o.user?.first_name} {o.user?.last_name} — ₱{o.total_amount}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Amount (₱)</label><input className="input" type="number" step="0.01" placeholder="0.00" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/></div>
            <div><label className="label">Payment Source</label>
              <select className="input" value={form.payment_source} onChange={e=>setForm(f=>({...f,payment_source:e.target.value}))}>
                <option value="Bookstore">Bookstore (below ₱100)</option>
                <option value="Teller">Teller (₱100+)</option>
              </select>
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
