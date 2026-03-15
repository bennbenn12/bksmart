import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Package, ArrowLeft } from 'lucide-react'
import { formatCurrency, formatDateTime, ORDER_STATUS_COLORS, cn } from '@/lib/utils'

export default async function MyOrdersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('user_id').eq('auth_id', user.id).single()
  const { data: orders } = await supabase
    .from('orders')
    .select('*, order_items(order_item_id,quantity,unit_price,bookstore_items(name,image_url,category))')
    .eq('user_id', profile.user_id)
    .order('created_at',{ascending:false})

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/shop/profile" className="btn-ghost p-1.5"><ArrowLeft size={16}/></Link>
        <h1 className="text-2xl font-display font-bold text-hnu-dark">My Orders</h1>
      </div>

      {(!orders||orders.length===0) ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
          <Package size={48} className="mx-auto text-slate-200 mb-4"/>
          <p className="font-semibold text-slate-500">No orders yet.</p>
          <Link href="/shop" className="btn-primary mt-4 inline-flex">Browse Shop</Link>
        </div>
      ) : orders.map(o=>(
        <div key={o.order_id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between px-5 py-4 bg-slate-50 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-brand-700">{o.order_number}</span>
              <span className={cn('badge text-xs',ORDER_STATUS_COLORS[o.status]||'bg-slate-100')}>{o.status}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-slate-700">{formatCurrency(o.total_amount)}</span>
              <Link href={`/shop/orders/${o.order_id}/slip`} className="btn-secondary py-1 px-3 text-xs">View Slip</Link>
            </div>
          </div>
          <div className="divide-y divide-slate-50">
            {o.order_items?.slice(0,3).map(item=>(
              <div key={item.order_item_id} className="flex items-center gap-3 px-5 py-3">
                <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden text-lg">
                  {item.bookstore_items?.image_url ? <img src={item.bookstore_items.image_url} className="w-full h-full object-cover"/> : '📖'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 text-sm truncate">{item.bookstore_items?.name}</p>
                  <p className="text-xs text-slate-400">Qty: {item.quantity} × {formatCurrency(item.unit_price)}</p>
                </div>
                <p className="font-bold text-slate-600 text-sm shrink-0">{formatCurrency(item.quantity*item.unit_price)}</p>
              </div>
            ))}
            {o.order_items?.length > 3 && <p className="px-5 py-2 text-xs text-slate-400">+{o.order_items.length-3} more item(s)</p>}
          </div>
          <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-400">
            Placed: {formatDateTime(o.created_at)}
            {o.status==='Released' && o.released_at && <> · Released: {formatDateTime(o.released_at)}</>}
          </div>
        </div>
      ))}
    </div>
  )
}
