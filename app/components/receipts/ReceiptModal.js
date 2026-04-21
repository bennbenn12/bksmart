'use client'
import { useEffect, useState } from 'react'
import { Modal } from '@/components/ui'
import OfficialReceipt from './OfficialReceipt'
import { createClient } from '@/lib/db/client'
import { Loader2, Printer } from 'lucide-react'

/**
 * Receipt Modal - Displays the official receipt for printing
 */
export default function ReceiptModal({ orderId, onClose }) {
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processedBy, setProcessedBy] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    async function loadOrder() {
      if (!orderId) return
      
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, user:user_id(*), items:order_items(*, item:item_id(*)), payments:payments(*)')
        .eq('order_id', orderId)
        .single()

      if (orderData) {
        setOrder(orderData)
        
        // Fetch who processed the release
        if (orderData.processed_by) {
          const { data: processor } = await supabase
            .from('users')
            .select('first_name, last_name')
            .eq('user_id', orderData.processed_by)
            .single()
          setProcessedBy(processor)
        }
      }
      
      setLoading(false)
    }

    loadOrder()
  }, [orderId, supabase])

  if (loading) {
    return (
      <Modal open={true} onClose={onClose} title="Print Receipt" size="lg">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="animate-spin text-brand-600" size={32} />
        </div>
      </Modal>
    )
  }

  if (!order) {
    return (
      <Modal open={true} onClose={onClose} title="Print Receipt" size="lg">
        <div className="text-center py-8">
          <p className="text-slate-500">Order not found.</p>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={true} onClose={onClose} title="Official Receipt" size="lg">
      <div className="space-y-4">
        <div className="bg-slate-50 p-3 rounded-lg text-sm">
          <p className="text-slate-600">
            <strong>Order:</strong> {order.order_number} | 
            <strong> Status:</strong> {order.status} | 
            <strong> Amount:</strong> ₱{parseFloat(order.total_amount).toFixed(2)}
          </p>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto">
          <OfficialReceipt 
            order={order} 
            user={order.user} 
            items={order.items}
            payments={order.payments}
            processedBy={processedBy}
          />
        </div>
        
        <div className="flex gap-2 pt-2">
          <button 
            onClick={() => window.print()} 
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <Printer size={16} /> Print Receipt
          </button>
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </Modal>
  )
}
