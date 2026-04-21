'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Pagination } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { formatDate, formatTime, APPT_STATUS_COLORS, cn } from '@/lib/utils'
import { CalendarDays, Plus, Search, CheckCircle, Clock, RefreshCw, Loader2, Settings, Trash2, X, ShoppingCart, Package, Info, Eye } from 'lucide-react'

const STATUSES = ['Pending','Confirmed','Completed','Rescheduled','Cancelled']

export default function AppointmentsPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [appts, setAppts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatus] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [showSlots, setShowSlots] = useState(false)
  const PAGE = 12
  const supabase = createClient()
  const router = useRouter()

  const fetchAppts = useCallback(async () => {
    if (!profile) return
    setLoading(true)
    try {
      let q = supabase.from('appointments')
        .select('*', { count: 'exact' })
        .order('schedule_date', { ascending: false })
        .range((page - 1) * PAGE, page * PAGE - 1)
      if (statusFilter) q = q.eq('status', statusFilter)
      if (dateFilter) q = q.eq('schedule_date', dateFilter)
      if (search) q = q.or(`appt_number.ilike.%${search}%,or_number.ilike.%${search}%`)
      const { data, count, error } = await q
      if (error) throw error
    // Fetch user info for each appointment
    if (data?.length) {
      const allIds = [...new Set([...data.map(a => a.user_id), ...data.map(a => a.confirmed_by)].filter(Boolean))]
      if (allIds.length) {
        const { data: users } = await supabase.from('users').select('user_id,first_name,last_name,id_number').in('user_id', allIds)
        const userMap = Object.fromEntries((users || []).map(u => [u.user_id, u]))
        data.forEach(a => { a._user = userMap[a.user_id] || null; a._confirmedBy = userMap[a.confirmed_by] || null })
      }
      // Fetch linked orders with items
      const orderIds = [...new Set(data.map(a => a.order_id).filter(Boolean))]
      if (orderIds.length) {
        const { data: ords } = await supabase.from('orders')
          .select('order_id,order_number,items:order_items(quantity,item:item_id(name,category))')
          .in('order_id', orderIds)
        const ordMap = Object.fromEntries((ords || []).map(o => [o.order_id, o]))
        data.forEach(a => { a._order = ordMap[a.order_id] || null })
      }
    }
    setAppts(data || [])
    setTotal(count || 0)
  } catch (e) {
    console.error('Error fetching appointments:', e)
  } finally {
    setLoading(false)
  }
}, [profile, statusFilter, dateFilter, search, page])

  useRealtime({ tables:['appointments','appointment_slots'], onRefresh:fetchAppts, enabled:!!profile })
  useEffect(() => { if (profile) fetchAppts() }, [profile, statusFilter, dateFilter, search, page])

  async function updateApptStatus(appt, newStatus) {
    try {
      const updates = { status: newStatus, confirmed_by: profile.user_id }
      if (newStatus === 'Completed') updates.completed_at = new Date().toISOString()
      await supabase.from('appointments').update(updates).eq('appointment_id', appt.appointment_id)

      // If cancelling/declining, release the slot booking
      if (newStatus === 'Cancelled' && appt.status !== 'Cancelled') {
        const { data: slotData } = await supabase.from('appointment_slots')
          .select('slot_id, current_bookings')
          .eq('slot_date', appt.schedule_date)
          .eq('slot_time', appt.time_slot)
          .single()
        if (slotData) {
          await supabase.from('appointment_slots').update({
            current_bookings: Math.max(0, slotData.current_bookings - 1)
          }).eq('slot_id', slotData.slot_id)
        }
      }

      // Notify the student
      const notifMap = {
        Confirmed:   { title:'Appointment Confirmed', message:`Your appointment on ${formatDate(appt.schedule_date)} at ${formatTime(appt.time_slot)} has been confirmed by staff.`, type:'success' },
        Completed:   { title:'Appointment Completed', message:`Your appointment on ${formatDate(appt.schedule_date)} has been marked complete. Thank you!`, type:'success' },
        Rescheduled: { title:'Appointment Rescheduled', message:`Your appointment on ${formatDate(appt.schedule_date)} at ${formatTime(appt.time_slot)} has been rescheduled. Please check for updates.`, type:'warning' },
        Cancelled:   { title:'Appointment Cancelled', message:`Your appointment on ${formatDate(appt.schedule_date)} at ${formatTime(appt.time_slot)} has been cancelled by staff.`, type:'alert' },
      }
      const n = notifMap[newStatus]
      if (n && appt.user_id) {
        await supabase.from('notifications').insert({ user_id: appt.user_id, title: n.title, message: n.message, type: n.type, reference_type: 'appointment', reference_id: appt.appointment_id })
      }

      toast(`Appointment marked as ${newStatus}.`, 'success')
      await fetchAppts() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch (e) { toast(e.message, 'error') }
  }

  return (
    <div className="page-enter">
      <Header title="Appointments" />
      <div className="p-6 space-y-5">
        {/* Helpful info banner */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
          <Info size={18} className="text-blue-600 shrink-0 mt-0.5"/>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Quick Guide for Staff</p>
            <ul className="text-xs text-blue-600 space-y-1 list-disc list-inside">
              <li><strong>Pending</strong> = Awaiting your confirmation</li>
              <li><strong>Confirmed</strong> = Student notified, ready for pickup at scheduled time</li>
              <li>Linked orders show items below — check the <strong>Order #</strong> when student arrives</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="input pl-9" placeholder="Search appt # or OR number..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} />
          </div>
          <select className="input w-36" value={statusFilter} onChange={e => { setStatus(e.target.value); setPage(1) }}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input type="date" className="input w-40" value={dateFilter} onChange={e => { setDateFilter(e.target.value); setPage(1) }} />
          {dateFilter && <button onClick={() => setDateFilter('')} className="btn-ghost text-xs">Clear date</button>}
          <button onClick={fetchAppts} className="btn-ghost gap-1 text-xs"><RefreshCw size={12} /> Refresh</button>
          <button onClick={() => setShowSlots(true)} className="btn-primary ml-auto"><Settings size={14} /> Manage Slots</button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="th">Appt #</th>
                  <th className="th">Student</th>
                  <th className="th">Date & Time</th>
                  <th className="th">Purpose / Items</th>
                  <th className="th">Status</th>
                  <th className="th">Processed By</th>
                  <th className="th text-right">Staff Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={7} className="py-12"><LoadingSpinner /></td></tr>
                  : appts.length === 0 ? <tr><td colSpan={7}><EmptyState icon={CalendarDays} title="No appointments found" /></td></tr>
                    : appts.map(a => (
                      <tr key={a.appointment_id} className="hover:bg-slate-50 transition-colors">
                        <td className="td font-mono font-bold text-brand-700 text-xs">{a.appt_number}</td>
                        <td className="td">
                          <div className="font-semibold text-slate-800">{a._user?.first_name} {a._user?.last_name}</div>
                          <div className="text-xs font-mono font-bold text-brand-600">{a._user?.id_number || '—'}</div>
                        </td>
                        <td className="td">
                          <div className="text-slate-700 font-medium">{formatDate(a.schedule_date)}</div>
                          <div className="flex items-center gap-1 text-slate-500 text-xs mt-0.5"><Clock size={11} />{formatTime(a.time_slot)}</div>
                        </td>
                        <td className="td text-xs">
                          {/* Purpose/Items column - make it clear what they're picking up */}
                          <div className="space-y-1">
                            {a.purpose && (
                              <div className="flex items-center gap-1 text-slate-600">
                                <Info size={11} className="text-blue-500"/>
                                <span>{a.purpose}</span>
                              </div>
                            )}
                            {a._order ? (
                              <div className="bg-brand-50 border border-brand-100 rounded-lg p-2">
                                <div className="flex items-center gap-1 text-brand-700 font-semibold mb-1">
                                  <ShoppingCart size={11}/>
                                  Order: {a._order.order_number}
                                </div>
                                {a._order.items && a._order.items.length > 0 ? (
                                  <div className="space-y-0.5">
                                    {a._order.items.slice(0, 3).map((item, idx) => (
                                      <div key={idx} className="flex items-center justify-between text-[10px]">
                                        <span className="text-slate-600 truncate max-w-[120px]">{item.item?.name}</span>
                                        <span className="text-slate-400">×{item.quantity}</span>
                                      </div>
                                    ))}
                                    {a._order.items.length > 3 && (
                                      <div className="text-[10px] text-brand-600 font-medium">+{a._order.items.length - 3} more items</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-[10px] text-slate-400">No items in order</div>
                                )}
                              </div>
                            ) : a.or_number ? (
                              <div className="flex items-center gap-1 text-purple-600">
                                <span className="font-semibold">OR:</span> {a.or_number}
                              </div>
                            ) : (
                              <span className="text-slate-400">No order linked</span>
                            )}
                            {a.notes && <div className="text-[10px] text-slate-500 italic">Note: {a.notes}</div>}
                          </div>
                        </td>
                        <td className="td">
                          <div className="flex flex-col gap-1">
                            <span className={cn('badge text-xs', APPT_STATUS_COLORS[a.status] || 'bg-slate-100')}>{a.status}</span>
                            {a.notes?.includes('Order released') && (
                              <span className="text-[10px] text-green-600 flex items-center gap-1">
                                <CheckCircle size={10}/> Auto-completed
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="td text-xs text-slate-500">{a._confirmedBy ? `${a._confirmedBy.first_name} ${a._confirmedBy.last_name}` : '—'}</td>
                        <td className="td text-right">
                          <div className="flex items-center justify-end gap-1">
                            {a.status === 'Pending' && (
                              <>
                                <button onClick={() => updateApptStatus(a, 'Confirmed')} className="btn-primary py-1 px-2 text-xs"><CheckCircle size={11} /> Confirm</button>
                                <button onClick={() => updateApptStatus(a, 'Cancelled')} className="btn-ghost py-1 px-2 text-xs text-red-500"><X size={11} /> Decline</button>
                              </>
                            )}
                            {a.status === 'Confirmed' && (
                              <>
                                <button onClick={() => updateApptStatus(a, 'Completed')} className="btn-primary py-1 px-2 text-xs bg-green-600 hover:bg-green-700"><CheckCircle size={11} /> Complete</button>
                                <button onClick={() => updateApptStatus(a, 'Rescheduled')} className="btn-ghost py-1 px-2 text-xs text-orange-600">Reschedule</button>
                              </>
                            )}
                            {a.status === 'Rescheduled' && (
                              <button onClick={() => updateApptStatus(a, 'Confirmed')} className="btn-primary py-1 px-2 text-xs">Confirm</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={PAGE} onPageChange={setPage} />
        </div>
      </div>

      {showSlots && <ManageSlotsModal onClose={() => setShowSlots(false)} />}
    </div>
  )
}

function ManageSlotsModal({ onClose }) {
  const toast = useToast()
  const supabase = createClient()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newSlot, setNewSlot] = useState({ date: '', time: '09:00', max_capacity: '5' })
  const [bulkDate, setBulkDate] = useState('')
  const [bulkCapacity, setBulkCapacity] = useState('5')

  const TIMES = [
    '08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30',
    '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'
  ]

  const fetchSlots = useCallback(async () => {
    setLoading(true)
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('appointment_slots')
      .select('*')
      .gte('slot_date', today)
      .order('slot_date')
      .order('slot_time')
    setSlots(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchSlots() }, [])

  async function addSlot() {
    if (!newSlot.date || !newSlot.time) { toast('Please select date and time.', 'warning'); return }
    setSaving(true)
    try {
      await supabase.from('appointment_slots').insert({
        slot_date: newSlot.date,
        slot_time: newSlot.time,
        max_capacity: parseInt(newSlot.max_capacity) || 5,
        current_bookings: 0
      })
      toast('Slot added.', 'success')
      setNewSlot(prev => ({ ...prev, time: '09:00' }))
      fetchSlots()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  async function generateBulkSlots() {
    if (!bulkDate) { toast('Please select a date.', 'warning'); return }
    setSaving(true)
    try {
      const cap = parseInt(bulkCapacity) || 5
      const slotsToInsert = TIMES.map(t => ({
        slot_date: bulkDate,
        slot_time: t,
        max_capacity: cap,
        current_bookings: 0
      }))
      // Check which slots already exist for this date
      const { data: existing } = await supabase.from('appointment_slots')
        .select('slot_time')
        .eq('slot_date', bulkDate)
      const existingTimes = new Set((existing || []).map(s => s.slot_time?.slice(0, 5)))
      const newSlots = slotsToInsert.filter(s => !existingTimes.has(s.slot_time))
      if (newSlots.length === 0) {
        toast('All time slots already exist for this date.', 'info')
        setSaving(false)
        return
      }
      for (const slot of newSlots) {
        await supabase.from('appointment_slots').insert(slot)
      }
      toast(`${newSlots.length} slots generated for ${bulkDate}.`, 'success')
      fetchSlots()
    } catch (e) { toast(e.message, 'error') } finally { setSaving(false) }
  }

  async function deleteSlot(slot) {
    if (slot.current_bookings > 0) {
      toast('Cannot delete a slot with existing bookings.', 'error')
      return
    }
    try {
      await supabase.from('appointment_slots').delete().eq('slot_id', slot.slot_id)
      toast('Slot removed.', 'success')
      fetchSlots()
    } catch (e) { toast(e.message, 'error') }
  }

  async function updateCapacity(slot, newCap) {
    const cap = parseInt(newCap)
    if (isNaN(cap) || cap < slot.current_bookings) {
      toast('Capacity cannot be less than current bookings.', 'warning')
      return
    }
    try {
      await supabase.from('appointment_slots').update({ max_capacity: cap }).eq('slot_id', slot.slot_id)
      fetchSlots()
    } catch (e) { toast(e.message, 'error') }
  }

  // Group slots by date
  const byDate = slots.reduce((acc, s) => {
    const d = s.slot_date?.slice(0, 10) || s.slot_date
    if (!acc[d]) acc[d] = []
    acc[d].push(s)
    return acc
  }, {})

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <Modal open={true} onClose={onClose} title="Manage Appointment Time Slots" size="xl">
      <div className="space-y-6">
        {/* Bulk generate */}
        <div className="p-4 bg-brand-50 rounded-xl border border-brand-100">
          <h4 className="text-sm font-bold text-brand-800 mb-3">Quick Generate — All Slots for a Day</h4>
          <p className="text-xs text-brand-600 mb-3">Creates slots every 30 min from 8:00 AM–4:30 PM (skips 12:00–1:00 PM lunch).</p>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" min={minDate} value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
            </div>
            <div>
              <label className="label">Max per Slot</label>
              <input type="number" min="1" className="input w-20" value={bulkCapacity} onChange={e => setBulkCapacity(e.target.value)} />
            </div>
            <button onClick={generateBulkSlots} disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Generate Slots</>}
            </button>
          </div>
        </div>

        {/* Single slot add */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Add Single Slot</h4>
          <div className="flex items-end gap-3 flex-wrap">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" min={minDate} value={newSlot.date} onChange={e => setNewSlot(p => ({ ...p, date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Time</label>
              <select className="input" value={newSlot.time} onChange={e => setNewSlot(p => ({ ...p, time: e.target.value }))}>
                {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Max Capacity</label>
              <input type="number" min="1" className="input w-20" value={newSlot.max_capacity} onChange={e => setNewSlot(p => ({ ...p, max_capacity: e.target.value }))} />
            </div>
            <button onClick={addSlot} disabled={saving} className="btn-secondary">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <><Plus size={14} /> Add</>}
            </button>
          </div>
        </div>

        {/* Existing slots grouped by date */}
        <div>
          <h4 className="text-sm font-bold text-slate-700 mb-3">Upcoming Slots</h4>
          {loading ? <LoadingSpinner /> : Object.keys(byDate).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No upcoming slots. Generate some above.</p>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
              {Object.entries(byDate).map(([date, daySlots]) => (
                <div key={date} className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700">
                      {new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-slate-400">{daySlots.length} slots</span>
                  </div>
                  <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                    {daySlots.map(slot => {
                      const remaining = slot.max_capacity - slot.current_bookings
                      const isFull = remaining <= 0
                      return (
                        <div key={slot.slot_id} className={cn('p-3 rounded-lg border text-center relative group', isFull ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white')}>
                          <p className="text-sm font-bold text-slate-800">{slot.slot_time?.slice(0, 5)}</p>
                          <p className={cn('text-xs font-semibold mt-1', isFull ? 'text-red-600' : 'text-green-600')}>
                            {isFull ? 'Full' : `${remaining}/${slot.max_capacity} available`}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{slot.current_bookings} booked</p>
                          <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            {slot.current_bookings === 0 && (
                              <button onClick={() => deleteSlot(slot)} className="p-1 rounded bg-red-100 text-red-500 hover:bg-red-200" title="Delete slot">
                                <Trash2 size={10} />
                              </button>
                            )}
                          </div>
                          <div className="mt-2">
                            <input
                              type="number"
                              min={slot.current_bookings || 1}
                              className="w-full text-center text-xs border border-slate-200 rounded py-1 focus:outline-none focus:border-brand-400"
                              defaultValue={slot.max_capacity}
                              onBlur={e => { if (e.target.value !== String(slot.max_capacity)) updateCapacity(slot, e.target.value) }}
                              title="Edit max capacity"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      </div>
    </Modal>
  )
}
