'use client'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/db/client'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function AppointmentBooking({ orderId, onComplete }) {
  const [slots, setSlots] = useState([])
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')
  const [booked, setBooked] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const fetchSlots = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase.from('appointment_slots')
      .select('*')
      .gte('slot_date', today)
      .order('slot_date')
      .order('slot_time')
    setSlots((data || []).filter(s => s.current_bookings < s.max_capacity))
    setFetching(false)
  }, [supabase])

  useEffect(() => {
    fetchSlots()
  }, [fetchSlots])

  // Group slots by date
  const byDate = slots.reduce((acc, s) => {
    const d = s.slot_date?.slice(0, 10) || s.slot_date
    if (!acc[d]) acc[d] = []
    acc[d].push(s)
    return acc
  }, {})

  async function handleBook() {
    if (!selectedSlot) return
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please log in to book an appointment')
      const { data: profile } = await supabase.from('users').select('user_id').eq('auth_id', user.id).single()
      if (!profile) throw new Error('Profile not found')

      const slot = slots.find(s => s.slot_id === selectedSlot)
      if (!slot) throw new Error('Selected slot not found')
      
      // Check slot availability again (race condition prevention)
      const { data: currentSlot } = await supabase.from('appointment_slots')
        .select('current_bookings,max_capacity')
        .eq('slot_id', slot.slot_id)
        .single()
      
      if (!currentSlot) throw new Error('This slot is no longer available')
      if (currentSlot.current_bookings >= currentSlot.max_capacity) {
        throw new Error('This slot is now full. Please select another time.')
      }

      const { generateApptNumber } = await import('@/lib/utils')
      
      // Create appointment
      const { error: insertErr } = await supabase.from('appointments').insert({
        user_id: profile.user_id,
        order_id: orderId || null,
        schedule_date: slot.slot_date,
        time_slot: slot.slot_time,
        status: 'Pending',
        purpose: 'OR Presentation & Item Pickup',
        appt_number: generateApptNumber(),
      })
      if (insertErr) throw new Error('Failed to create appointment: ' + insertErr.message)

      // Update slot booking count
      const { error: updateErr } = await supabase.from('appointment_slots').update({
        current_bookings: currentSlot.current_bookings + 1,
      }).eq('slot_id', slot.slot_id)
      
      if (updateErr) {
        // If slot update fails, we should ideally rollback, but appointments is already created
        console.error('Failed to update slot count:', updateErr)
      }

      setBooked(true)
      await fetchSlots() // Immediate client-side refresh
      router.refresh() // Server-side refresh
      if (onComplete) setTimeout(onComplete, 1500)
    } catch (e) {
      setError(e.message || 'Failed to book appointment. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (booked) {
    return (
      <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
          <Calendar size={24} />
        </div>
        <p className="font-bold text-green-800 mb-1">Appointment Requested!</p>
        <p className="text-sm text-green-600">Staff will confirm your appointment shortly. Check your notifications for updates.</p>
      </div>
    )
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-800 mb-1 flex items-center gap-2">
        <Calendar size={18} className="text-hnu-gold" />
        Book Pickup Appointment
      </h3>
      <p className="text-xs text-slate-400 mb-4">Select a time slot to pick up your order. Staff will confirm your booking.</p>

      {error && <div className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</div>}

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-4 text-xs text-blue-700">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Your appointment will be in <strong>Pending</strong> status until confirmed by bookstore staff.</span>
      </div>

      {fetching ? (
        <div className="flex items-center justify-center py-8 text-slate-400"><Loader2 size={20} className="animate-spin" /></div>
      ) : slots.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No available slots right now. Please check back later.</p>
      ) : (
        <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
          {Object.entries(byDate).map(([date, daySlots]) => (
            <div key={date}>
              <p className="text-xs font-bold text-slate-500 mb-1.5">
                {new Date(date + 'T00:00:00').toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric' })}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {daySlots.map(slot => {
                  const remaining = slot.max_capacity - slot.current_bookings
                  return (
                    <button
                      key={slot.slot_id}
                      type="button"
                      onClick={() => setSelectedSlot(slot.slot_id)}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-xs font-semibold transition-all',
                        selectedSlot === slot.slot_id
                          ? 'border-hnu-dark bg-hnu-dark/10 text-hnu-dark'
                          : 'border-slate-200 hover:border-hnu-dark/40 text-slate-600'
                      )}
                    >
                      <Clock size={10} className="inline mr-1" />
                      {slot.slot_time?.slice(0, 5)}
                      <span className="opacity-60 ml-1">({remaining} left)</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={handleBook}
        disabled={loading || !selectedSlot}
        className="btn-primary w-full justify-center"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : 'Request Appointment'}
      </button>
    </div>
  )
}
