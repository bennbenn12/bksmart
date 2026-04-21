'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { formatDateTime, cn } from '@/lib/utils'
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, AlertCircle, Loader2 } from 'lucide-react'

const TYPE_ICONS  = { info:Info, success:CheckCircle2, warning:AlertTriangle, alert:AlertCircle }
const TYPE_COLORS = { info:'text-blue-600 bg-blue-50', success:'text-green-600 bg-green-50', warning:'text-yellow-600 bg-yellow-50', alert:'text-red-600 bg-red-50' }

export default function NotificationsPage() {
  const { profile } = useAuth()
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotifs = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id',profile.user_id).order('created_at',{ascending:false}).limit(50)
    setNotifs(data||[]); setLoading(false)
  }, [profile])

  useRealtime({ tables:[{table:'notifications',filter:`user_id=eq.${profile?.user_id}`}], onRefresh:fetchNotifs, enabled:!!profile })
  useEffect(() => { if (profile) fetchNotifs() }, [profile])

  async function markAllRead() {
    await supabase.from('notifications').update({status:'Read'}).eq('user_id',profile.user_id).eq('status','Unread')
    setNotifs(prev=>prev.map(n=>({...n,status:'Read'})))
  }

  const unread = notifs.filter(n=>n.status==='Unread').length

  if (loading) return <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-brand-600" size={28}/></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-hnu-dark">Notifications</h1>
          <div className="flex items-center gap-2 mt-1 text-xs text-green-600 font-semibold">
            <span className="live-dot"/> New notifications appear instantly
          </div>
        </div>
        {unread > 0 && <button onClick={markAllRead} className="btn-secondary gap-1 text-xs"><CheckCheck size={12}/> Mark all read</button>}
      </div>

      {notifs.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4"><Bell size={28} className="text-slate-300"/></div>
          <p className="text-slate-500 font-medium">You're all caught up!</p>
          <p className="text-slate-400 text-sm mt-1">No notifications yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {notifs.map(n=>{
            const Icon = TYPE_ICONS[n.type]||Info
            const cls  = TYPE_COLORS[n.type]||TYPE_COLORS.info
            return (
              <div key={n.notification_id} className={cn('flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors', n.status==='Unread'&&'bg-brand-50/40')}>
                <div className={cn('p-2 rounded-xl mt-0.5 shrink-0', cls.split(' ')[1])}><Icon size={14} className={cls.split(' ')[0]}/></div>
                <div className="flex-1 min-w-0">
                  {n.title && <p className="font-semibold text-slate-800 text-sm">{n.title}</p>}
                  <p className="text-sm text-slate-600 mt-0.5">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(n.created_at)}</p>
                </div>
                {n.status==='Unread' && <span className="w-2 h-2 bg-brand-500 rounded-full mt-2 shrink-0"/>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
