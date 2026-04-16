'use server'
import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'

export async function createOrder(cartItems, totalAmount) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, message: 'You must be logged in to place an order.' }

  const { data: profile } = await supabase
    .from('users').select('user_id, id_number').eq('auth_id', user.id).single()
  if (!profile) return { success: false, message: 'User profile not found.' }

  try {
    // Validate stock availability before creating the order
    const itemIds = [...new Set(cartItems.map(i => i.item_id))]
    const { data: stockData, error: stockErr } = await supabase
      .from('bookstore_items')
      .select('item_id, name, stock_quantity, reserved_quantity, allow_preorder')
      .in('item_id', itemIds)

    if (stockErr) throw stockErr

    const stockMap = Object.fromEntries((stockData || []).map(s => [s.item_id, s]))
    const outOfStock = []

    const preorderItems = []
    for (const item of cartItems) {
      const stock = stockMap[item.item_id]
      if (!stock) {
        outOfStock.push(`"${item.name}" is no longer available.`)
        continue
      }
      const available = stock.stock_quantity - (stock.reserved_quantity || 0)
      if (available < item.quantity) {
        // Check if pre-order is allowed
        if (stock.allow_preorder) {
          preorderItems.push({
            name: stock.name,
            requested: item.quantity,
            available,
            shortfall: item.quantity - available
          })
        } else {
          outOfStock.push(
            available <= 0
              ? `"${stock.name}" is out of stock and not available for pre-order.`
              : `"${stock.name}" only has ${available} available (you requested ${item.quantity}).`
          )
        }
      }
    }

    if (outOfStock.length > 0) {
      return { success: false, message: outOfStock.join(' ') }
    }

    // Determine if order contains pre-order items
    const hasPreorderItems = preorderItems.length > 0

    // Insert order — order_number generated in app code
    const { generateOrderNumber } = await import('@/lib/utils')
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: profile.user_id,
        total_amount: totalAmount,
        status: hasPreorderItems ? 'Preordered' : 'Pending',
        is_preorder: hasPreorderItems,
        order_number: generateOrderNumber(),
      })
      .select('order_id, order_number')
      .single()

    if (orderError) throw orderError

    // Insert order items
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(cartItems.map(item => ({
        order_id: order.order_id,
        item_id: item.item_id,
        quantity: item.quantity,
        unit_price: item.price,
        ...(item.selectedSize ? { size: item.selectedSize } : {}),
      })))

    if (itemsError) throw itemsError

    // Update reserved_quantity for each item — try rpc, fall back to direct update
    for (const item of cartItems) {
      const { error: rpcError } = await supabase.rpc('increment_reserved', {
        p_item_id: item.item_id,
        p_qty: item.quantity,
      })

      // If rpc doesn't exist, do a direct increment instead
      if (rpcError) {
        const { data: current } = await supabase
          .from('bookstore_items')
          .select('reserved_quantity')
          .eq('item_id', item.item_id)
          .single()

        if (current) {
          await supabase
            .from('bookstore_items')
            .update({ reserved_quantity: current.reserved_quantity + item.quantity })
            .eq('item_id', item.item_id)
        }
      }
    }

    // Notify the customer with realistic next-step guidance
    const paymentNote = totalAmount >= 100
      ? 'Please pay at the University Teller and present the Official Receipt at the Bookstore.'
      : 'Visit the Bookstore to pay and pick up your items.'
    const preorderNote = hasPreorderItems ? ' Some items are on pre-order and will be available soon.' : ''
    await supabase.from('notifications').insert({ user_id: profile.user_id, title: 'Order Slip Created', message: `Your order #${order.order_number} has been placed. Total: ₱${totalAmount.toFixed(2)}. ${paymentNote}${preorderNote}`, type: 'info', reference_type: 'order', reference_id: order.order_id })

    revalidatePath('/shop')
    return { success: true, orderId: order.order_id, orderNumber: order.order_number }

  } catch (error) {
    console.error('Order creation failed:', error)
    return { success: false, message: error.message || 'Failed to place order. Please try again.' }
  }
}