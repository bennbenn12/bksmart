'use server'
import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

// Validation helper
function validateAppointmentInput(orderId, date, time, purpose) {
  const errors = []
  
  if (orderId && typeof orderId !== 'string') {
    errors.push('Invalid order ID')
  }
  
  if (!date || !/^(\d{4})-(\d{2})-(\d{2})$/.test(date)) {
    errors.push('Invalid date format. Use YYYY-MM-DD')
  }
  
  if (!time || !/^(\d{2}):(\d{2})(:(\d{2}))?$/.test(time)) {
    errors.push('Invalid time format. Use HH:MM')
  }
  
  if (!purpose || purpose.trim().length < 5) {
    errors.push('Purpose must be at least 5 characters')
  }
  
  // Check if date is in the future
  const appointmentDate = new Date(date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  if (appointmentDate < today) {
    errors.push('Appointment date must be in the future')
  }
  
  return errors.length > 0 ? errors.join(', ') : null
}

export async function createAppointment(orderId, date, time, purpose='OR Presentation & Item Pickup') {
  // Validate inputs
  const validationError = validateAppointmentInput(orderId, date, time, purpose)
  if (validationError) {
    return { success: false, message: `Validation error: ${validationError}` }
  }

  const supabase = await createClient()
  
  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'Unauthorized' }

  // 2. Get profile
  const { data: profile } = await supabase
    .from('users')
    .select('user_id, id_number')
    .eq('auth_id', user.id)
    .single()

  if (!profile) return { success: false, message: 'Profile not found' }

  try {
    // 3. Create Appointment
    const { generateApptNumber } = await import('@/lib/utils')
    const { data: appt, error } = await supabase
      .from('appointments')
      .insert({
        user_id: profile.user_id,
        order_id: orderId,
        schedule_date: date,
        time_slot: time,
        purpose: purpose,
        status: 'Pending',
        appt_number: generateApptNumber(),
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/shop/profile')
    return { success: true, appointment: appt }

  } catch (error) {
    console.error('Appointment creation failed:', error)
    return { success: false, message: 'Failed to book appointment. Please try again.' }
  }
}
