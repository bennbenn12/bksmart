'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { formatDateTime, cn } from '@/lib/utils'
import { MessageSquare, Plus, Star, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

function StarRating({ value, onChange, readOnly=false, size=18 }) {
  const [hover, setHover] = useState(0)
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(s=>(
        <button key={s} type="button" onClick={readOnly?undefined:()=>onChange(s)}
          onMouseEnter={readOnly?undefined:()=>setHover(s)}
          onMouseLeave={readOnly?undefined:()=>setHover(0)}
          className={cn(readOnly?'cursor-default':'cursor-pointer hover:scale-110 transition-transform')}>
          <Star size={size} className={cn('transition-colors', s<=(hover||value)?'fill-yellow-400 text-yellow-400':'text-slate-200')}/>
        </button>
      ))}
    </div>
  )
}

export default function ShopFeedbackPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [feedback, setFeedback]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [showCreate, setCreate]   = useState(false)
  const [avgRating, setAvgRating] = useState(null)
  const supabase = createClient()

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('feedback')
      .select('*, user:user_id(first_name,last_name), order:order_id(order_number)')
      .order('created_at',{ascending:false})
      .limit(50)
    setFeedback(data||[])
    // Calculate avg rating
    const rated = data?.filter(f => f.rating) || []
    if (rated.length) {
      setAvgRating((rated.reduce((s,f)=>s+(f.rating||0),0)/rated.length).toFixed(1))
    }
    setLoading(false)
  }, [])

  useEffect(() => { if (profile) fetchFeedback() }, [profile])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/shop" className="btn-ghost p-1.5"><ArrowLeft size={16}/></Link>
        <h1 className="text-2xl font-display font-bold text-hnu-dark">Feedback & Reviews</h1>
        <button onClick={()=>setCreate(true)} className="btn-primary ml-auto text-sm"><Plus size={14}/> Leave Feedback</button>
      </div>

      {/* Average Rating */}
      {avgRating && (
        <div className="bg-white rounded-xl border border-slate-100 p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-yellow-50"><Star size={24} className="fill-yellow-400 text-yellow-400"/></div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Average Rating</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display text-3xl font-bold text-slate-800">{avgRating}</span>
              <StarRating value={Math.round(parseFloat(avgRating))} readOnly size={16}/>
              <span className="text-sm text-slate-400">/ 5.0 — {feedback.filter(f=>f.rating).length} reviews</span>
            </div>
          </div>
        </div>
      )}

      {/* Feedback List */}
      <div className="bg-white rounded-xl border border-slate-100 shadow-sm divide-y divide-slate-50">
        {loading ? (
          <div className="p-12 text-center"><Loader2 size={24} className="animate-spin mx-auto text-slate-400"/></div>
        ) : feedback.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare size={48} className="mx-auto text-slate-200 mb-4"/>
            <p className="font-semibold text-slate-500">No feedback yet.</p>
            <p className="text-sm text-slate-400 mt-1">Be the first to share your experience!</p>
            <button onClick={()=>setCreate(true)} className="btn-primary mt-4"><Plus size={14}/> Leave Feedback</button>
          </div>
        ) : feedback.map(f=>(
          <div key={f.feedback_id} className="p-5 hover:bg-slate-50 transition-colors">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap mb-2">
                  {f.rating && <StarRating value={f.rating} readOnly size={14}/>}
                  {f.order && <span className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{f.order.order_number}</span>}
                  {f.user && <span className="text-xs text-slate-500">{f.user.first_name} {f.user.last_name}</span>}
                </div>
                <p className="text-slate-700 text-sm leading-relaxed">{f.content}</p>
              </div>
              <span className="text-xs text-slate-400 shrink-0">{formatDateTime(f.created_at)}</span>
            </div>
          </div>
        ))}
      </div>

      {showCreate && <FeedbackModal onClose={()=>setCreate(false)} onSubmitted={()=>{setCreate(false);fetchFeedback();toast('Thank you for your feedback!','success')}}/>}
    </div>
  )
}

function FeedbackModal({ onClose, onSubmitted }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [form, setForm]   = useState({ content:'', rating:0, order_id:'' })
  const [orders, setOrders] = useState([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return
    supabase.from('orders').select('order_id,order_number').eq('user_id',profile.user_id).eq('status','Released').limit(10).then(({data,error})=>{
      if (error) console.error('Error loading orders:', error)
      setOrders(data||[])
    })
  }, [profile])

  async function submit(e) {
    e.preventDefault()
    if (!profile) { toast('Session expired. Please refresh.','error'); return }
    if (!form.content.trim()) { toast('Please write your feedback.','warning'); return }
    setSaving(true)
    try {
      await supabase.from('feedback').insert({ user_id:profile.user_id, content:form.content, rating:form.rating||null, order_id:form.order_id||null })
      onSubmitted()
    } catch(e) { toast(e.message,'error') } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-slate-800">Leave Feedback</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Your Rating</label>
            <StarRating value={form.rating} onChange={v=>setForm(f=>({...f,rating:v}))} size={28}/>
            {form.rating > 0 && <p className="text-xs text-slate-400 mt-1">{['','Poor','Fair','Good','Great','Excellent!'][form.rating]}</p>}
          </div>
          {orders.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Related Order (optional)</label>
              <select className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" value={form.order_id} onChange={e=>setForm(f=>({...f,order_id:e.target.value}))}>
                <option value="">— None —</option>
                {orders.map(o=><option key={o.order_id} value={o.order_id}>{o.order_number}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">Your Feedback <span className="text-red-500">*</span></label>
            <textarea className="w-full p-2.5 border border-slate-200 rounded-lg text-sm resize-none" rows={4} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Share your experience with the bookstore service..."/>
          </div>
        </form>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
          <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button type="button" onClick={submit} disabled={saving} className="btn-primary flex-1 justify-center">{saving?<Loader2 size={14} className="animate-spin"/>:<><MessageSquare size={14}/> Submit</>}</button>
        </div>
      </div>
    </div>
  )
}
