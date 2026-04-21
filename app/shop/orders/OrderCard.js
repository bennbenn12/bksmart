'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Clock, ChevronDown, ChevronUp, ListOrdered, CalendarDays, CreditCard, MessageSquare } from 'lucide-react'
import { ORDER_STATUS_COLORS, cn, formatCurrency, formatDateTime } from '@/lib/utils'
import CancelOrderButton from './CancelOrderButton'

const STATUS_HINTS = {
  Pending:   '📋 Your order is being prepared. You will be notified when ready for pickup.',
  Ready:     '🎉 Your order is ready! Visit the Bookstore to pick up your items.',
  Released:  '✅ Your order has been picked up. Thank you for shopping with us!',
  Cancelled: '❌ This order has been cancelled.',
}

export default function OrderCard({ order }) {
  const [showItems, setShowItems] = useState(false)
  
  const isPaid = order.payments?.some(p => p.verified_at)
  const needsTeller = parseFloat(order.total_amount) >= 100
  const o = order

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      {/* Header - stacked on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between px-4 sm:px-5 py-3 sm:py-4 bg-slate-50 border-b border-slate-100 gap-2 sm:gap-3">
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <span className="font-mono text-sm font-bold text-brand-700">{o.order_number}</span>
          <span className={cn('badge text-xs',ORDER_STATUS_COLORS[o.status]||'bg-slate-100')}>{o.status}</span>
          <button 
            onClick={() => setShowItems(!showItems)}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 transition-colors"
          >
            {o.items?.length || 0} item(s)
            {showItems ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
          </button>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <span className="font-bold text-slate-700">{formatCurrency(o.total_amount)}</span>
          <div className="flex items-center gap-2">
            {o.status === 'Pending' && <CancelOrderButton orderId={o.order_id} orderNumber={o.order_number} />}
            <Link href={`/shop/orders/${o.order_id}/slip`} className="btn-secondary py-1.5 sm:py-1 px-3 text-xs">View Slip</Link>
          </div>
        </div>
      </div>
      <div className={cn('divide-y divide-slate-50 transition-all', showItems ? '' : 'max-h-[200px] overflow-hidden')}>
        {(showItems ? o.items : o.items?.slice(0,3))?.map(item=>(
          <div key={item.order_item_id} className="flex items-center gap-3 px-5 py-3">
            <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden text-lg">
              {item.item?.image_url ? <img src={item.item.image_url.split(',')[0].trim()} className="w-full h-full object-cover"/> : '📖'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-700 text-sm truncate">{item.item?.name}</p>
              <p className="text-xs text-slate-400">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
            </div>
            <p className="font-bold text-slate-600 text-sm shrink-0">{formatCurrency(item.quantity*item.unit_price)}</p>
          </div>
        ))}
        {!showItems && o.items?.length > 3 && (
          <button 
            onClick={() => setShowItems(true)}
            className="w-full px-5 py-2 text-xs text-slate-400 hover:text-brand-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1"
          >
            +{o.items.length-3} more item(s) <ChevronDown size={14}/>
          </button>
        )}
      </div>

      {/* Status hint + contextual actions */}
      <div className="px-5 py-3 border-t border-slate-100 space-y-2">
        {STATUS_HINTS[o.status] && (
          <p className="text-xs text-slate-500 flex items-center gap-1.5">
            <Clock size={11} className="shrink-0"/>
            {o.status === 'Pending' && needsTeller && !isPaid
              ? 'Please pay at the University Teller and present your Official Receipt at the Bookstore.'
              : o.status === 'Pending' && !needsTeller && !isPaid
              ? 'Visit the Bookstore to pay and pick up your items.'
              : STATUS_HINTS[o.status]}
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-xs text-slate-400">Placed: {formatDateTime(o.created_at)}</span>
            {o.status==='Released' && o.released_at && <span className="text-xs text-slate-400">· Released: {formatDateTime(o.released_at)}</span>}
            {o.status==='Cancelled' && o.notes && <span className="text-xs text-red-400">· Reason: {o.notes}</span>}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto flex-wrap">
            {o.status === 'Pending' && needsTeller && !isPaid && (
              <Link href={`/shop/orders/${o.order_id}/slip`} className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700">
                <CreditCard size={11}/> Print Teller Slip
              </Link>
            )}
            {o.status === 'Ready' && (
              <Link href={`/shop/queue?orderId=${o.order_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                <ListOrdered size={11}/> Join Queue for Pickup
              </Link>
            )}
            {o.status === 'Ready' && (
              <Link href={`/shop/appointments?orderId=${o.order_id}`} className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-700">
                <CalendarDays size={11}/> Book Pickup Appointment
              </Link>
            )}
            {o.status === 'Released' && (
              <Link href="/shop/feedback" className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 hover:text-green-700">
                <MessageSquare size={11}/> Give Feedback
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
