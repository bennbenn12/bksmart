'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { StatsCard, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { formatCurrency, ORDER_STATUS_COLORS, cn } from '@/lib/utils'
import { ShoppingCart, CalendarDays, Package, ListOrdered, CreditCard, ClipboardList, TrendingUp, MessageSquare, BookOpen, Users, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats]           = useState({})
  const [recentOrders, setOrders]   = useState([])
  const [activeQueue, setQueue]     = useState([])
  const [loading, setLoading]       = useState(true)
  const supabase = createClient()
  const isStaff = ['bookstore_manager','bookstore_staff','working_student'].includes(profile?.role_id)

  const loadDashboard = useCallback(async () => {
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    if (isStaff) {
      const [orders, appts, inv, queue, payments, jos, feedback] = await Promise.all([
        supabase.from('orders').select('order_id,status,total_amount,created_at').gte('created_at', today),
        supabase.from('appointments').select('appointment_id,status').eq('schedule_date', today),
        supabase.from('bookstore_items').select('item_id,stock_quantity,reorder_level').eq('is_active',true),
        supabase.from('queues').select('queue_id,status,queue_number,user_id,user:user_id(first_name,last_name)').eq('queue_date',today).order('queue_number'),
        supabase.from('payments').select('payment_id,amount').is('verified_at',null),
        supabase.from('job_orders').select('job_id,status').eq('status','Pending_Audit'),
        supabase.from('feedback').select('rating').not('rating','is',null),
      ])
      const avgRating = feedback.data?.length ? (feedback.data.reduce((s,f)=>s+(f.rating||0),0)/feedback.data.length).toFixed(1) : '—'
      setStats({
        todayOrders: orders.data?.length||0,
        todayRevenue: orders.data?.reduce((s,o)=>s+(o.total_amount||0),0)||0,
        pendingOrders: orders.data?.filter(o=>o.status==='Pending')?.length||0,
        readyOrders: orders.data?.filter(o=>o.status==='Ready')?.length||0,
        todayAppts: appts.data?.length||0,
        lowStock: inv.data?.filter(i=>i.stock_quantity<=i.reorder_level)?.length||0,
        waitingQueue: queue.data?.filter(q=>q.status==='Waiting')?.length||0,
        processingQueue: queue.data?.filter(q=>q.status==='Processing')?.length||0,
        pendingPayments: payments.data?.length||0,
        pendingJOs: jos.data?.length||0,
        avgRating,
      })
      setQueue(queue.data||[])
    } else {
      const [myOrders, myAppts, myQueue] = await Promise.all([
        supabase.from('orders').select('order_id,status,total_amount,order_number,created_at').eq('user_id',profile.user_id).order('created_at',{ascending:false}).limit(5),
        supabase.from('appointments').select('appointment_id,schedule_date,time_slot,status').eq('user_id',profile.user_id).gte('schedule_date',today).limit(3),
        supabase.from('queues').select('queue_id,queue_number,status').eq('user_id',profile.user_id).eq('queue_date',today).in('status',['Waiting','Processing']).limit(1),
      ])
      setStats({ myOrders:myOrders.data?.length||0, myAppts:myAppts.data?.length||0 })
      setOrders(myOrders.data||[])
      setQueue(myQueue.data||[])
    }
    setLoading(false)
  }, [profile, isStaff])

  useRealtime({ tables:['orders','queues','appointments','payments','job_orders'], onRefresh:loadDashboard, enabled:!!profile })
  useEffect(() => { if (profile) loadDashboard() }, [profile])

  if (loading) return <LoadingSpinner />

  const today = new Date().toISOString().split('T')[0]
  const processing = activeQueue.find(q=>q.status==='Processing')
  const myQueueEntry = !isStaff ? activeQueue[0] : null

  return (
    <div className="page-enter">
      <Header title={`Good ${new Date().getHours()<12?'morning':new Date().getHours()<17?'afternoon':'evening'}, ${profile?.first_name}!`} />
      <div className="p-6 space-y-6">

        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot"/> Live dashboard — auto-updates
        </div>

        {isStaff ? (
          <>
            {/* Staff stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard label="Today's Orders" value={stats.todayOrders} icon={ShoppingCart} sub={`${stats.pendingOrders} pending, ${stats.readyOrders} ready`} color="brand"/>
              <StatsCard label="Today's Revenue" value={formatCurrency(stats.todayRevenue)} icon={TrendingUp} color="green"/>
              <StatsCard label="Queue" value={stats.waitingQueue} icon={ListOrdered} sub={processing?`Serving #${String(processing.queue_number).padStart(3,'0')}`:'No one serving'} color="orange"/>
              <StatsCard label="Today's Appts" value={stats.todayAppts} icon={CalendarDays} color="purple"/>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard label="Low Stock Items" value={stats.lowStock} icon={Package} color={stats.lowStock>0?'red':'green'} sub={stats.lowStock>0?'Needs restocking':'All good'}/>
              <StatsCard label="Unverified Payments" value={stats.pendingPayments} icon={CreditCard} color={stats.pendingPayments>0?'orange':'green'}/>
              <StatsCard label="Pending Job Orders" value={stats.pendingJOs} icon={ClipboardList} color={stats.pendingJOs>0?'orange':'green'}/>
              <StatsCard label="Avg. Feedback" value={stats.avgRating==='—'?'—':`${stats.avgRating} ⭐`} icon={MessageSquare} color="brand"/>
            </div>

            {/* Quick actions */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Live Queue */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title flex items-center gap-2"><ListOrdered size={16} className="text-brand-600"/> Live Queue</h3>
                  <Link href="/queue" className="text-xs text-brand-600 hover:text-brand-700 font-semibold">Manage →</Link>
                </div>
                {processing ? (
                  <div className="bg-brand-950 rounded-xl p-4 text-white text-center mb-3">
                    <p className="text-xs text-brand-300 uppercase tracking-widest mb-1">Now Serving</p>
                    <p className="font-display text-5xl font-black">{String(processing.queue_number).padStart(3,'0')}</p>
                    {processing.user && <p className="text-brand-300 text-xs mt-1">{processing.user.first_name} {processing.user.last_name}</p>}
                  </div>
                ) : <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-400 text-sm mb-3">No one currently being served</div>}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">{stats.waitingQueue} waiting</span>
                  <Link href="/queue" className="btn-primary py-1.5 text-xs">Open Queue Board</Link>
                </div>
              </div>

              {/* Pending orders */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="section-title flex items-center gap-2"><ShoppingCart size={16} className="text-brand-600"/> Quick Actions</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {href:'/orders',label:'View Orders',icon:ShoppingCart,badge:stats.pendingOrders,badgeColor:'bg-yellow-500'},
                    {href:'/payments',label:'Payments',icon:CreditCard,badge:stats.pendingPayments,badgeColor:'bg-orange-500'},
                    {href:'/queue',label:'Queue',icon:ListOrdered,badge:stats.waitingQueue,badgeColor:'bg-brand-500'},
                    {href:'/appointments',label:'Appointments',icon:CalendarDays,badge:stats.todayAppts,badgeColor:'bg-purple-500'},
                    {href:'/inventory',label:'Inventory',icon:Package,badge:stats.lowStock>0?stats.lowStock:null,badgeColor:'bg-red-500'},
                    {href:'/job-orders',label:'Job Orders',icon:ClipboardList,badge:stats.pendingJOs,badgeColor:'bg-orange-500'},
                  ].map(a=>(
                    <Link key={a.href} href={a.href} className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50 transition-all relative group">
                      <div className="p-2 rounded-lg bg-slate-100 group-hover:bg-brand-100 transition-colors"><a.icon size={14} className="text-slate-600 group-hover:text-brand-600"/></div>
                      <span className="text-sm font-semibold text-slate-700">{a.label}</span>
                      {a.badge > 0 && <span className={cn('absolute top-1.5 right-1.5 min-w-[18px] h-[18px] text-[10px] font-black text-white rounded-full flex items-center justify-center px-1', a.badgeColor)}>{a.badge}</span>}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Alerts */}
            {stats.lowStock > 0 && <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"><AlertTriangle size={16} className="shrink-0 mt-0.5"/><div><p className="font-bold">{stats.lowStock} item{stats.lowStock>1?'s':''} below reorder level</p><Link href="/inventory" className="text-xs underline mt-0.5 inline-block">View inventory →</Link></div></div>}
          </>
        ) : (
          <>
            {/* Student/Parent view */}
            <div className="grid grid-cols-2 gap-4">
              <StatsCard label="My Orders" value={stats.myOrders} icon={ShoppingCart} color="brand"/>
              <StatsCard label="My Appointments" value={stats.myAppts} icon={CalendarDays} color="purple"/>
            </div>

            {/* Queue status */}
            {myQueueEntry && (
              <div className={cn('rounded-2xl p-5 border-2 text-center', myQueueEntry.status==='Processing'?'border-green-400 bg-green-50':'border-brand-300 bg-brand-50')}>
                {myQueueEntry.status==='Processing'
                  ? <p className="text-green-700 font-black text-xl">🎉 It's your turn at the counter!</p>
                  : <><p className="font-bold text-brand-700">You are in queue: #{String(myQueueEntry.queue_number).padStart(3,'0')}</p><Link href="/queue" className="text-xs text-brand-600 mt-1 inline-block underline">View live queue →</Link></>}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Link href="/shop" className="card p-5 hover:shadow-card-hover transition-all text-center group"><BookOpen size={28} className="mx-auto text-brand-600 mb-2 group-hover:scale-110 transition-transform"/><p className="font-bold text-slate-700">Browse Shop</p><p className="text-xs text-slate-400 mt-1">Pre-order items</p></Link>
              <Link href="/queue" className="card p-5 hover:shadow-card-hover transition-all text-center group"><ListOrdered size={28} className="mx-auto text-brand-600 mb-2 group-hover:scale-110 transition-transform"/><p className="font-bold text-slate-700">Join Queue</p><p className="text-xs text-slate-400 mt-1">Get a queue number</p></Link>
            </div>

            {/* Recent orders */}
            {recentOrders.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"><h3 className="section-title">Recent Orders</h3><Link href="/orders" className="text-xs text-brand-600 font-semibold">View all →</Link></div>
                <div className="divide-y divide-slate-50">
                  {recentOrders.map(o=>(
                    <div key={o.order_id} className="flex items-center gap-3 px-5 py-3">
                      <span className={cn('badge text-xs',ORDER_STATUS_COLORS[o.status])}>{o.status}</span>
                      <span className="font-mono text-xs text-slate-500 flex-1">{o.order_number}</span>
                      <span className="font-bold text-sm text-slate-700">{formatCurrency(o.total_amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
