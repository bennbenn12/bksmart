import { createClient } from './db/client'

// Notification types and their default messages
export const NOTIFICATION_TYPES = {
  // Order notifications
  ORDER_CREATED: {
    type: 'success',
    title: 'Order Placed',
    getMessage: (data) => `Your order #${data.orderNumber} has been placed successfully.`
  },
  ORDER_READY: {
    type: 'success',
    title: 'Order Ready',
    getMessage: (data) => `Your order #${data.orderNumber} is ready for pickup! Join the queue or book an appointment.`
  },
  ORDER_RELEASED: {
    type: 'success',
    title: 'Order Completed',
    getMessage: (data) => `Your order #${data.orderNumber} has been released. Thank you for shopping with BookSmart!`
  },
  ORDER_CANCELLED: {
    type: 'alert',
    title: 'Order Cancelled',
    getMessage: (data) => `Your order #${data.orderNumber} has been cancelled. ${data.reason ? `Reason: ${data.reason}` : ''}`
  },
  
  // Payment notifications
  PAYMENT_VERIFIED: {
    type: 'success',
    title: 'Payment Verified',
    getMessage: (data) => `Payment of ₱${data.amount} for order #${data.orderNumber} has been verified.`
  },
  PAYMENT_PENDING: {
    type: 'warning',
    title: 'Payment Required',
    getMessage: (data) => `Please pay ₱${data.amount} at the ${data.paymentSource} for order #${data.orderNumber}.`
  },
  
  // Queue notifications
  QUEUE_CALLED: {
    type: 'success',
    title: 'It\'s Your Turn!',
    getMessage: (data) => `Queue #${data.queueNumber} - Please proceed to the Bookstore counter now.`
  },
  QUEUE_JOINED: {
    type: 'info',
    title: 'Joined Queue',
    getMessage: (data) => `You're #${data.queueNumber} in queue. Estimated wait: ~${data.waitTime} mins.`
  },
  
  // Appointment notifications
  APPOINTMENT_CONFIRMED: {
    type: 'success',
    title: 'Appointment Confirmed',
    getMessage: (data) => `Your appointment on ${data.date} at ${data.time} is confirmed.`
  },
  APPOINTMENT_REMINDER: {
    type: 'info',
    title: 'Appointment Reminder',
    getMessage: (data) => `Reminder: You have an appointment tomorrow at ${data.time}. Don't forget to bring your ID!`
  },
  APPOINTMENT_COMPLETED: {
    type: 'success',
    title: 'Appointment Completed',
    getMessage: (data) => `Your appointment has been completed. ${data.autoCompleted ? 'Order was claimed.' : ''}`
  },
  
  // Staff notifications
  NEW_ORDER: {
    type: 'info',
    title: 'New Order Received',
    getMessage: (data) => `New order #${data.orderNumber} from ${data.customerName} - ₱${data.amount}`
  },
  NEW_QUEUE_ENTRY: {
    type: 'info',
    title: 'New Queue Entry',
    getMessage: (data) => `New queue entry #${data.queueNumber} ${data.hasOrder ? 'with linked order' : 'for inquiry'}`
  },
  NEW_APPOINTMENT: {
    type: 'info',
    title: 'New Appointment',
    getMessage: (data) => `New appointment booking from ${data.customerName} on ${data.date} at ${data.time}`
  },
  LOW_STOCK: {
    type: 'alert',
    title: 'Low Stock Alert',
    getMessage: (data) => `${data.itemName} is below reorder level. Current stock: ${data.stockQuantity}`
  }
}

// Create notification helper
export async function createNotification({ userId, type, data, referenceType, referenceId }) {
  const supabase = createClient()
  const notificationConfig = NOTIFICATION_TYPES[type]
  
  if (!notificationConfig) {
    console.error(`Unknown notification type: ${type}`)
    return null
  }
  
  try {
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title: notificationConfig.title,
        message: notificationConfig.getMessage(data),
        type: notificationConfig.type,
        status: 'Unread',
        reference_type: referenceType,
        reference_id: referenceId
      })
      .select()
      .single()
    
    if (error) throw error
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    return null
  }
}

// Bulk notification helper
export async function createBulkNotifications({ userIds, type, data, referenceType, referenceId }) {
  const notifications = await Promise.all(
    userIds.map(userId => 
      createNotification({ userId, type, data, referenceType, referenceId })
    )
  )
  return notifications.filter(n => n !== null)
}

// Notification helper functions for common scenarios
export const NotificationHelpers = {
  // Order notifications
  async orderCreated(order) {
    return createNotification({
      userId: order.user_id,
      type: 'ORDER_CREATED',
      data: { orderNumber: order.order_number },
      referenceType: 'order',
      referenceId: order.order_id
    })
  },
  
  async orderReady(order) {
    return createNotification({
      userId: order.user_id,
      type: 'ORDER_READY',
      data: { orderNumber: order.order_number },
      referenceType: 'order',
      referenceId: order.order_id
    })
  },
  
  async orderReleased(order) {
    return createNotification({
      userId: order.user_id,
      type: 'ORDER_RELEASED',
      data: { orderNumber: order.order_number },
      referenceType: 'order',
      referenceId: order.order_id
    })
  },
  
  async orderCancelled(order, reason) {
    return createNotification({
      userId: order.user_id,
      type: 'ORDER_CANCELLED',
      data: { orderNumber: order.order_number, reason },
      referenceType: 'order',
      referenceId: order.order_id
    })
  },
  
  // Payment notifications
  async paymentVerified(order, amount) {
    return createNotification({
      userId: order.user_id,
      type: 'PAYMENT_VERIFIED',
      data: { orderNumber: order.order_number, amount },
      referenceType: 'payment',
      referenceId: order.order_id
    })
  },
  
  // Queue notifications
  async queueCalled(queueEntry) {
    return createNotification({
      userId: queueEntry.user_id,
      type: 'QUEUE_CALLED',
      data: { queueNumber: String(queueEntry.queue_number).padStart(3, '0') },
      referenceType: 'queue',
      referenceId: queueEntry.queue_id
    })
  },
  
  async queueJoined(queueEntry, waitTime) {
    return createNotification({
      userId: queueEntry.user_id,
      type: 'QUEUE_JOINED',
      data: { 
        queueNumber: String(queueEntry.queue_number).padStart(3, '0'),
        waitTime 
      },
      referenceType: 'queue',
      referenceId: queueEntry.queue_id
    })
  },
  
  // Appointment notifications
  async appointmentConfirmed(appointment) {
    return createNotification({
      userId: appointment.user_id,
      type: 'APPOINTMENT_CONFIRMED',
      data: { 
        date: appointment.schedule_date,
        time: appointment.time_slot?.slice(0, 5)
      },
      referenceType: 'appointment',
      referenceId: appointment.appointment_id
    })
  },
  
  async appointmentCompleted(appointment, autoCompleted = false) {
    return createNotification({
      userId: appointment.user_id,
      type: 'APPOINTMENT_COMPLETED',
      data: { autoCompleted },
      referenceType: 'appointment',
      referenceId: appointment.appointment_id
    })
  }
}

// Export for use in components
export default {
  NOTIFICATION_TYPES,
  createNotification,
  createBulkNotifications,
  NotificationHelpers
}
