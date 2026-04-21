'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import OfficialReceipt from '@/app/components/receipts/OfficialReceipt'

export default function PrintReceiptPage() {
  const searchParams = useSearchParams()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [processedBy, setProcessedBy] = useState(null)
  
  const orderId = searchParams.get('orderId')
  
  useEffect(() => {
    async function loadOrder() {
      if (!orderId) {
        setLoading(false)
        return
      }
      
      try {
        const res = await fetch('/api/mysql/query', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ 
            table: 'orders', 
            action: 'select', 
            columns: '*',
            filters: [{ op: 'eq', column: 'order_id', value: orderId }]
          })
        })
        const { data: orders } = await res.json()
        const orderData = orders?.[0]
        
        if (orderData) {
          // Fetch user
          const userRes = await fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ 
              table: 'users', 
              action: 'select', 
              columns: '*',
              filters: [{ op: 'eq', column: 'user_id', value: orderData.user_id }]
            })
          })
          const { data: users } = await userRes.json()
          orderData.user = users?.[0]
          
          // Fetch order items with item details
          const itemsRes = await fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ 
              table: 'order_items', 
              action: 'select', 
              columns: '*',
              filters: [{ op: 'eq', column: 'order_id', value: orderId }]
            })
          })
          const { data: items } = await itemsRes.json()
          orderData.items = items || []
          
          // Fetch item details for each order item
          if (orderData.items.length > 0) {
            const itemIds = orderData.items.map(i => i.item_id)
            const itemsDetailRes = await fetch('/api/mysql/query', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ 
                table: 'bookstore_items', 
                action: 'select', 
                columns: '*',
                filters: [{ op: 'in', column: 'item_id', value: itemIds }]
              })
            })
            const { data: itemDetails } = await itemsDetailRes.json()
            const itemMap = Object.fromEntries((itemDetails || []).map(i => [i.item_id, i]))
            orderData.items = orderData.items.map(i => ({ ...i, item: itemMap[i.item_id] }))
          }
          
          // Fetch payments
          const paymentsRes = await fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ 
              table: 'payments', 
              action: 'select', 
              columns: '*',
              filters: [{ op: 'eq', column: 'order_id', value: orderId }]
            })
          })
          const { data: payments } = await paymentsRes.json()
          orderData.payments = payments || []
          
          // Fetch processed by
          if (orderData.processed_by) {
            const processorRes = await fetch('/api/mysql/query', {
              method: 'POST',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ 
                table: 'users', 
                action: 'select', 
                columns: 'first_name, last_name',
                filters: [{ op: 'eq', column: 'user_id', value: orderData.processed_by }]
              })
            })
            const { data: processors } = await processorRes.json()
            setProcessedBy(processors?.[0])
          }
          
          setOrder(orderData)
        }
      } catch (err) {
        console.error('Failed to load order:', err)
      } finally {
        setLoading(false)
      }
    }
    
    loadOrder()
  }, [orderId])
  
  // Auto print when loaded
  useEffect(() => {
    if (!loading && order) {
      setTimeout(() => {
        window.print()
      }, 500)
    }
  }, [loading, order])
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading receipt...</p>
        </div>
      </div>
    )
  }
  
  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Order not found.</p>
      </div>
    )
  }
  
  return (
    <div className="receipt-print-page">
      <OfficialReceipt 
        order={order} 
        user={order.user} 
        items={order.items}
        payments={order.payments}
        processedBy={processedBy}
      />
      
      {/* Print/Close buttons */}
      <div className="no-print fixed top-4 right-4 flex gap-2">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          Print
        </button>
        <button 
          onClick={() => window.close()}
          className="bg-gray-600 text-white px-4 py-2 rounded shadow hover:bg-gray-700"
        >
          Close
        </button>
      </div>
    </div>
  )
}
