import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, User, Calendar, ListOrdered, Bell, ChevronRight, Star, Clock, CheckCircle, AlertCircle } from 'lucide-react'
import SignOutButton from './SignOutButton'
import EditProfileButton from './EditProfileButton'
import { formatDate, formatCurrency, ORDER_STATUS_COLORS, APPT_STATUS_COLORS, ROLE_LABELS, cn } from '@/lib/utils'

export default async function ProfilePage() {
  const supabase = await createClient()

  // Single auth call — getUser() is the only secure way on server
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  // Step 1: get profile (need user_id for subsequent queries)
  // This is the ONLY sequential step — everything else is parallel below
  const { data: profile } = await supabase
    .from('users')
    .select('id_number, first_name, last_name, email, id_type, contact_number, role_type, created_at')
    .eq('auth_id', user.id)
    .single()

  if (!profile) redirect('/login')

  // Step 2: fire ALL remaining queries in parallel with user_id now known
  const [
    { data: orders },
    { data: appointments },
    { data: queueToday },
  ] = await Promise.all([
    supabase
      .from('orders')
      .select('order_id, order_number, status, total_amount, created_at, items:order_items(count)')
      .eq('user_id', profile.id_number)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('appointments')
      .select('appointment_id, schedule_date, time_slot, status, order:order_id(order_number, order_items(quantity, bookstore_items(name)))')
      .eq('user_id', profile.id_number)
      .gte('schedule_date', today)
      .order('schedule_date')
      .limit(3),
    supabase
      .from('queues')
      .select('queue_id, queue_number, status, user_id')
      .eq('user_id', profile.id_number)
      .eq('queue_date', today)
      .in('status', ['Waiting', 'Processing'])
      .limit(1),
  ])

  const activeQueue = queueToday?.[0]
  const initials = `${profile.first_name?.[0] || ''}${profile.last_name?.[0] || ''}`

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile header */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-hnu-dark to-brand-700" />
        <div className="px-6 pb-5">
          <div className="flex items-end gap-4 -mt-8 mb-4">
            <div className="w-16 h-16 rounded-2xl bg-hnu-gold flex items-center justify-center font-display text-2xl font-black text-hnu-dark border-4 border-white shadow-lg shrink-0">
              {initials}
            </div>
            <div className="pb-1">
              <h2 className="font-display text-xl font-bold text-slate-800">{profile.first_name} {profile.last_name}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-mono text-sm font-bold text-brand-700">{profile.id_number || '—'}</span>
                {profile.role_type === 'parent' && profile.id_type && <span className="text-[10px] text-slate-400 uppercase">({profile.id_type})</span>}
                <span className="text-xs font-semibold bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                  {ROLE_LABELS[profile.role_type] || profile.role_type}
                </span>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2 pb-1">
              <EditProfileButton profile={profile} />
              <SignOutButton />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              { label: 'Email',        value: profile.email },
              { label: profile.id_type || 'ID Number', value: profile.id_number || '—' },
              { label: 'Contact',      value: profile.contact_number || '—' },
              { label: 'Member Since', value: formatDate(profile.created_at) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{label}</p>
                <p className="font-medium text-slate-700 mt-0.5 truncate text-xs">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: 'Active Orders', 
            value: orders?.filter(o => ['Pending', 'Ready'].includes(o.status)).length || 0,
            icon: Package,
            color: 'text-brand-600',
            bg: 'bg-brand-50'
          },
          { 
            label: 'Ready for Pickup', 
            value: orders?.filter(o => o.status === 'Ready').length || 0,
            icon: CheckCircle,
            color: 'text-green-600',
            bg: 'bg-green-50',
            highlight: true
          },
          { 
            label: 'Upcoming Appts', 
            value: appointments?.length || 0,
            icon: Calendar,
            color: 'text-purple-600',
            bg: 'bg-purple-50'
          },
          { 
            label: 'Queue Position', 
            value: activeQueue ? (activeQueue.status === 'Processing' ? 'NOW!' : `#${String(activeQueue.queue_number).padStart(3, '0')}`) : 'Not in queue',
            icon: ListOrdered,
            color: activeQueue?.status === 'Processing' ? 'text-green-600' : 'text-orange-600',
            bg: activeQueue?.status === 'Processing' ? 'bg-green-50' : 'bg-orange-50'
          },
        ].map(stat => (
          <Link 
            key={stat.label} 
            href={stat.label === 'Active Orders' ? '/shop/orders' : stat.label === 'Ready for Pickup' ? '/shop/orders?filter=ready' : stat.label === 'Upcoming Appts' ? '/shop/appointments' : '/shop/queue'}
            className={cn(
              'rounded-xl p-4 border transition-all hover:shadow-md',
              stat.bg,
              stat.highlight ? 'border-green-200 ring-2 ring-green-100' : 'border-slate-100'
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <stat.icon size={16} className={stat.color} />
              <span className="text-xs text-slate-500 font-medium">{stat.label}</span>
            </div>
            <p className={cn('font-display text-2xl font-bold', stat.color)}>{stat.value}</p>
          </Link>
        ))}
      </div>

      {/* Ready Orders Alert */}
      {orders?.some(o => o.status === 'Ready') && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle size={24} className="text-green-600" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-green-800">
              {orders.filter(o => o.status === 'Ready').length} order(s) ready for pickup!
            </p>
            <p className="text-sm text-green-700">
              Join the queue or book an appointment to pick up your items.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/shop/queue" className="btn-primary bg-green-600 hover:bg-green-700 text-sm">
              Join Queue
            </Link>
            <Link href="/shop/appointments" className="btn-secondary text-sm">
              Book Appt
            </Link>
          </div>
        </div>
      )}

      {/* Active queue banner */}
      {activeQueue && (
        <div className={cn(
          'rounded-2xl p-5 border-2 flex items-center gap-4',
          activeQueue.status === 'Processing' ? 'border-green-400 bg-green-50 animate-pulse' : 'border-brand-300 bg-brand-50'
        )}>
          <div className={cn(
            'w-14 h-14 rounded-xl flex items-center justify-center font-display text-2xl font-black shrink-0',
            activeQueue.status === 'Processing' ? 'bg-green-500 text-white' : 'bg-brand-600 text-white'
          )}>
            {String(activeQueue.queue_number).padStart(3, '0')}
          </div>
          <div className="flex-1">
            {activeQueue.status === 'Processing'
              ? <p className="font-black text-green-700 text-lg">🎉 It's your turn! Go to the counter now.</p>
              : <><p className="font-bold text-brand-700">You're in queue — #{String(activeQueue.queue_number).padStart(3, '0')}</p>
                <p className="text-sm text-brand-600">Wait for your number to be called</p></>
            }
          </div>
          <Link href="/shop/queue" className="btn-primary text-sm shrink-0">View Queue</Link>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Quick links */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 font-bold text-slate-700 flex items-center gap-2">
            <User size={16} className="text-brand-600" /> My Account
          </div>
          {[
            { href: '/shop/orders',        icon: Package,     label: 'My Orders',       sub: 'Track your order slips' },
            { href: '/shop/appointments',  icon: Calendar,    label: 'My Appointments', sub: 'Scheduled pickups' },
            { href: '/shop/queue',         icon: ListOrdered, label: 'Queue',           sub: 'Join or view live queue' },
            { href: '/shop/notifications', icon: Bell,        label: 'Notifications',   sub: 'Updates & alerts' },
          ].map(({ href, icon: Icon, label, sub }) => (
            <Link key={href} href={href}
              className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50 border-t border-slate-50 transition-colors group"
            >
              <div className="p-2 rounded-xl bg-brand-50 group-hover:bg-brand-100 transition-colors">
                <Icon size={15} className="text-brand-600" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-700 text-sm">{label}</p>
                <p className="text-xs text-slate-400">{sub}</p>
              </div>
              <ChevronRight size={15} className="text-slate-300 group-hover:text-slate-500" />
            </Link>
          ))}
        </div>

        {/* Upcoming appointments */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-2">
              <Calendar size={16} className="text-brand-600" /> Upcoming Appointments
            </span>
            <Link href="/shop/appointments" className="text-xs text-brand-600 font-semibold">View all →</Link>
          </div>
          {!appointments?.length ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">
              No upcoming appointments.<br />
              <Link href="/shop/appointments" className="text-brand-600 underline mt-1 inline-block">Book one →</Link>
            </div>
          ) : appointments.map(a => (
            <div key={a.appointment_id} className="flex items-start gap-3 px-5 py-4 border-t border-slate-50">
              <div className="w-10 h-10 bg-brand-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-brand-100">
                <span className="text-sm font-black text-brand-700 leading-none">{new Date(a.schedule_date).getDate()}</span>
                <span className="text-[9px] font-bold text-brand-400 uppercase">{new Date(a.schedule_date).toLocaleString('en', { month: 'short' })}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-700 text-sm">{a.time_slot?.slice(0, 5)}</p>
                {a.order && <p className="text-xs text-slate-400 truncate">{a.order.order_number}</p>}
                {/* Show order items summary */}
                {a.order?.order_items && a.order.order_items.length > 0 && (
                  <p className="text-[10px] text-slate-500 truncate">
                    {a.order.order_items.slice(0, 2).map((item, idx) => (
                      <span key={idx}>{item.bookstore_items?.name}{idx < Math.min(a.order.order_items.length, 2) - 1 ? ', ' : ''}</span>
                    ))}
                    {a.order.order_items.length > 2 && ` +${a.order.order_items.length - 2} more`}
                  </p>
                )}
              </div>
              <span className={cn('badge text-xs', APPT_STATUS_COLORS[a.status] || 'bg-slate-100')}>{a.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders */}
      {orders && orders.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-2">
              <Package size={16} className="text-brand-600" /> Recent Orders
            </span>
            <Link href="/shop/orders" className="text-xs text-brand-600 font-semibold">View all →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {orders.map(o => (
              <div key={o.order_id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                <span className={cn('badge text-xs', ORDER_STATUS_COLORS[o.status] || 'bg-slate-100')}>{o.status}</span>
                <span className="font-mono text-xs text-slate-500 flex-1">{o.order_number}</span>
                <span className="font-bold text-sm text-slate-700">{formatCurrency(o.total_amount)}</span>
                <Link href={`/shop/orders/${o.order_id}/slip`} className="btn-ghost p-1.5 text-xs">Slip</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}