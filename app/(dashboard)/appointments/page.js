'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Badge, ConfirmDialog } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { APPT_STATUS_COLORS, formatDate, formatTime, formatDateTime, cn } from '@/lib/utils'
import { CalendarDays, Plus, Search, CheckCircle, RefreshCw, Loader2, Clock, User, Hash } from 'lucide-react'

const STATUSES = ['Confirmed','Completed','Rescheduled']

export default function AppointmentsPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [appts, setAppts]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [statusFilter, setStat] = useState('')
  const [search, setSearch]     = useState('')
  const [showBook, setShowBook] = useState(false)
  const [reschedule, setReschedule] = useState(null)
  const [acting, setActing]     = useState(false)
  const supabase = createClient()
  const isStaff = ['bookstore_manager','bookstore_staff'].includes(profile?.role_id)

  const fetchAppts = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('appointments')
      .select('*, user:user_id(first_name,last_name,student_id,email), order:order_id(order_number)')
      .order('schedule_date').order('time_slot')
    if (!isStaff) q = q.eq('user_id', profile?.user_id)
    if (statusFilter) q = q.eq('status', statusFilter)
    const { data } = await q

    let finalData = data || []
    if (search && isStaff) {
      const s = search.toLowerCase()
      finalData = finalData.filter(a => 
        a.user?.first_name?.toLowerCase().includes(s) || 
        a.user?.last_name?.toLowerCase().includes(s) ||
        a.user?.student_id?.toLowerCase().includes(s)
      )
    }

    setAppts(finalData); setLoading(false)
  }, [profile, isStaff, statusFilter, search])

  useRealtime({ tables:['appointments','appointment_slots'], onRefresh:fetchAppts, enabled:!!profile })
  useEffect(() => { if (profile) fetchAppts() }, [profile, statusFilter, search])

  async function updateStatus(id, status) {
    setActing(true)
    try {
      await supabase.from('appointments').update({ status, ...(status==='Completed'?{completed_at:new Date().toISOString()}:{}) }).eq('appointment_id', id)
      toast(`Appointment ${status.toLowerCase()}.`,'success')
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  const today = new Date().toISOString().split('T')[0]
  const upcoming = appts.filter(a => a.schedule_date >= today && a.status !== 'Completed').slice(0, 50)
  const past = appts.filter(a => a.schedule_date < today || a.status === 'Completed').slice(0, 20)

  return (
    <div className="page-enter">
      <Header title="Appointments" />
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot" /> Live — updates automatically
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          {isStaff && <div className="relative flex-1 min-w-[160px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="input pl-9" placeholder="Search name..." value={search} onChange={e=>setSearch(e.target.value)}/></div>}
          <select className="input w-36" value={statusFilter} onChange={e=>setStat(e.target.value)}>
            <option value="">All Status</option>
            {STATUSES.map(s=><option key={s}>{s}</option>)}
          </select>
          <button onClick={fetchAppts} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
          <button onClick={()=>setShowBook(true)} className="btn-primary ml-auto"><Plus size={14}/> Book Appointment</button>
        </div>

        {/* Upcoming */}
        {upcoming.length > 0 && (
          <div className="card overflow-hidden">
            <div className="px-6 py-3 bg-brand-50 border-b border-brand-100 flex items-center gap-2">
              <CalendarDays size={15} className="text-brand-600"/><h3 className="section-title text-brand-700">Upcoming ({upcoming.length})</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {upcoming.map(a=>(
                <div key={a.appointment_id} className="flex items-center gap-4 px-6 py-4 hover:bg-slate-50 flex-wrap">
                  <div className="w-14 h-14 bg-brand-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-brand-100">
                    <span className="text-lg font-black text-brand-700 leading-none">{new Date(a.schedule_date).getDate()}</span>
                    <span className="text-[10px] font-bold text-brand-500 uppercase">{new Date(a.schedule_date).toLocaleString('en',{month:'short'})}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-slate-800 text-sm">{formatDate(a.schedule_date)}</p>
                      <span className={cn('badge text-xs',APPT_STATUS_COLORS[a.status])}>{a.status}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                      <span className="flex items-center gap-1"><Clock size={11}/>{formatTime(a.time_slot)}</span>
                      {isStaff && a.user && <span className="flex items-center gap-1"><User size={11}/>{a.user.first_name} {a.user.last_name}</span>}
                      {a.order && <span>Order: <span className="font-mono">{a.order.order_number}</span></span>}
                    </div>
                  </div>
                  {isStaff && (
                    <div className="flex items-center gap-2 shrink-0">
                      {a.status==='Confirmed' && <button disabled={acting} onClick={()=>updateStatus(a.appointment_id,'Completed')} className="btn-primary py-1 px-3 text-xs bg-green-600 hover:bg-green-700"><CheckCircle size={12}/>Complete</button>}
                      {a.status==='Confirmed' && <button disabled={acting} onClick={()=>setReschedule(a)} className="btn-secondary py-1 px-3 text-xs">Reschedule</button>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past / Completed */}
        {past.length > 0 && (
          <div className="card overflow-hidden opacity-75">
            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <CheckCircle size={15} className="text-green-600"/><h3 className="section-title text-slate-500">Completed / Past ({past.length})</h3>
            </div>
            <div className="divide-y divide-slate-50">
              {past.slice(0,5).map(a=>(
                <div key={a.appointment_id} className="flex items-center gap-4 px-6 py-3 text-sm text-slate-500">
                  <span className="w-16 font-mono text-xs text-center">{formatDate(a.schedule_date)}</span>
                  <span className={cn('badge text-xs',APPT_STATUS_COLORS[a.status])}>{a.status}</span>
                  {isStaff && a.user && <span>{a.user.first_name} {a.user.last_name}</span>}
                  <span className="ml-auto text-xs">{formatTime(a.time_slot)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {appts.length===0 && !loading && <EmptyState icon={CalendarDays} title="No appointments found" description="Book an appointment to get started." action={<button onClick={()=>setShowBook(true)} className="btn-primary"><Plus size={14}/>Book Now</button>}/>}
      </div>

      {showBook && <BookModal onClose={()=>setShowBook(false)} onBooked={()=>{setShowBook(false);fetchAppts();toast('Appointment booked!','success')}} />}
      {reschedule && <RescheduleModal appt={reschedule} onClose={()=>setReschedule(null)} onDone={()=>{setReschedule(null);fetchAppts();toast('Appointment rescheduled!','success')}} />}
    </div>
  )
}

function BookModal({ onClose, onBooked }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [slots, setSlots]     = useState([])
  const [orders, setOrders]   = useState([])
  const [form, setForm]       = useState({ slot_id:'', order_id:'', or_number:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase.from('appointment_slots').select('*').gte('slot_date', today).order('slot_date').order('slot_time').then(({ data }) => setSlots((data||[]).filter(s=>s.current_bookings<s.max_capacity)))
    supabase.from('orders').select('order_id,order_number,status').eq('user_id', profile.user_id).in('status',['Pending','Ready']).then(({ data }) => setOrders(data||[]))
  }, [])

  async function submit() {
    if (!form.slot_id) { toast('Please select a time slot.','warning'); return }
    setLoading(true)
    try {
      const slot = slots.find(s=>s.slot_id===form.slot_id)
      await supabase.from('appointments').insert({ user_id:profile.user_id, order_id:form.order_id||null, schedule_date:slot.slot_date, time_slot:slot.slot_time, status:'Confirmed', or_number:form.or_number||null, notes:form.notes||null })
      await supabase.from('appointment_slots').update({ current_bookings:slot.current_bookings+1 }).eq('slot_id',slot.slot_id)
      onBooked()
    } catch(e) { toast(e.message,'error') } finally { setLoading(false) }
  }

  const byDate = slots.reduce((acc,s)=>{ if(!acc[s.slot_date])acc[s.slot_date]=[]; acc[s.slot_date].push(s); return acc },{})

  return (
    <Modal open={true} onClose={onClose} title="Book Appointment" size="md">
      <div className="space-y-4">
        <div>
          <label className="label">Select Time Slot</label>
          <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-3">
            {Object.entries(byDate).map(([date, daySlots])=>(
              <div key={date}>
                <p className="text-xs font-bold text-slate-500 mb-2">{new Date(date).toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}</p>
                <div className="flex flex-wrap gap-2">
                  {daySlots.map(slot=>(
                    <button key={slot.slot_id} onClick={()=>setForm(f=>({...f,slot_id:slot.slot_id}))}
                      className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all', form.slot_id===slot.slot_id?'border-brand-500 bg-brand-50 text-brand-700':'border-slate-200 hover:border-brand-300 text-slate-600')}>
                      {slot.slot_time?.slice(0,5)} <span className="opacity-60">({slot.max_capacity-slot.current_bookings} left)</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {slots.length===0 && <p className="text-sm text-slate-400 text-center py-4">No available slots at the moment.</p>}
          </div>
        </div>
        {orders.length > 0 && <div><label className="label">Link Order (optional)</label><select className="input" value={form.order_id} onChange={e=>setForm(f=>({...f,order_id:e.target.value}))}><option value="">— None —</option>{orders.map(o=><option key={o.order_id} value={o.order_id}>{o.order_number} ({o.status})</option>)}</select></div>}
        <div><label className="label">OR Number (if paid)</label><input className="input" placeholder="Official Receipt #" value={form.or_number} onChange={e=>setForm(f=>({...f,or_number:e.target.value}))}/></div>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={submit} disabled={loading} className="btn-primary">{loading?<Loader2 size={14} className="animate-spin"/>:'Book Appointment'}</button></div>
      </div>
    </Modal>
  )
}

function RescheduleModal({ appt, onClose, onDone }) {
  const toast = useToast()
  const [slots, setSlots]     = useState([])
  const [slotId, setSlotId]   = useState('')
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase.from('appointment_slots').select('*').gte('slot_date',today).order('slot_date').order('slot_time').then(({data})=>setSlots((data||[]).filter(s=>s.current_bookings<s.max_capacity)))
  },[])

  async function submit() {
    if (!slotId) { toast('Select a slot.','warning'); return }
    setLoading(true)
    try {
      const slot = slots.find(s=>s.slot_id===slotId)
      await supabase.from('appointments').update({ schedule_date:slot.slot_date, time_slot:slot.slot_time, status:'Rescheduled' }).eq('appointment_id',appt.appointment_id)
      await supabase.from('appointment_slots').update({ current_bookings:slot.current_bookings+1 }).eq('slot_id',slotId)
      onDone()
    } catch(e) { toast(e.message,'error') } finally { setLoading(false) }
  }

  const byDate = slots.reduce((acc,s)=>{ if(!acc[s.slot_date])acc[s.slot_date]=[]; acc[s.slot_date].push(s); return acc },{})
  return (
    <Modal open={true} onClose={onClose} title="Reschedule Appointment" size="sm">
      <div className="space-y-3">
        <div className="max-h-56 overflow-y-auto space-y-3">
          {Object.entries(byDate).map(([date,daySlots])=>(
            <div key={date}>
              <p className="text-xs font-bold text-slate-500 mb-1">{new Date(date).toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric'})}</p>
              <div className="flex flex-wrap gap-1.5">
                {daySlots.map(slot=><button key={slot.slot_id} onClick={()=>setSlotId(slot.slot_id)} className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold',slotId===slot.slot_id?'border-brand-500 bg-brand-50 text-brand-700':'border-slate-200 hover:border-brand-300')}>{slot.slot_time?.slice(0,5)}</button>)}
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={submit} disabled={loading} className="btn-primary">{loading?<Loader2 size={14} className="animate-spin"/>:'Confirm'}</button></div>
      </div>
    </Modal>
  )
}
