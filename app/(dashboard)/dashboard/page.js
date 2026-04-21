'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { StatsCard, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { formatCurrency, formatTime, ORDER_STATUS_COLORS, APPT_STATUS_COLORS, cn } from '@/lib/utils'
import { ShoppingCart, CalendarDays, Package, ListOrdered, CreditCard, ClipboardList, TrendingUp, MessageSquare, BookOpen, Users, AlertTriangle, Clock, ShoppingBag, Bell, CheckCircle } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { profile } = useAuth()
  const [stats, setStats]           = useState({})
  const [recentOrders, setOrders]   = useState([])
  const [activeQueue, setQueue]     = useState([])
  const [todayAppts, setTodayAppts] = useState([])
  const [pendingOrders, setPendingOrders] = useState([])
  const [unverifiedPayments, setUnverifiedPayments] = useState([])
  const [pendingJOs, setPendingJOs] = useState([])
  const [loading, setLoading]       = useState(true)
  const supabase = createClient()
  const isStaff = ['bookstore_manager','bookstore_staff','working_student'].includes(profile?.role_type)

  const loadDashboard = useCallback(async () => {
    if (!profile) return
    const today = new Date().toISOString().split('T')[0]
    if (isStaff) {
      const [orders, appts, inv, queue, payments, jos, feedback] = await Promise.all([
        supabase.from('orders').select('order_id,status,total_amount,created_at').gte('created_at', today),
        supabase.from('appointments')
          .select('appointment_id,status,time_slot,user_id,order_id,purpose,or_number,order:order_id(order_number,order_items(quantity,bookstore_items(name)))')
          .eq('schedule_date', today)
          .in('status',['Pending','Confirmed']),
        supabase.from('bookstore_items').select('item_id,stock_quantity,reorder_level').eq('is_active',true),
        supabase.from('queues').select('queue_id,status,queue_number,user_id,user:user_id(first_name,last_name)').eq('queue_date',today).order('queue_number'),
        supabase.from('payments').select('payment_id,amount,source,order:order_id(order_number,user_id)').is('verified_at',null).limit(5),
        supabase.from('job_orders').select('job_id,job_number,status,requester_id,department_account,created_at').eq('status','Pending_Audit').limit(5),
        supabase.from('feedback').select('rating').not('rating','is',null).order('created_at', {ascending: false}).limit(500),
      ])
      const avgRating = feedback.data?.length ? (feedback.data.reduce((s,f)=>s+(f.rating||0),0)/feedback.data.length).toFixed(1) : '—'
      setStats({
        todayOrders: orders.data?.length||0,
        todayRevenue: orders.data?.reduce((s,o)=>s+parseFloat(o.total_amount||0),0)||0,
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
      setTodayAppts(appts.data||[])
      setPendingOrders(orders.data?.filter(o => o.status === 'Pending').slice(0, 5) || [])
      setUnverifiedPayments(payments.data || [])
      setPendingJOs(jos.data || [])
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
            {/* Pending Actions Alert */}
            {(stats.pendingOrders > 0 || stats.pendingPayments > 0 || stats.waitingQueue > 0 || stats.todayAppts > 0) && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={18} className="text-blue-600"/>
                  <h3 className="font-bold text-blue-800">Pending Actions Today</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {stats.pendingOrders > 0 && (
                    <Link href="/orders?filter=Pending" className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-semibold hover:bg-yellow-200">
                      📦 {stats.pendingOrders} Pending Order{stats.pendingOrders > 1 ? 's' : ''}
                    </Link>
                  )}
                  {stats.pendingPayments > 0 && (
                    <Link href="/payments" className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs font-semibold hover:bg-orange-200">
                      💳 {stats.pendingPayments} Unverified Payment{stats.pendingPayments > 1 ? 's' : ''}
                    </Link>
                  )}
                  {stats.waitingQueue > 0 && (
                    <Link href="/queue" className="px-3 py-1.5 bg-brand-100 text-brand-700 rounded-lg text-xs font-semibold hover:bg-brand-200">
                      👥 {stats.waitingQueue} Waiting in Queue
                    </Link>
                  )}
                  {stats.todayAppts > 0 && (
                    <Link href="/appointments" className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-semibold hover:bg-purple-200">
                      📅 {stats.todayAppts} Appointment{stats.todayAppts > 1 ? 's' : ''} Today
                    </Link>
                  )}
                </div>
              </div>
            )}

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

            {/* Today's Appointments Preview */}
            {todayAppts.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="section-title flex items-center gap-2"><Clock size={16} className="text-purple-600"/> Today's Appointments ({todayAppts.length})</h3>
                  <Link href="/appointments" className="text-xs text-brand-600 font-semibold">View all →</Link>
                </div>
                <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                  {todayAppts.map(a => (
                    <div key={a.appointment_id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className={cn('badge text-xs', APPT_STATUS_COLORS[a.status])}>{a.status}</span>
                          <span className="font-semibold text-slate-700">{formatTime(a.time_slot)}</span>
                          {a.user_id && (
                            <span className="text-xs text-slate-500 font-mono">{a.user_id.slice(0,8)}...</span>
                          )}
                        </div>
                        <div className="text-right">
                          {a.order ? (
                            <div className="text-xs">
                              <span className="text-brand-600 font-semibold flex items-center gap-1 justify-end">
                                <ShoppingBag size={10}/> {a.order.order_number}
                              </span>
                              {a.order.order_items && a.order.order_items.length > 0 && (
                                <span className="text-slate-400">
                                  {a.order.order_items.length} item{a.order.order_items.length > 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          ) : a.or_number ? (
                            <span className="text-xs text-purple-600">OR: {a.or_number}</span>
                          ) : (
                            <span className="text-xs text-slate-400">No order</span>
                          )}
                        </div>
                      </div>
                      {a.order?.order_items && a.order.order_items.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {a.order.order_items.slice(0, 3).map((item, idx) => (
                            <span key={idx} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {item.bookstore_items?.name} ×{item.quantity}
                            </span>
                          ))}
                          {a.order.order_items.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{a.order.order_items.length - 3} more</span>
                          )}
                        </div>
                      )}
                      {a.purpose && <p className="text-[10px] text-slate-500 mt-1 italic">{a.purpose}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Orders Section */}
            {pendingOrders.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="section-title flex items-center gap-2"><ShoppingCart size={16} className="text-yellow-600"/> Pending Orders ({pendingOrders.length})</h3>
                  <Link href="/orders" className="text-xs text-brand-600 font-semibold">View all →</Link>
                </div>
                <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                  {pendingOrders.map(o => (
                    <div key={o.order_id} className="px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-500">{o.order_id.slice(0,8)}...</span>
                        <span className="text-slate-700">{formatCurrency(o.total_amount)}</span>
                      </div>
                      <span className="text-xs text-slate-400">{new Date(o.created_at).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Unverified Payments Section */}
            {unverifiedPayments.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="section-title flex items-center gap-2"><CreditCard size={16} className="text-orange-600"/> Unverified Payments ({unverifiedPayments.length})</h3>
                  <Link href="/payments" className="text-xs text-brand-600 font-semibold">Verify all →</Link>
                </div>
                <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                  {unverifiedPayments.map(p => (
                    <div key={p.payment_id} className="px-5 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={cn('badge text-xs', p.source === 'Teller' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700')}>{p.source}</span>
                        <span className="font-semibold text-slate-700">{formatCurrency(p.amount)}</span>
                        {p.order && <span className="text-xs text-brand-600 font-mono">{p.order.order_number}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Job Orders Section */}
            {pendingJOs.length > 0 && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="section-title flex items-center gap-2"><ClipboardList size={16} className="text-orange-600"/> RISO Jobs Awaiting Documents ({pendingJOs.length})</h3>
                  <Link href="/job-orders" className="text-xs text-brand-600 font-semibold">Review all →</Link>
                </div>
                <div className="divide-y divide-slate-50 max-h-48 overflow-y-auto">
                  {pendingJOs.map(jo => (
                    <div key={jo.job_id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-500">{jo.job_number || jo.job_id.slice(0,8)}</span>
                          <span className="text-xs text-slate-600">{jo.department_account}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{new Date(jo.created_at).toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Requester: {jo.requester_id}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
