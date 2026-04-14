'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Package, CheckCircle, Clock, ArrowRight } from 'lucide-react'
import { formatCurrency, ORDER_STATUS_COLORS, cn } from '@/lib/utils'

export default function ActiveOrdersPreview() {
  const { profile } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return
    const supabase = createClient()
    supabase
      .from('orders')
      .select('order_id, order_number, status, total_amount, created_at, items:order_items(count)')
      .eq('user_id', profile.id_number)
      .in('status', ['Pending', 'Ready'])
      .order('created_at', { ascending: false })
      .limit(3)
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [profile])

  if (loading || orders.length === 0) return null

  const readyOrders = orders.filter(o => o.status === 'Ready')
  const pendingOrders = orders.filter(o => o.status === 'Pending')

  return (
    <div className="space-y-3">
      {/* Ready Orders Alert */}
      {readyOrders.length > 0 && (
        <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="font-bold text-green-800">
                {readyOrders.length} Order{readyOrders.length > 1 ? 's' : ''} Ready for Pickup!
              </h3>
              <p className="text-sm text-green-700">
                Your items are prepared and waiting at the Bookstore.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {readyOrders.map(o => (
              <div key={o.order_id} className="bg-white rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono font-bold text-brand-700">{o.order_number}</span>
                  <span className="font-bold text-slate-700">{formatCurrency(o.total_amount)}</span>
                </div>
                <div className="flex gap-2">
                  <Link 
                    href={`/shop/queue?orderId=${o.order_id}`}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    Join Queue
                  </Link>
                  <Link 
                    href={`/shop/appointments?orderId=${o.order_id}`}
                    className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-center text-xs font-semibold py-2 rounded-lg transition-colors"
                  >
                    Book Appt
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Orders */}
      {pendingOrders.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock size={16} className="text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">
              {pendingOrders.length} Order{pendingOrders.length > 1 ? 's' : ''} Being Prepared
            </h3>
          </div>
          <div className="space-y-2">
            {pendingOrders.map(o => (
              <div key={o.order_id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-yellow-100">
                <div className="flex items-center gap-3">
                  <Package size={14} className="text-yellow-600" />
                  <span className="font-mono text-sm font-bold text-slate-700">{o.order_number}</span>
                  <span className="text-xs text-slate-500">{o.items?.[0]?.count || 0} item(s)</span>
                </div>
                <span className="text-xs font-semibold text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">
                  {o.status}
                </span>
              </div>
            ))}
          </div>
          <Link href="/shop/orders" className="flex items-center justify-center gap-1 mt-3 text-xs text-yellow-700 font-semibold hover:text-yellow-800">
            View All Orders <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </div>
  )
}
