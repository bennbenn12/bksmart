'use client'
import { useState } from 'react'
import { createClient } from '@/lib/db/client'
import { useRouter } from 'next/navigation'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

const REASONS = [
  'Changed my mind',
  'Ordered wrong item(s)',
  'Found a better price elsewhere',
  'Taking too long to process',
  'Duplicate order',
  'Financial reasons',
]

export default function CancelOrderButton({ orderId, orderNumber }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleCancel() {
    const finalReason = reason === '__custom' ? customReason.trim() : reason
    setCancelling(true)
    setError('')
    try {
      const { error: updateErr } = await supabase
        .from('orders')
        .update({ status: 'Cancelled', notes: finalReason || null })
        .eq('order_id', orderId)
      if (updateErr) throw updateErr

      // Release reserved stock
      const { data: items } = await supabase
        .from('order_items')
        .select('item_id, quantity')
        .eq('order_id', orderId)
      if (items?.length) {
        for (const item of items) {
          const { data: cur } = await supabase.from('bookstore_items').select('reserved_quantity').eq('item_id', item.item_id).single()
          if (cur) {
            await supabase.from('bookstore_items').update({ reserved_quantity: Math.max(0, cur.reserved_quantity - item.quantity) }).eq('item_id', item.item_id)
          }
        }
      }

      setOpen(false)
      router.refresh()
    } catch (e) {
      setError(e.message || 'Failed to cancel order.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost py-1 px-3 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 border border-red-200">
        Cancel Order
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" /> Cancel Order
              </h3>
              <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>

            <p className="text-sm text-slate-500">
              Are you sure you want to cancel <span className="font-mono font-bold text-slate-700">{orderNumber}</span>?
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-500 mb-2 block">Reason (optional)</label>
              <div className="flex flex-wrap gap-2">
                {REASONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => { setReason(reason === r ? '' : r); setCustomReason('') }}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                      reason === r
                        ? 'border-red-400 bg-red-50 text-red-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {r}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => { setReason(reason === '__custom' ? '' : '__custom') }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-all',
                    reason === '__custom'
                      ? 'border-red-400 bg-red-50 text-red-700'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  )}
                >
                  Other...
                </button>
              </div>
              {reason === '__custom' && (
                <input
                  className="input mt-2 text-sm"
                  placeholder="Tell us why..."
                  value={customReason}
                  onChange={e => setCustomReason(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setOpen(false)} className="btn-secondary text-sm">Keep Order</button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                className="btn-danger text-sm flex items-center gap-1.5"
              >
                {cancelling ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
