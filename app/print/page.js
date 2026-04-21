'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import PrintableReportTemplate from '@/app/components/reports/PrintableReportTemplate'
import { formatCurrency, formatDate } from '@/lib/utils'

// Helper to download data as CSV
const downloadCSV = (data, headers, filename) => {
  const csvHeaders = headers.map(h => h.label).join(',')
  const csvRows = data.map(row => 
    headers.map(h => {
      const val = row[h.key] || ''
      // Escape quotes and wrap in quotes if contains comma
      return val.includes(',') || val.includes('"') 
        ? `"${val.replace(/"/g, '""')}"` 
        : val
    }).join(',')
  )
  const csvContent = [csvHeaders, ...csvRows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

export default function PrintReportPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  
  const type = searchParams.get('type') || 'audit_sales'
  const from = searchParams.get('from') || ''
  const to = searchParams.get('to') || ''
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const fromDate = from + 'T00:00:00'
        const toDate = to + 'T23:59:59'
        
        const [
          ordersRes,
          paymentsRes,
          inventoryRes,
          cancelledOrdersRes,
          jobOrdersRes,
          feedbackRes
        ] = await Promise.all([
          fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'orders', action: 'select', columns: '*', filters: [{ op: 'gte', column: 'created_at', value: fromDate }, { op: 'lte', column: 'created_at', value: toDate }] })
          }).then(r => r.json()),
          fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'payments', action: 'select', columns: '*', filters: [{ op: 'gte', column: 'date_paid', value: from }, { op: 'lte', column: 'date_paid', value: to }] })
          }).then(r => r.json()),
          fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'bookstore_items', action: 'select', columns: '*', filters: [{ op: 'eq', column: 'is_active', value: true }] })
          }).then(r => r.json()),
          fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'orders', action: 'select', columns: '*', filters: [{ op: 'eq', column: 'status', value: 'Cancelled' }, { op: 'gte', column: 'updated_at', value: fromDate }, { op: 'lte', column: 'updated_at', value: toDate }] })
          }).then(r => r.json()),
          fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'job_orders', action: 'select', columns: '*', filters: [{ op: 'gte', column: 'created_at', value: fromDate }, { op: 'lte', column: 'created_at', value: toDate }] })
          }).then(r => r.json()),
          fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'feedback', action: 'select', columns: 'feedback_id,rating,comments,created_at,user_id', filters: [{ op: 'not', column: 'rating', value: 'null' }] })
          }).then(r => r.json())
        ])
        
        const cancelledUserIds = [...new Set((cancelledOrdersRes.data || []).map(o => o.user_id).filter(Boolean))]
        let usersRes = { data: [] }
        if (cancelledUserIds.length > 0) {
          usersRes = await fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'users', action: 'select', columns: 'user_id,first_name,last_name,id_number', filters: [{ op: 'in', column: 'user_id', value: cancelledUserIds }] })
          }).then(r => r.json())
        }
        const userMap = Object.fromEntries((usersRes.data || []).map(u => [u.user_id, u]))
        const cancelledWithUsers = (cancelledOrdersRes.data || []).map(o => ({ ...o, user: userMap[o.user_id] }))
        
        // Fetch order items for all orders
        const orderIds = (ordersRes.data || []).map(o => o.order_id)
        let orderItemsRes = { data: [] }
        if (orderIds.length > 0) {
          orderItemsRes = await fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'order_items', action: 'select', columns: '*', filters: [{ op: 'in', column: 'order_id', value: orderIds }] })
          }).then(r => r.json())
        }
        
        // Fetch item details
        const itemIds = [...new Set((orderItemsRes.data || []).map(oi => oi.item_id).filter(Boolean))]
        let itemsRes = { data: [] }
        if (itemIds.length > 0) {
          itemsRes = await fetch('/api/mysql/query', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ table: 'bookstore_items', action: 'select', columns: 'item_id,name,category,price', filters: [{ op: 'in', column: 'item_id', value: itemIds }] })
          }).then(r => r.json())
        }
        
        const itemMap = Object.fromEntries((itemsRes.data || []).map(i => [i.item_id, i]))
        const orderItemsWithDetails = (orderItemsRes.data || []).map(oi => ({ ...oi, item: itemMap[oi.item_id] }))
        
        setData({
          orders: ordersRes.data || [],
          payments: paymentsRes.data || [],
          inventory: inventoryRes.data || [],
          cancelledOrders: cancelledWithUsers,
          jobOrders: jobOrdersRes.data || [],
          feedback: feedbackRes.data || [],
          orderItems: orderItemsWithDetails
        })
      } catch (err) {
        console.error('Failed to fetch print data:', err)
        setError(err.message || 'Failed to load report data')
      } finally {
        setLoading(false)
      }
    }
    
    if (from && to) {
      fetchData()
    }
  }, [from, to])
  
  // Auto-print after data loads (with slight delay for rendering)
  useEffect(() => {
    if (!loading && data) {
      const timer = setTimeout(() => {
        window.print()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [loading, data])
  
  const getReportConfig = () => {
    if (!data) return { title: 'Loading...', headers: [], data: [] }
    
    const safeData = {
      payments: data.payments || [],
      orders: data.orders || [],
      inventory: data.inventory || [],
      cancelledOrders: data.cancelledOrders || [],
      jobOrders: data.jobOrders || [],
      feedback: data.feedback || [],
      orderItems: data.orderItems || []
    }
    
    const dateRange = `${formatDate(from)} to ${formatDate(to)}`
    const generatedDate = formatDate(new Date().toISOString())
    
    switch (type) {
      case 'audit_sales':
        // Filter order items by date range
        const orderIdsInRange = new Set(safeData.orders.map(o => o.order_id))
        const filteredOrderItems = safeData.orderItems.filter(oi => orderIdsInRange.has(oi.order_id))
        
        return {
          title: 'Daily Sales & Collection Report',
          subtitle: 'For audit verification of completeness assertion',
          dateRange,
          generatedDate,
          summary: [
            { label: 'Total Collection', value: formatCurrency(safeData.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)) },
            { label: 'Total Orders', value: safeData.orders.length.toString() },
            { label: 'Released', value: safeData.orders.filter(o => o.status === 'Released').length.toString() },
            { label: 'ORs Issued', value: safeData.payments.filter(p => p.or_number).length.toString() }
          ],
          headers: [
            { label: 'Date', key: 'date', width: '14%' },
            { label: 'OR Number', key: 'or', width: '16%' },
            { label: 'Order #', key: 'order', width: '24%' },
            { label: 'Payment Method', key: 'method', width: '16%' },
            { label: 'Amount', key: 'amount', width: '14%', align: 'right', bold: true }
          ],
          data: safeData.payments.map(p => ({
            date: formatDate(p.date_paid),
            or: p.or_number || '-',
            order: safeData.orders.find(o => o.order_id === p.order_id)?.order_number || '-',
            method: p.payment_source || 'Cash',
            amount: formatCurrency(p.amount)
          })),
          itemizedHeaders: [
            { label: 'Order #', key: 'order', width: '18%' },
            { label: 'Item', key: 'item', width: '32%' },
            { label: 'Category', key: 'category', width: '14%' },
            { label: 'Qty', key: 'qty', width: '8%', align: 'right' },
            { label: 'Unit Price', key: 'price', width: '14%', align: 'right' },
            { label: 'Subtotal', key: 'subtotal', width: '14%', align: 'right', bold: true }
          ],
          itemizedData: filteredOrderItems.map(oi => ({
            order: safeData.orders.find(o => o.order_id === oi.order_id)?.order_number || oi.order_id,
            item: oi.item?.name || 'Unknown Item',
            category: oi.item?.category || '-',
            qty: oi.quantity,
            price: formatCurrency(oi.unit_price),
            subtotal: formatCurrency(oi.quantity * oi.unit_price)
          }))
        }
        
      case 'audit_inventory':
        return {
          title: 'Inventory Ledger / Stock Listing',
          subtitle: 'For existence assertion - physical goods verification',
          dateRange,
          generatedDate,
          summary: [
            { label: 'Total Items', value: safeData.inventory.length.toString() },
            { label: 'Inventory Value', value: formatCurrency(safeData.inventory.reduce((s, item) => s + (parseFloat(item.price || 0) * parseInt(item.stock_quantity || 0)), 0)) },
            { label: 'Low Stock', value: safeData.inventory.filter(i => parseInt(i.stock_quantity) <= parseInt(i.reorder_level || 10)).length.toString() },
            { label: 'Out of Stock', value: safeData.inventory.filter(i => parseInt(i.stock_quantity) === 0).length.toString() }
          ],
          headers: [
            { label: 'SKU', key: 'sku', width: '14%' },
            { label: 'Item Name', key: 'name', width: '32%' },
            { label: 'Category', key: 'category', width: '14%' },
            { label: 'Stock', key: 'stock', width: '10%', align: 'center' },
            { label: 'Available', key: 'available', width: '10%', align: 'center' },
            { label: 'Unit Price', key: 'price', width: '12%', align: 'right' }
          ],
          data: safeData.inventory.sort((a, b) => a.name?.localeCompare(b.name)).map(item => ({
            sku: item.sku || item.item_id,
            name: item.name,
            category: item.category,
            stock: item.stock_quantity.toString(),
            available: (item.stock_quantity - (item.reserved_quantity || 0)).toString(),
            price: formatCurrency(item.price)
          })),
          itemizedHeaders: [],
          itemizedData: []
        }
        
      case 'audit_voids':
        return {
          title: 'Void / Cancellation Report',
          subtitle: 'High-risk area for fraud monitoring',
          dateRange,
          generatedDate,
          summary: [
            { label: 'Cancelled Orders', value: safeData.cancelledOrders.length.toString() },
            { label: 'Cancelled Value', value: formatCurrency(safeData.cancelledOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0)) },
            { label: '% of Sales', value: safeData.payments.length ? ((safeData.cancelledOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0) / (safeData.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0) + safeData.cancelledOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0))) * 100).toFixed(1) + '%' : '0%' }
          ],
          headers: [
            { label: 'Date Cancelled', key: 'date', width: '16%' },
            { label: 'Order #', key: 'order', width: '18%' },
            { label: 'Customer', key: 'customer', width: '26%' },
            { label: 'Amount', key: 'amount', width: '14%', align: 'right', bold: true },
            { label: 'Reason', key: 'reason', width: '18%' }
          ],
          data: safeData.cancelledOrders.map(o => ({
            date: formatDate(o.updated_at),
            order: o.order_number,
            customer: `${o.user?.first_name || ''} ${o.user?.last_name || ''}`.trim() || '-',
            amount: formatCurrency(o.total_amount),
            reason: o.notes || 'NO REASON PROVIDED'
          })),
          itemizedHeaders: [],
          itemizedData: []
        }
        
      case 'audit_or_log':
        const orPayments = safeData.payments.filter(p => p.or_number).sort((a, b) => a.or_number.localeCompare(b.or_number))
        return {
          title: 'Official Receipt (OR) Log',
          subtitle: 'Sequential tracking to ensure no gaps in OR numbering',
          dateRange,
          generatedDate,
          summary: [
            { label: 'First OR', value: orPayments[0]?.or_number || 'N/A' },
            { label: 'Last OR', value: orPayments[orPayments.length - 1]?.or_number || 'N/A' },
            { label: 'Total ORs', value: orPayments.length.toString() }
          ],
          headers: [
            { label: 'OR Number', key: 'or', width: '18%' },
            { label: 'Date', key: 'date', width: '16%' },
            { label: 'Order #', key: 'order', width: '24%' },
            { label: 'Amount', key: 'amount', width: '16%', align: 'right', bold: true },
            { label: 'Method', key: 'method', width: '16%' }
          ],
          data: orPayments.map(p => ({
            or: p.or_number,
            date: formatDate(p.date_paid),
            order: safeData.orders.find(o => o.order_id === p.order_id)?.order_number || p.order_id,
            amount: formatCurrency(p.amount),
            method: p.payment_source || 'Cash'
          })),
          itemizedHeaders: [],
          itemizedData: []
        }
        
      case 'feedback':
        const avgRating = safeData.feedback.length ? (safeData.feedback.reduce((s, f) => s + parseFloat(f.rating || 0), 0) / safeData.feedback.length).toFixed(1) : '0.0'
        const ratingCounts = safeData.feedback.reduce((acc, f) => {
          const rating = Math.round(parseFloat(f.rating || 0))
          acc[rating] = (acc[rating] || 0) + 1
          return acc
        }, {})
        
        return {
          title: 'Customer Feedback & Ratings Report',
          subtitle: 'Customer satisfaction analysis',
          dateRange,
          generatedDate,
          summary: [
            { label: 'Total Reviews', value: safeData.feedback.length.toString() },
            { label: 'Average Rating', value: `${avgRating} / 5.0` },
            { label: '5-Star Reviews', value: (ratingCounts[5] || 0).toString() },
            { label: '1-2 Star Reviews', value: ((ratingCounts[1] || 0) + (ratingCounts[2] || 0)).toString() }
          ],
          headers: [
            { label: 'Date', key: 'date', width: '20%' },
            { label: 'Rating', key: 'rating', width: '15%', align: 'center' },
            { label: 'Stars', key: 'stars', width: '25%' },
            { label: 'Sentiment', key: 'sentiment', width: '20%' },
            { label: 'Comments', key: 'comments', width: '20%' }
          ],
          data: safeData.feedback.map(f => {
            const rating = parseFloat(f.rating || 0)
            let sentiment = 'Neutral'
            if (rating >= 4) sentiment = 'Positive'
            if (rating <= 2) sentiment = 'Negative'
            return {
              date: formatDate(f.created_at),
              rating: rating.toFixed(1),
              stars: '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating)),
              sentiment,
              comments: f.comments || '-'
            }
          }),
          itemizedHeaders: [],
          itemizedData: []
        }
        
      default:
        return { title: 'Report', subtitle: '', dateRange, generatedDate, headers: [], data: [], itemizedHeaders: [], itemizedData: [] }
    }
  }
  
  const config = getReportConfig()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}...</p>
          <p className="text-gray-400 text-sm mt-1">Please wait while we fetch the data</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-red-700 mb-2">Failed to Load Report</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }
  
  // Empty state when no data at all (complete failure)
  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center max-w-md p-6">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-700 mb-2">No Data Available</h2>
          <p className="text-gray-600 mb-4">No records found for the selected date range.</p>
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
  
  // Handle CSV download
  const handleDownloadCSV = () => {
    if (!config.data || config.data.length === 0) return
    const filename = `${config.title?.replace(/\s+/g, '_') || 'report'}_${from}_${to}.csv`
    downloadCSV(config.data, config.headers, filename)
  }
  
  // Handle itemized CSV download (for audit_sales)
  const handleDownloadItemizedCSV = () => {
    if (!config.itemizedData || config.itemizedData.length === 0) return
    const filename = `${config.title?.replace(/\s+/g, '_') || 'report'}_itemized_${from}_${to}.csv`
    downloadCSV(config.itemizedData, config.itemizedHeaders, filename)
  }

  return (
    <div className="print-page">
      {/* Screen-only preview header */}
      <div className="no-print bg-slate-100 p-4 mb-4 rounded-lg border border-slate-300">
        <h1 className="text-xl font-bold text-slate-800">{config.title}</h1>
        {config.subtitle && <p className="text-slate-600">{config.subtitle}</p>}
        <p className="text-sm text-slate-500 mt-1">Period: {from} to {to}</p>
      </div>
      
      <PrintableReportTemplate {...config} />
      
      {/* Action buttons - visible only on screen */}
      <div className="no-print fixed top-4 right-4 flex flex-col gap-2">
        <div className="flex gap-2">
          {config.itemizedData && config.itemizedData.length > 0 && (
            <button 
              onClick={handleDownloadItemizedCSV}
              className="bg-purple-600 text-white px-4 py-2 rounded shadow hover:bg-purple-700 flex items-center gap-2 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Itemized CSV
            </button>
          )}
          <button 
            onClick={handleDownloadCSV}
            disabled={!config.data || config.data.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded shadow hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download CSV
          </button>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => window.print()}
            className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 flex items-center gap-2 flex-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Report
          </button>
          <button 
            onClick={() => window.close()}
            className="bg-gray-600 text-white px-4 py-2 rounded shadow hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
