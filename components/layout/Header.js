'use client'
import { Bell } from 'lucide-react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import Link from 'next/link'
import { formatDateTime } from '@/lib/utils'

export default function Header({ title }) {
  const { profile } = useAuth()
  const [notifs, setNotifs] = useState([])
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (!profile) return
    fetchNotifs()
    const ch = supabase.channel('notifs')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications', filter:`user_id=eq.${profile.id_number}` },
        p => setNotifs(prev => [p.new, ...prev]))
      .subscribe()
    return () => supabase.removeChannel(ch)
  }, [profile])

  async function fetchNotifs() {
    const { data } = await supabase.from('notifications')
      .select('*').eq('user_id', profile.id_number)
      .order('created_at', { ascending: false }).limit(12)
    setNotifs(data || [])
  }

  async function markAllRead() {
    await supabase.from('notifications').update({ status: 'Read' }).eq('user_id', profile.id_number).eq('status', 'Unread')
    setNotifs(prev => prev.map(n => ({ ...n, status: 'Read' })))
  }

  const unread = notifs.filter(n => n.status === 'Unread').length

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-30">
      <h1 className="page-title">{title}</h1>
      <div className="flex items-center gap-3">

        {/* Notifications */}
        <div className="relative">
          <button onClick={() => setOpen(!open)}
            className="relative p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-modal border border-slate-100 z-50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                <span className="text-sm font-semibold text-slate-700">Notifications</span>
                {unread > 0 && <button onClick={markAllRead} className="text-xs text-brand-600 hover:text-brand-700 font-medium">Mark all read</button>}
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {notifs.length === 0
                  ? <p className="text-sm text-slate-400 text-center py-8">No notifications yet</p>
                  : notifs.map(n => (
                    <div key={n.notification_id} className={`px-4 py-3 ${n.status === 'Unread' ? 'bg-brand-50/60' : ''}`}>
                      {n.title && <p className="text-sm font-semibold text-slate-700">{n.title}</p>}
                      <p className="text-sm text-slate-600">{n.message}</p>
                      <p className="text-[10px] text-slate-400 mt-1">{formatDateTime(n.created_at)}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

          {/* Avatar / Profile Link */}
          <Link href="/shop/profile" className="flex items-center gap-2.5 pl-3 border-l border-slate-100 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-bold">
              {profile?.first_name?.[0]}{profile?.last_name?.[0]}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold text-slate-700 leading-tight">{profile?.first_name} {profile?.last_name}</p>
              <p className="text-xs text-slate-400">{profile?.id_number || profile?.email}</p>
            </div>
          </Link>
      </div>
    </header>
  )
}
