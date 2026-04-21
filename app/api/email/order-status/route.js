import { NextResponse } from 'next/server'
import { sendEmail, EmailTemplates } from '@/lib/email'

export async function POST(request) {
  try {
    const body = await request.json()
    const { type, user, order } = body

    if (!type || !user || !order) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, user, order' },
        { status: 400 }
      )
    }

    if (!user.email) {
      return NextResponse.json(
        { success: false, error: 'User email is required' },
        { status: 400 }
      )
    }

    let emailContent

    switch (type) {
      case 'ORDER_READY':
        emailContent = EmailTemplates.orderReady(order, user)
        break
      case 'ORDER_RELEASED':
        emailContent = EmailTemplates.orderReleased(order, user)
        break
      case 'ORDER_CANCELLED':
        // Create a simple cancellation template
        emailContent = {
          subject: `❌ Order #${order.order_number} Cancelled`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #dc2626; padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Order Cancelled</h1>
              </div>
              <div style="padding: 20px; background: #fef2f2;">
                <h2 style="color: #991b1b;">Order #${order.order_number}</h2>
                <p>Hi ${user.first_name},</p>
                <p>Your order has been cancelled.</p>
                ${order.notes ? `<p><strong>Reason:</strong> ${order.notes}</p>` : ''}
                <div style="background: white; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #fecaca;">
                  <p><strong>Order #:</strong> ${order.order_number}</p>
                  <p><strong>Status:</strong> Cancelled</p>
                </div>
                <p>If you have any questions, please contact the Bookstore.</p>
              </div>
            </div>
          `,
          text: `Order #${order.order_number} Cancelled\n\nHi ${user.first_name},\n\nYour order has been cancelled.\n${order.notes ? `Reason: ${order.notes}\n` : ''}\nOrder #: ${order.order_number}\nStatus: Cancelled\n\nIf you have any questions, please contact the Bookstore.`
        }
        break
      default:
        return NextResponse.json(
          { success: false, error: `Unknown email type: ${type}` },
          { status: 400 }
        )
    }

    const result = await sendEmail({
      to: user.email,
      ...emailContent
    })

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    console.error('Order status email API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}
