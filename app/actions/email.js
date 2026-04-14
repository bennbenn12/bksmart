'use server'

import { sendNotificationEmail } from '@/lib/email'

// Server action to send email notification
export async function sendOrderStatusEmail({ type, user, order, amount }) {
  try {
    const result = await sendNotificationEmail({
      type,
      user,
      order,
      amount
    })
    return result
  } catch (error) {
    console.error('Server action email error:', error)
    return { success: false, error: error.message }
  }
}

// Server action for queue notification
export async function sendQueueEmail({ type, user, queueEntry }) {
  try {
    const result = await sendNotificationEmail({
      type,
      user,
      queueEntry
    })
    return result
  } catch (error) {
    console.error('Server action queue email error:', error)
    return { success: false, error: error.message }
  }
}

// Server action for payment notification
export async function sendPaymentEmail({ type, user, order, amount }) {
  try {
    const result = await sendNotificationEmail({
      type,
      user,
      order,
      amount
    })
    return result
  } catch (error) {
    console.error('Server action payment email error:', error)
    return { success: false, error: error.message }
  }
}
