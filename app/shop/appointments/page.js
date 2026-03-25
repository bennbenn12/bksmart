'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { formatDate, formatTime, APPT_STATUS_COLORS, cn } from '@/lib/utils'
import { CalendarDays, Plus, ArrowLeft, Clock, CheckCircle, RefreshCw, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function MyAppointmentsPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showBook, setBook]   = useState(false)
  const supabase = createClient()

  const fetchAppts = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('appointments')
      .select('*, order:order_id(order_number)')
      .eq('user_id', profile.user_id)
      .order('schedule_date',{ascending:false})
    setAppts(data||[]); setLoading(false)
  }, [profile])

  useRealtime({ tables:['appointments'], onRefresh:fetchAppts, enabled:!!profile })
  useEffect(() => { if (profile) fetchAppts() }, [profile])

  const today = new Date().toISOString().split('T')[0]
  const upcoming = appts.filter(a=>a.schedule_date>=today&&a.status!=='Completed').slice(0, 50)
  const past     = appts.filter(a=>a.schedule_date<today||a.status==='Completed').slice(0, 20)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/shop/profile" className="btn-ghost p-1.5"><ArrowLeft size={16}/></Link>
        <h1 className="text-2xl font-display font-bold text-hnu-dark">My Appointments</h1>
        <button onClick={()=>setBook(true)} className="btn-primary ml-auto text-sm"><Plus size={14}/> Book</button>
      </div>

      <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
        <span className="live-dot"/> Live — updates automatically
      </div>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-slate-600 text-sm uppercase tracking-wide">Upcoming ({upcoming.length})</h2>
          {upcoming.map(a=>(
            <div key={a.appointment_id} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-14 h-14 bg-brand-50 rounded-xl flex flex-col items-center justify-center shrink-0 border border-brand-100">
                <span className="text-lg font-black text-brand-700 leading-none">{new Date(a.schedule_date).getDate()}</span>
                <span className="text-[10px] font-bold text-brand-400 uppercase">{new Date(a.schedule_date).toLocaleString('en',{month:'short'})}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-slate-800 text-sm">{formatDate(a.schedule_date)}</span>
                  <span className={cn('badge text-xs',APPT_STATUS_COLORS[a.status]||'bg-slate-100')}>{a.status}</span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={11}/>{formatTime(a.time_slot)}</span>
                  {a.or_number && <span>OR: {a.or_number}</span>}
                  {a.order && <span>Order: <span className="font-mono">{a.order.order_number}</span></span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past */}
      {past.length > 0 && (
        <div className="space-y-2 opacity-60">
          <h2 className="font-bold text-slate-400 text-xs uppercase tracking-wide">Past / Completed</h2>
          {past.slice(0,5).map(a=>(
            <div key={a.appointment_id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3 text-sm">
              <span className="text-slate-400 text-xs w-20">{formatDate(a.schedule_date)}</span>
              <span className={cn('badge text-xs',APPT_STATUS_COLORS[a.status]||'bg-slate-100')}>{a.status}</span>
              <span className="text-slate-400 text-xs ml-auto">{formatTime(a.time_slot)}</span>
            </div>
          ))}
        </div>
      )}

      {appts.length===0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <CalendarDays size={48} className="mx-auto text-slate-200 mb-4"/>
          <p className="font-semibold text-slate-500 mb-2">No appointments yet.</p>
          <button onClick={()=>setBook(true)} className="btn-primary"><Plus size={14}/> Book Appointment</button>
        </div>
      )}

      {showBook && <BookModal onClose={()=>setBook(false)} onBooked={()=>{setBook(false);fetchAppts();toast('Appointment booked!','success')}}/>}
    </div>
  )
}

function BookModal({ onClose, onBooked }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [slots, setSlots]   = useState([])
  const [orders, setOrders] = useState([])
  const [form, setForm]     = useState({ slot_id:'', order_id:'', or_number:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase.from('appointment_slots').select('*').gte('slot_date',today).order('slot_date').order('slot_time').then(({data})=>setSlots((data||[]).filter(s=>s.current_bookings<s.max_capacity)))
    supabase.from('orders').select('order_id,order_number,status').eq('user_id',profile.user_id).in('status',['Pending','Ready']).then(({data})=>setOrders(data||[]))
  },[])

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-slate-800">Book Appointment</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Select Time Slot</label>
            <div className="space-y-3 max-h-48 overflow-y-auto border border-slate-100 rounded-xl p-3">
              {Object.entries(byDate).map(([date,daySlots])=>(
                <div key={date}>
                  <p className="text-xs font-bold text-slate-500 mb-1.5">{new Date(date).toLocaleDateString('en-PH',{weekday:'long',month:'long',day:'numeric'})}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {daySlots.map(slot=>(
                      <button key={slot.slot_id} onClick={()=>setForm(f=>({...f,slot_id:slot.slot_id}))}
                        className={cn('px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all',form.slot_id===slot.slot_id?'border-hnu-dark bg-hnu-dark/10 text-hnu-dark':'border-slate-200 hover:border-hnu-dark/40 text-slate-600')}>
                        {slot.slot_time?.slice(0,5)} <span className="opacity-60">({slot.max_capacity-slot.current_bookings} left)</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              {slots.length===0 && <p className="text-sm text-slate-400 text-center py-4">No available slots.</p>}
            </div>
          </div>
          {orders.length > 0 && <div><label className="block text-sm font-semibold text-slate-700 mb-1">Link to Order (optional)</label><select className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" value={form.order_id} onChange={e=>setForm(f=>({...f,order_id:e.target.value}))}><option value="">— None —</option>{orders.map(o=><option key={o.order_id} value={o.order_id}>{o.order_number} ({o.status})</option>)}</select></div>}
          <div><label className="block text-sm font-semibold text-slate-700 mb-1">OR Number (if paid at Teller)</label><input className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" placeholder="Official Receipt #" value={form.or_number} onChange={e=>setForm(f=>({...f,or_number:e.target.value}))}/></div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 flex gap-2 shrink-0">
          <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          <button onClick={submit} disabled={loading||!form.slot_id} className="btn-primary flex-1 justify-center">{loading?<Loader2 size={14} className="animate-spin"/>:'Confirm Booking'}</button>
        </div>
      </div>
    </div>
  )
}
