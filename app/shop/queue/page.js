'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { formatDateTime, cn } from '@/lib/utils'
import { Users, Clock, CheckCircle, AlertCircle, Loader2, ListOrdered, XCircle, Package } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

const today = () => new Date().toISOString().split('T')[0]

export default function StudentQueuePage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [queue, setQueue]         = useState([])
  const [myQueue, setMyQueue]     = useState(null)
  const [loading, setLoading]     = useState(true)
  const [joining, setJoining]     = useState(false)
  const [orders, setOrders]       = useState([])
  const [selectedOrder, setOrder] = useState('')
  const [preSelectedOrder, setPreSelectedOrder] = useState(null)
  const [notes, setNotes]         = useState('')
  const supabase = createClient()
  const searchParams = useSearchParams()
  const preSelectedOrderId = searchParams.get('orderId')

  const fetchQueue = useCallback(async () => {
    const { data } = await supabase.from('queues')
      .select('queue_id,queue_number,status,user_id,created_at,notes')
      .eq('queue_date', today())
      .in('status',['Waiting','Processing'])
      .order('queue_number')
    const list = data || []
    setQueue(list)
    setMyQueue(list.find(q=>q.user_id===profile?.id_number)||null)
    setLoading(false)
  }, [profile])

  const fetchOrders = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('orders').select('order_id,order_number,status').eq('user_id',profile.id_number).in('status',['Pending','Ready']).order('created_at',{ascending:false})
    setOrders(data||[])
    // If preSelectedOrderId exists, find and set it
    if (preSelectedOrderId && data) {
      const matched = data.find(o => o.order_id === preSelectedOrderId)
      if (matched) {
        setPreSelectedOrder(matched)
        setOrder(preSelectedOrderId)
      }
    }
  }, [profile, preSelectedOrderId])

  useRealtime({ tables:[{ table:'queues', filter:`queue_date=eq.${today()}` }], onRefresh:fetchQueue, enabled:!!profile })
  useEffect(() => { if (profile) { fetchQueue(); fetchOrders() } }, [profile])

  // Alert when it's their turn
  useEffect(() => {
    if (myQueue?.status === 'Processing') {
      toast('🎉 It\'s your turn! Please proceed to the counter.', 'success', 8000)
    }
  }, [myQueue?.status])

  async function handleJoin() {
    setJoining(true)
    try {
      const { data: existing } = await supabase.from('queues').select('queue_id').eq('user_id',profile.id_number).eq('queue_date',today()).in('status',['Waiting','Processing'])
      if (existing?.length > 0) { toast('You are already in the queue.','warning'); setJoining(false); return }

      // Get next queue number for today
      const { data: maxRow } = await supabase.from('queues').select('queue_number').eq('queue_date',today()).order('queue_number',{ascending:false}).limit(1).single()
      const nextNumber = (maxRow?.queue_number || 0) + 1

      await supabase.from('queues').insert({ user_id:profile.id_number, order_id:selectedOrder||null, queue_number:nextNumber, status:'Waiting', queue_date:today(), notes:notes||'Walk-in service' })
      toast(`You joined the queue! Your number is #${String(nextNumber).padStart(3,'0')}`,'success')
      setOrder(''); setNotes('')
    } catch(e) { toast(e.message,'error') } finally { setJoining(false) }
  }

  async function handleLeave() {
    if (!myQueue) return
    setJoining(true)
    try {
      await supabase.from('queues').update({ status:'Completed', notes:'Cancelled by user' }).eq('queue_id',myQueue.queue_id)
      toast('You left the queue.','info')
    } catch(e) { toast(e.message,'error') } finally { setJoining(false) }
  }

  const processing = queue.find(q=>q.status==='Processing')
  const waiting    = queue.filter(q=>q.status==='Waiting').sort((a,b)=>a.queue_number-b.queue_number)
  const position   = myQueue ? waiting.findIndex(q=>q.queue_id===myQueue.queue_id)+1 : 0

  if (loading) return <div className="min-h-[50vh] flex items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={32}/></div>

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-display font-bold text-hnu-dark">Bookstore Queue</h1>
        <p className="text-slate-500 mt-2">Join the virtual line — no need to refresh!</p>
        <div className="flex items-center justify-center gap-2 mt-2 text-xs text-green-600 font-semibold">
          <span className="live-dot"/> Live updates active
        </div>
      </div>

      {/* Now Serving Board */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="bg-hnu-dark text-white p-6 text-center">
          <p className="text-sm uppercase tracking-widest text-white/70 mb-2 font-bold">Now Serving</p>
          {processing ? (
            <div className="num-flip" key={processing.queue_number}>
              <span className="text-6xl font-display font-bold">{String(processing.queue_number).padStart(3,'0')}</span>
              {processing.user_id===profile?.id_number && <p className="text-hnu-gold font-bold mt-2 text-lg">🎉 It's your turn! Please proceed to the counter.</p>}
            </div>
          ) : <p className="text-4xl font-display text-white/50 py-2">— — —</p>}
        </div>

        <div className="p-6 grid grid-cols-2 gap-6 text-center divide-x divide-slate-100">
          <div><p className="text-xs uppercase font-bold text-slate-400 mb-1">Waiting</p><p className="text-2xl font-bold text-slate-700">{waiting.length}</p></div>
          <div>
            <p className="text-xs uppercase font-bold text-slate-400 mb-1">Your Position</p>
            {myQueue ? (
              <div>
                <p className={cn('text-xl font-bold',myQueue.status==='Processing'?'text-green-600':'text-brand-600')}>#{String(myQueue.queue_number).padStart(3,'0')}</p>
                {myQueue.status==='Waiting' && <p className="text-xs text-slate-500 mt-0.5">{position===1?'You are next!':position>1?`${position-1} ahead`:''}</p>}
                {myQueue.status==='Processing' && <p className="text-xs text-green-600 mt-0.5 font-bold">Go to counter!</p>}
              </div>
            ) : <p className="text-sm text-slate-500 py-1">Not in queue</p>}
          </div>
        </div>
      </div>

      {/* Queue grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <h3 className="font-bold text-slate-700 mb-3 text-sm">Queue Board</h3>
        <div className="grid grid-cols-8 gap-2">
          {queue.map(q=>(
            <div key={q.queue_id} className={cn('aspect-square rounded-xl flex items-center justify-center text-sm font-bold border-2',
              q.status==='Processing'?'bg-hnu-dark text-white border-hnu-dark scale-105 shadow-md':
              q.user_id===profile?.id_number?'bg-yellow-100 text-yellow-700 border-yellow-400':
              'bg-slate-50 text-slate-500 border-slate-100')}>
              {String(q.queue_number).padStart(3,'0')}
            </div>
          ))}
          {queue.length===0 && <p className="col-span-8 text-center text-slate-400 text-sm py-4">Queue is empty today.</p>}
        </div>
      </div>

      {/* Join / Leave */}
      {!myQueue ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2"><ListOrdered className="text-brand-600"/> Join the Queue</h3>
          <div className="space-y-4">
            {orders.length > 0 ? (
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {preSelectedOrder ? 'Order for Pickup' : 'Select Order to Pickup'}
                </label>
                {preSelectedOrder ? (
                  <div className="p-3 bg-brand-50 border border-brand-100 rounded-lg flex items-center gap-2">
                    <Package size={16} className="text-brand-600"/>
                    <span className="text-sm font-medium text-brand-800">{preSelectedOrder.order_number}</span>
                    <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">{preSelectedOrder.status}</span>
                    <span className="text-xs text-brand-500 ml-auto">Pre-selected</span>
                  </div>
                ) : (
                  <select className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={selectedOrder} onChange={e=>setOrder(e.target.value)}>
                    <option value="">— Select an order (optional) —</option>
                    {orders.map(o=><option key={o.order_id} value={o.order_id}>{o.order_number} ({o.status})</option>)}
                  </select>
                )}
              </div>
            ) : <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">No pending orders. You can still join for inquiries.</div>}
            <div><label className="block text-sm font-semibold text-slate-700 mb-1">Purpose / Notes</label>
              <input type="text" placeholder="e.g. Picking up books, Inquiry about uniform..." className="w-full p-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" value={notes} onChange={e=>setNotes(e.target.value)}/>
            </div>
            <button onClick={handleJoin} disabled={joining} className="w-full btn-primary py-3 justify-center text-base font-bold shadow-lg shadow-brand-500/20">
              {joining ? <Loader2 className="animate-spin"/> : 'Get Queue Number'}
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={32}/></div>
          <h3 className="font-bold text-xl text-slate-800 mb-2">You're in line!</h3>
          <p className="text-slate-500 mb-2">Your number: <span className="font-black text-brand-700 text-xl">#{String(myQueue.queue_number).padStart(3,'0')}</span></p>
          <p className="text-xs text-slate-400 mb-6">This page updates automatically. No need to refresh.</p>
          <button onClick={handleLeave} disabled={joining} className="text-red-500 hover:text-red-700 text-sm font-medium underline">Leave Queue</button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 text-sm text-slate-500">
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="font-bold text-slate-700 mb-1 flex items-center gap-2"><Clock size={16}/> Opening Hours</p><p>Mon - Fri: 8:00 AM - 5:00 PM</p><p>Sat: 8:00 AM - 12:00 PM</p></div>
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100"><p className="font-bold text-slate-700 mb-1 flex items-center gap-2"><Users size={16}/> Estimated Wait</p><p>~5 minutes per person</p><p>Currently: {waiting.length} people waiting</p></div>
      </div>
    </div>
  )
}
