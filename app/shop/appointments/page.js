'use client'
import { useEffect, useState, useCallback, Suspense } from 'react'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { formatDate, formatTime, APPT_STATUS_COLORS, cn } from '@/lib/utils'
import { CalendarDays, Plus, ArrowLeft, Clock, CheckCircle, RefreshCw, Loader2, MapPin, Package } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

const APPT_STATUS_HINTS = {
  Pending:     '📅 Your appointment is confirmed. Please arrive on time.',
  Confirmed:   '✅ Appointment confirmed! See you at the Bookstore.',
  Completed:   '✅ Your appointment has been completed.',
  Cancelled:   '❌ This appointment was cancelled.',
  Rescheduled: '📅 Your appointment has been rescheduled.',
}

// Check if appointment was auto-completed due to order release
function isOrderReleasedAppt(appt) {
  return appt.status === 'Completed' && appt.notes?.includes('Order released')
}

export default function MyAppointmentsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-12"><Loader2 className="animate-spin" size={24}/></div>}>
      <MyAppointmentsContent />
    </Suspense>
  )
}

function MyAppointmentsContent() {
  const { profile } = useAuth()
  const toast = useToast()
  const [appts, setAppts]     = useState([])
  const [loading, setLoading] = useState(true)
  const [showBook, setBook]   = useState(false)
  const supabase = createClient()
  const searchParams = useSearchParams()
  const preSelectedOrderId = searchParams.get('orderId')

  const fetchAppts = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('appointments')
      .select(`*, order:order_id(order_number, order_items(quantity, bookstore_items(name)))`)
      .eq('user_id', profile.id_number)
      .order('schedule_date',{ascending:false})
    setAppts(data||[]); setLoading(false)
  }, [profile])

  useRealtime({ tables:['appointments'], onRefresh:fetchAppts, enabled:!!profile })
  useEffect(() => { if (profile) fetchAppts() }, [profile])

  const todayStr = new Date().toISOString().split('T')[0]
  const upcoming = appts.filter(a=>{
    const apptDate = a.schedule_date?.slice(0,10) || a.schedule_date
    return apptDate >= todayStr && !['Completed','Cancelled'].includes(a.status)
  }).slice(0, 50)
  const past = appts.filter(a=>{
    const apptDate = a.schedule_date?.slice(0,10) || a.schedule_date
    return apptDate < todayStr || ['Completed','Cancelled'].includes(a.status)
  }).slice(0, 20)

  async function cancelAppt(appt) {
    try {
      await supabase.from('appointments').update({ status: 'Cancelled' }).eq('appointment_id', appt.appointment_id)
      // Release slot
      const { data: slotData } = await supabase.from('appointment_slots')
        .select('slot_id, current_bookings')
        .eq('slot_date', appt.schedule_date)
        .eq('slot_time', appt.time_slot)
        .single()
      if (slotData) {
        await supabase.from('appointment_slots').update({ current_bookings: Math.max(0, slotData.current_bookings - 1) }).eq('slot_id', slotData.slot_id)
      }
      toast('Appointment cancelled.', 'success')
      fetchAppts()
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/shop/profile" className="btn-ghost p-1.5"><ArrowLeft size={16}/></Link>
        <h1 className="text-2xl font-display font-bold text-hnu-dark">My Appointments</h1>
        <button onClick={()=>setBook(true)} className="btn-primary ml-auto text-sm"><Plus size={14}/> Book</button>
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
                  {a.status==='Pending' && <span className="text-[10px] text-yellow-600">Awaiting staff confirmation</span>}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Clock size={11}/>{formatTime(a.time_slot)}</span>
                  {a.or_number && <span>OR: {a.or_number}</span>}
                  {a.order && <span>Order: <span className="font-mono">{a.order.order_number}</span></span>}
                </div>
                {/* Show order items if appointment is linked to an order */}
                {a.order?.order_items && a.order.order_items.length > 0 && (
                  <div className="mt-2 text-xs text-slate-600">
                    <p className="text-slate-400 mb-1">Items:</p>
                    <div className="flex flex-wrap gap-1">
                      {a.order.order_items.slice(0, 3).map((item, idx) => (
                        <span key={idx} className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          {item.bookstore_items?.name} {item.quantity > 1 && `×${item.quantity}`}
                        </span>
                      ))}
                      {a.order.order_items.length > 3 && (
                        <span className="text-slate-400">+{a.order.order_items.length - 3} more</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {a.status==='Pending' && (
                <button onClick={()=>cancelAppt(a)} className="text-xs text-red-400 hover:text-red-600 shrink-0">Cancel</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Past / Completed */}
      {past.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-slate-500 text-sm uppercase tracking-wide">Past / Completed</h2>
          {past.slice(0,5).map(a=>{
            const orderReleased = isOrderReleasedAppt(a)
            return (
            <div key={a.appointment_id} className={cn(
              "bg-white rounded-xl border p-4 flex flex-col gap-2",
              orderReleased ? "border-green-200 bg-green-50/50" : "border-slate-100 opacity-60"
            )}>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-slate-500 text-xs w-20">{formatDate(a.schedule_date)}</span>
                <span className={cn('badge text-xs',APPT_STATUS_COLORS[a.status]||'bg-slate-100')}>{a.status}</span>
                <span className="text-slate-500 text-xs ml-auto">{formatTime(a.time_slot)}</span>
              </div>
              {/* Special message for order-released appointments */}
              {orderReleased && (
                <div className="mt-1 p-3 bg-green-100 border border-green-200 rounded-lg">
                  <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    <CheckCircle size={14}/> Item already claimed
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    Your order was released/claimed. This appointment was automatically completed.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={()=>setBook(true)} className="btn-primary py-1.5 px-3 text-xs">
                      <CalendarDays size={12}/> Reschedule
                    </button>
                    <button onClick={()=>cancelAppt(a)} className="btn-secondary py-1.5 px-3 text-xs text-red-600 hover:text-red-700">
                      Cancel Appointment
                    </button>
                  </div>
                </div>
              )}
              {!orderReleased && (
                <div className="text-xs text-slate-400">{APPT_STATUS_HINTS[a.status]}</div>
              )}
            </div>
          )})}
        </div>
      )}

      {appts.length===0 && !loading && (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <CalendarDays size={48} className="mx-auto text-slate-200 mb-4"/>
          <p className="font-semibold text-slate-500">No appointments yet.</p>
          <p className="text-sm text-slate-400 mt-1">Book an appointment for hassle-free pickup.</p>
        </div>
      )}

      {/* Info Card */}
      {upcoming.length > 0 && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <MapPin size={18} className="text-blue-600 shrink-0 mt-0.5"/>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Pickup Location</p>
            <p className="text-blue-600">HNU Bookstore · Finance Office Building · Ground Floor</p>
            <p className="text-xs text-blue-500 mt-1">Please arrive 5 minutes before your scheduled time.</p>
          </div>
        </div>
      )}

      {showBook && <BookModal preSelectedOrderId={preSelectedOrderId} onClose={()=>setBook(false)} onBooked={()=>{setBook(false);fetchAppts();toast('Appointment booked!','success')}}/>}
    </div>
  )
}

function BookModal({ onClose, onBooked, preSelectedOrderId }) {
  const { profile } = useAuth()
  const toast = useToast()
  const [slots, setSlots]   = useState([])
  const [orders, setOrders] = useState([])
  const [preSelectedOrder, setPreSelectedOrder] = useState(null)
  const [form, setForm]     = useState({ slot_id:'', order_id:'', or_number:'', notes:'' })
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    supabase.from('appointment_slots').select('*').gte('slot_date',today).order('slot_date').order('slot_time').then(({data,error})=>{
      if (error) console.error('Error loading slots:', error)
      setSlots((data||[]).filter(s=>s.current_bookings<s.max_capacity))
    })
    supabase.from('orders').select('order_id,order_number,status').eq('user_id',profile.id_number).in('status',['Pending','Ready']).then(({data,error})=>{
      if (error) {
        console.error('Error loading orders:', error)
        return
      }
      setOrders(data||[])
      // If preSelectedOrderId exists, find and set that order
      if (preSelectedOrderId && data) {
        const matched = data.find(o => o.order_id === preSelectedOrderId)
        if (matched) {
          setPreSelectedOrder(matched)
          setForm(f => ({ ...f, order_id: preSelectedOrderId }))
        }
      }
    })
  },[])

  async function submit() {
    if (!form.slot_id) { toast('Please select a time slot.','warning'); return }
    setLoading(true)
    try {
      const slot = slots.find(s=>s.slot_id===form.slot_id)
      const { generateApptNumber } = await import('@/lib/utils')
      await supabase.from('appointments').insert({ user_id:profile.id_number, order_id:form.order_id||null, schedule_date:slot.slot_date, time_slot:slot.slot_time, status:'Pending', or_number:form.or_number||null, notes:form.notes||null, appt_number:generateApptNumber() })
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
          {orders.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {preSelectedOrder ? 'Order for Pickup' : 'Link to Order (optional)'}
              </label>
              {preSelectedOrder ? (
                <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg flex items-center gap-2">
                  <Package size={16} className="text-purple-600"/>
                  <span className="text-sm font-medium text-purple-800">{preSelectedOrder.order_number}</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{preSelectedOrder.status}</span>
                  <span className="text-xs text-purple-500 ml-auto">Pre-selected</span>
                </div>
              ) : (
                <select className="w-full p-2.5 border border-slate-200 rounded-lg text-sm" value={form.order_id} onChange={e=>setForm(f=>({...f,order_id:e.target.value}))}>
                  <option value="">— None —</option>
                  {orders.map(o=><option key={o.order_id} value={o.order_id}>{o.order_number} ({o.status})</option>)}
                </select>
              )}
            </div>
          )}
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
