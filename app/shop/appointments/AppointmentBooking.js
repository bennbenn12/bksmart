'use client'
import { useState } from 'react'
import { createAppointment } from './actions'
import { Calendar, Clock, Loader2, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AppointmentBooking({ orderId, onComplete }) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Simple slot generation (9 AM - 4 PM)
  const slots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30', '16:00'
  ]

  // Get tomorrow's date as min date
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await createAppointment(orderId, date, time)
    
    if (result.success) {
      if (onComplete) {
        onComplete()
      } else {
        router.refresh()
      }
    } else {
      setError(result.message)
    }
    setLoading(false)
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
      <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Calendar size={18} className="text-hnu-gold" />
        Book Pickup Appointment
      </h3>
      
      {error && <div className="text-red-600 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Select Date</label>
          <input 
            type="date" 
            className="input" 
            min={minDate}
            value={date}
            onChange={e => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="label">Select Time</label>
          <div className="grid grid-cols-3 gap-2">
            {slots.map(slot => (
              <button
                key={slot}
                type="button"
                onClick={() => setTime(slot)}
                className={`py-2 px-1 text-sm rounded-lg border transition-all ${
                  time === slot 
                    ? 'bg-hnu-dark text-white border-hnu-dark' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-hnu-gold'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !date || !time}
          className="btn-primary w-full justify-center"
        >
          {loading ? <Loader2 className="animate-spin" /> : 'Confirm Appointment'}
        </button>
      </form>
    </div>
  )
}
