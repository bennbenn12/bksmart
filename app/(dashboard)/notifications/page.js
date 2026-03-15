'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { LoadingSpinner, EmptyState } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { formatDateTime, cn } from '@/lib/utils'
import { Bell, CheckCheck, Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'

const TYPE_ICONS = { info:Info, success:CheckCircle2, warning:AlertTriangle, alert:AlertCircle }
const TYPE_COLORS = { info:'text-blue-600 bg-blue-50', success:'text-green-600 bg-green-50', warning:'text-yellow-600 bg-yellow-50', alert:'text-red-600 bg-red-50' }

export default function NotificationsPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchNotifs = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id',profile.user_id).order('created_at',{ascending:false}).limit(50)
    setNotifs(data||[])
    setLoading(false)
  }, [profile])

  useRealtime({ tables:[{ table:'notifications', filter:`user_id=eq.${profile?.user_id}` }], onRefresh:fetchNotifs, enabled:!!profile })
  useEffect(() => { if (profile) fetchNotifs() }, [profile])

  async function markAllRead() {
    await supabase.from('notifications').update({ status:'Read' }).eq('user_id',profile.user_id).eq('status','Unread')
    setNotifs(prev=>prev.map(n=>({...n,status:'Read'})))
    toast('All notifications marked as read.','success')
  }

  const unread = notifs.filter(n=>n.status==='Unread').length

  if (loading) return <LoadingSpinner/>

  return (
    <div className="page-enter">
      <Header title="Notifications"/>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-green-600 font-semibold"><span className="live-dot"/> Live — new notifications appear instantly</div>
          {unread > 0 && <button onClick={markAllRead} className="btn-ghost text-xs gap-1"><CheckCheck size={12}/> Mark all read</button>}
        </div>

        {notifs.length === 0 ? <EmptyState icon={Bell} title="No notifications" description="You're all caught up!"/>
        : (
          <div className="card divide-y divide-slate-50 overflow-hidden">
            {notifs.map(n=>{
              const Icon = TYPE_ICONS[n.type] || Info
              const colorClass = TYPE_COLORS[n.type] || TYPE_COLORS.info
              return (
                <div key={n.notification_id} className={cn('flex items-start gap-4 px-6 py-4 hover:bg-slate-50 transition-colors cursor-default', n.status==='Unread'&&'bg-brand-50/50')}>
                  <div className={cn('p-2 rounded-xl mt-0.5 shrink-0', colorClass.split(' ')[1])}><Icon size={14} className={colorClass.split(' ')[0]}/></div>
                  <div className="flex-1 min-w-0">
                    {n.title && <p className="font-semibold text-slate-800 text-sm">{n.title}</p>}
                    <p className="text-sm text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-slate-400 mt-1.5">{formatDateTime(n.created_at)}</p>
                  </div>
                  {n.status==='Unread' && <span className="w-2 h-2 bg-brand-500 rounded-full mt-2 shrink-0"/>}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
