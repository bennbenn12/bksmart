'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { LoadingSpinner, EmptyState, Pagination } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { formatDateTime, cn } from '@/lib/utils'
import { MessageSquare, Star, RefreshCw } from 'lucide-react'

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

export default function FeedbackPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const [feedback, setFeedback]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [ratingFilter, setRating] = useState('')
  const [avgRating, setAvgRating] = useState(null)
  const PAGE = 10
  const supabase = createClient()
  const isManager = profile?.role_type === 'bookstore_manager'
  const isStaff = ['bookstore_manager','bookstore_staff','working_student'].includes(profile?.role_type)

  useEffect(() => {
    if (profile && !isStaff) {
      router.push('/shop/feedback')
    }
  }, [profile, isStaff, router])

  const fetchFeedback = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('feedback')
      .select('*, user:user_id(first_name,last_name,id_number), order:order_id(order_number)', {count:'exact'})
      .order('created_at',{ascending:false})
      .range((page-1)*PAGE, page*PAGE-1)
    if (!isManager) q = q.eq('user_id', profile?.user_id)
    if (ratingFilter) q = q.eq('rating', parseInt(ratingFilter))
    const { data, count } = await q
    setFeedback(data||[]); setTotal(count||0); setLoading(false)
  }, [profile, isManager, ratingFilter, page])

  async function fetchAvg() {
    const { data } = await supabase.from('feedback').select('rating').not('rating','is',null).order('created_at', {ascending: false}).limit(500)
    if (data?.length) setAvgRating((data.reduce((s,f)=>s+(f.rating||0),0)/data.length).toFixed(1))
  }

  useRealtime({ tables:['feedback'], onRefresh:fetchFeedback, enabled:!!profile })
  useEffect(() => { if (profile) { fetchFeedback(); if(isManager) fetchAvg() } }, [profile, ratingFilter, page])

  return (
    <div className="page-enter">
      <Header title="Feedback & Ratings"/>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot"/> Live — updates automatically
        </div>

        {isManager && avgRating && (
          <div className="card p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-yellow-50"><Star size={24} className="fill-yellow-400 text-yellow-400"/></div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Overall Average Rating</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-display text-3xl font-bold text-slate-800">{avgRating}</span>
                <StarRating value={Math.round(parseFloat(avgRating))} readOnly size={16}/>
                <span className="text-sm text-slate-400">/ 5.0 — {total} reviews</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 items-center">
          <select className="input w-36" value={ratingFilter} onChange={e=>{setRating(e.target.value);setPage(1)}}>
            <option value="">All Ratings</option>
            {[5,4,3,2,1].map(r=><option key={r} value={r}>{'⭐'.repeat(r)} ({r} star)</option>)}
          </select>
          <button onClick={fetchFeedback} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
        </div>

        <div className="card divide-y divide-slate-50 overflow-hidden">
          {loading ? <LoadingSpinner/>
          : feedback.length === 0 ? <EmptyState icon={MessageSquare} title="No feedback yet" description="No feedback submitted yet."/>
          : feedback.map(f=>(
            <div key={f.feedback_id} className="p-5 hover:bg-slate-50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-2">
                    {f.rating && <StarRating value={f.rating} readOnly size={14}/>}
                    {f.order && <span className="font-mono text-xs text-brand-600 bg-brand-50 px-2 py-0.5 rounded">{f.order.order_number}</span>}
                    {isManager && f.user && <span className="text-xs text-slate-500">{f.user.first_name} {f.user.last_name}{f.user.id_number&&<> · <span className="font-mono font-bold text-brand-600">{f.user.id_number}</span></>}</span>}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed">{f.content}</p>
                </div>
                <span className="text-xs text-slate-400 shrink-0">{formatDateTime(f.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
        {total > PAGE && <Pagination page={page} total={total} pageSize={PAGE} onPageChange={setPage}/>}
      </div>

    </div>
  )
}