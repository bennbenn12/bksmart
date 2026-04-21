'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { StatsCard, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useRealtime } from '@/lib/useRealtime'
import { formatCurrency, cn, formatDate, formatDateTime } from '@/lib/utils'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { BarChart3, RefreshCw, ShoppingCart, CreditCard, Package, Star, AlertTriangle, Printer, FileDown } from 'lucide-react'

const COLORS = ['#3358e8','#16a34a','#f59e0b','#dc2626','#7c3aed','#0891b2','#84cc16']

const REPORT_TYPES = [
  { value:'all', label:'All Reports' },
  { value:'sales', label:'Sales & Revenue' },
  { value:'inventory', label:'Inventory Status' },
  { value:'orders', label:'Orders & Job Orders' },
  { value:'feedback', label:'Feedback & Ratings' },
  { value:'audit_sales', label:'Audit: Daily Sales' },
  { value:'audit_inventory', label:'Audit: Inventory Ledger' },
  { value:'audit_voids', label:'Audit: Void/Cancel Report' },
  { value:'audit_or_log', label:'Audit: OR Log' },
]

export default function ReportsPage() {
  const [loading, setLoading]   = useState(true)
  const [from, setFrom]         = useState(new Date(Date.now()-86400000*30).toISOString().split('T')[0])
  const [to, setTo]             = useState(new Date().toISOString().split('T')[0])
  const [data, setData]         = useState({ orders:[], payments:[], inventory:[], feedback:[], jobOrders:[], orderItems:[], cancelledOrders:[] })
  const [reportType, setReportType] = useState('all')
  const [showDownloadPicker, setShowDownloadPicker] = useState(false)
  const supabase = createClient()

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const fromDate = from + 'T00:00:00'
      const toDate = to + 'T23:59:59'
      
      // Fetch all data needed for reports
      const [
        ordersRes,
        paymentsRes,
        inventoryRes,
        feedbackRes,
        jobOrdersRes,
        cancelledOrdersRes
      ] = await Promise.all([
        supabase.from('orders').select('order_id,status,total_amount,created_at,order_number,user_id').gte('created_at',fromDate).lte('created_at',toDate),
        supabase.from('payments').select('payment_id,amount,payment_source,date_paid,verified_at,or_number,order_id,reference_number').gte('date_paid',from).lte('date_paid',to),
        supabase.from('bookstore_items').select('item_id,name,stock_quantity,reserved_quantity,reorder_level,category,shop,price,sku').eq('is_active',true),
        supabase.from('feedback').select('feedback_id,rating,comments,created_at,user_id').gte('created_at',fromDate).lte('created_at',toDate).not('rating','is',null),
        supabase.from('job_orders').select('job_id,status,department_account,created_at').gte('created_at',fromDate).lte('created_at',toDate),
        supabase.from('orders').select('order_id,status,total_amount,created_at,order_number,user_id,notes,updated_at').eq('status','Cancelled').gte('updated_at',fromDate).lte('updated_at',toDate),
      ])
      
      // Fetch order items separately to avoid nested filter issues
      const orderIds = (ordersRes.data || []).map(o => o.order_id)
      let orderItemsRes = { data: [] }
      if (orderIds.length > 0) {
        // Fetch in batches of 100 to avoid query length limits
        const batches = []
        for (let i = 0; i < orderIds.length; i += 100) {
          const batch = orderIds.slice(i, i + 100)
          batches.push(supabase.from('order_items').select('*').in('order_id', batch))
        }
        const batchResults = await Promise.all(batches)
        orderItemsRes.data = batchResults.flatMap(r => r.data || [])
      }
      
      // Fetch items for order items (separate query to avoid nested relation issues)
      const itemIds = [...new Set(orderItemsRes.data.map(oi => oi.item_id).filter(Boolean))]
      let itemsRes = { data: [] }
      if (itemIds.length > 0) {
        const itemBatches = []
        for (let i = 0; i < itemIds.length; i += 100) {
          const batch = itemIds.slice(i, i + 100)
          itemBatches.push(supabase.from('bookstore_items').select('item_id,name,category,price').in('item_id', batch))
        }
        const itemResults = await Promise.all(itemBatches)
        itemsRes.data = itemResults.flatMap(r => r.data || [])
      }
      const itemMap = Object.fromEntries(itemsRes.data.map(i => [i.item_id, i]))
      orderItemsRes.data = orderItemsRes.data.map(oi => ({ ...oi, item: itemMap[oi.item_id] || null }))
      
      // Fetch users for cancelled orders
      const cancelledUserIds = [...new Set((cancelledOrdersRes.data || []).map(o => o.user_id).filter(Boolean))]
      let usersRes = { data: [] }
      if (cancelledUserIds.length > 0) {
        usersRes = await supabase.from('users').select('user_id,first_name,last_name,id_number').in('user_id', cancelledUserIds)
      }
      const userMap = Object.fromEntries((usersRes.data || []).map(u => [u.user_id, u]))
      const cancelledWithUsers = (cancelledOrdersRes.data || []).map(o => ({ ...o, user: userMap[o.user_id] }))
      
      setData({ 
        orders: ordersRes.data || [], 
        payments: paymentsRes.data || [], 
        inventory: inventoryRes.data || [], 
        feedback: feedbackRes.data || [], 
        jobOrders: jobOrdersRes.data || [],
        orderItems: orderItemsRes.data || [],
        cancelledOrders: cancelledWithUsers
      })
    } catch (error) {
      console.error('[Reports] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useRealtime({ tables:['orders','payments','bookstore_items','feedback','job_orders'], onRefresh:load })
  useEffect(() => { load() }, [from, to])

  // Computed
  const totalRevenue = data.payments.reduce((s,p)=>s+parseFloat(p.amount||0),0)
  const avgRating    = data.feedback.length ? (data.feedback.reduce((s,f)=>s+parseFloat(f.rating||0),0)/data.feedback.length).toFixed(1) : '—'
  const lowStock     = data.inventory.filter(i=>parseInt(i.stock_quantity)<=parseInt(i.reorder_level))

  // Daily revenue chart
  const revenueByDay = data.payments.reduce((acc,p)=>{
    const d = p.date_paid?.slice(0,10); if(!d) return acc
    acc[d] = (acc[d]||0)+parseFloat(p.amount||0); return acc
  },{})
  const revenueChart = Object.entries(revenueByDay).sort(([a],[b])=>a.localeCompare(b)).map(([date,amount])=>({ date:date.slice(5), amount }))

  // Orders by status
  const byStatus = data.orders.reduce((acc,o)=>{ acc[o.status]=(acc[o.status]||0)+1; return acc },{})
  const statusChart = Object.entries(byStatus).map(([name,value])=>({name,value}))

  // Payment source breakdown
  const bySource = data.payments.reduce((acc,p)=>{ acc[p.payment_source]=(acc[p.payment_source]||0)+parseFloat(p.amount||0); return acc },{})
  const sourceChart = Object.entries(bySource).map(([name,value])=>({name,value:Math.round(value*100)/100}))

  // Stock by shop
  const byShop = data.inventory.reduce((acc,i)=>{ acc[i.shop]=(acc[i.shop]||0)+parseInt(i.stock_quantity||0); return acc },{})
  const shopChart = Object.entries(byShop).map(([shop,qty])=>({shop:shop.replace('_',' '),qty}))

  // Job orders by dept
  const byDept = data.jobOrders.reduce((acc,j)=>{ const d=j.department_account||'Other'; acc[d]=(acc[d]||0)+1; return acc },{})
  const deptChart = Object.entries(byDept).sort(([,a],[,b])=>b-a).slice(0,8).map(([dept,count])=>({dept,count}))

  return (
    <div className="reports-page-wrapper">
      <div className="page-enter">
      <Header title="Reports & Analytics"/>
      <div className="p-6 space-y-6">
        {/* Date range */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 shadow-sm">
            <span className="text-xs font-semibold text-slate-400">FROM</span>
            <input type="date" className="text-sm text-slate-700 focus:outline-none" value={from} onChange={e=>setFrom(e.target.value)}/>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-semibold text-slate-400">TO</span>
            <input type="date" className="text-sm text-slate-700 focus:outline-none" value={to} onChange={e=>setTo(e.target.value)}/>
          </div>
          <button onClick={load} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
          
          <div className="flex items-center gap-2 ml-auto no-print">
            <select className="input text-xs py-1.5 h-8" value={reportType} onChange={e=>setReportType(e.target.value)}>
              {REPORT_TYPES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
            </select>
            <div className="relative">
              <button onClick={()=>setShowDownloadPicker(!showDownloadPicker)} className="btn-secondary gap-1 text-xs"><FileDown size={12}/> Download PDF</button>
              {showDownloadPicker && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-slate-200 z-50 py-1">
                  <p className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select report to download</p>
                  {REPORT_TYPES.map(r=>(
                    <button key={r.value} onClick={()=>{
                      setReportType(r.value);
                      setShowDownloadPicker(false);
                      setTimeout(()=>window.print(), 100);
                    }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 text-slate-700 flex items-center gap-2">
                      <Printer size={12} className="text-slate-400"/>{r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {loading ? <LoadingSpinner/> : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatsCard label="Total Revenue" value={formatCurrency(totalRevenue)} icon={CreditCard} color="green"/>
              <StatsCard label="Total Orders" value={data.orders.length} icon={ShoppingCart} sub={`${data.orders.filter(o=>o.status==='Released').length} released`} color="brand"/>
              <StatsCard label="Avg. Rating" value={avgRating==='—'?'—':`${avgRating} ⭐`} icon={Star} color="orange"/>
              <StatsCard label="Low Stock Items" value={lowStock.length} icon={Package} color={lowStock.length>0?'red':'green'} sub={lowStock.length>0?'Need restocking':'All good'}/>
            </div>

            {/* Revenue chart */}
            {revenueChart.length > 0 && (reportType === 'all' || reportType === 'sales') && (
              <div className="card p-5">
                <h3 className="section-title mb-4 flex items-center gap-2"><BarChart3 size={16} className="text-brand-600"/> Daily Revenue (₱)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={revenueChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                    <XAxis dataKey="date" tick={{fontSize:11}} stroke="#94a3b8"/>
                    <YAxis tick={{fontSize:11}} stroke="#94a3b8" tickFormatter={v=>`₱${(v/1000).toFixed(1)}k`}/>
                    <Tooltip formatter={(v)=>[formatCurrency(v),'Revenue']} labelStyle={{fontSize:12}}/>
                    <Line type="monotone" dataKey="amount" stroke="#3358e8" strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              {/* Orders by status */}
              {statusChart.length > 0 && (reportType === 'all' || reportType === 'orders') && (
                <div className="card p-5">
                  <h3 className="section-title mb-4">Orders by Status</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={statusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {statusChart.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Payment source */}
              {sourceChart.length > 0 && (reportType === 'all' || reportType === 'sales') && (
                <div className="card p-5">
                  <h3 className="section-title mb-4">Revenue by Payment Source</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sourceChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>
                        {sourceChart.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip formatter={(v)=>[formatCurrency(v)]}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Stock by shop */}
              {shopChart.length > 0 && (reportType === 'all' || reportType === 'inventory') && (
                <div className="card p-5">
                  <h3 className="section-title mb-4">Stock by Shop</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={shopChart} margin={{top:5,right:10,bottom:5,left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis dataKey="shop" tick={{fontSize:11}} stroke="#94a3b8"/>
                      <YAxis tick={{fontSize:11}} stroke="#94a3b8"/>
                      <Tooltip/>
                      <Bar dataKey="qty" fill="#3358e8" radius={[4,4,0,0]} name="Units in Stock"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Job orders by dept */}
              {deptChart.length > 0 && (reportType === 'all' || reportType === 'orders') && (
                <div className="card p-5">
                  <h3 className="section-title mb-4">Job Orders by Department</h3>
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={deptChart} layout="vertical" margin={{top:5,right:20,bottom:5,left:60}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
                      <XAxis type="number" tick={{fontSize:11}} stroke="#94a3b8"/>
                      <YAxis type="category" dataKey="dept" tick={{fontSize:10}} stroke="#94a3b8" width={55}/>
                      <Tooltip/>
                      <Bar dataKey="count" fill="#16a34a" radius={[0,4,4,0]} name="Job Orders"/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Low stock table */}
            {lowStock.length > 0 && (reportType === 'all' || reportType === 'inventory') && (
              <div className="card overflow-hidden">
                <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-red-600"/><h3 className="section-title text-red-700">Low Stock Alert ({lowStock.length} items)</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr><th className="th">Item</th><th className="th">Category</th><th className="th">Shop</th><th className="th text-right">Stock</th><th className="th text-right">Reorder At</th><th className="th text-right">Available</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {lowStock.map(i=>(
                        <tr key={i.item_id} className="hover:bg-slate-50">
                          <td className="td font-medium text-slate-800">{i.name}</td>
                          <td className="td"><span className="badge bg-slate-100 text-slate-600">{i.category}</span></td>
                          <td className="td text-slate-500">{i.shop?.replace('_',' ')}</td>
                          <td className={cn('td text-right font-bold',i.stock_quantity===0?'text-red-600':'text-orange-600')}>{i.stock_quantity}</td>
                          <td className="td text-right text-slate-400">{i.reorder_level}</td>
                          <td className={cn('td text-right font-bold',i.stock_quantity-i.reserved_quantity<=0?'text-red-600':'text-orange-600')}>{i.stock_quantity-i.reserved_quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Audit Reports */}
            {(reportType === 'audit_sales' || reportType === 'audit_inventory' || reportType === 'audit_voids' || reportType === 'audit_or_log' || reportType === 'feedback') && (
              <>
                <div className="flex justify-end mb-4 no-print">
                  <button 
                    onClick={() => { 
                      const url = `/print?type=${reportType}&from=${from}&to=${to}`
                      window.open(url, '_blank', 'width=1024,height=768')
                    }}
                    className="btn-primary gap-2"
                  >
                    <Printer size={16} /> Print Report
                  </button>
                </div>
                <AuditReportView 
                  type={reportType} 
                  data={data} 
                  from={from} 
                  to={to} 
                />
              </>
            )}
          </>
        )}
        
      </div>
      </div>
    </div>
  )
}

// Audit Report View Component
function AuditReportView({ type, data, from, to }) {
  
  // Filter order items by date range
  const orderIdsInRange = new Set(data.orders.map(o => o.order_id))
  const filteredOrderItems = data.orderItems.filter(oi => orderIdsInRange.has(oi.order_id))
  
  // Filter payments with OR numbers
  const orPayments = data.payments.filter(p => p.or_number).sort((a, b) => a.or_number.localeCompare(b.or_number))
  
  // Calculations
  const totalSales = data.payments.reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const cashPayments = data.payments.filter(p => p.payment_source === 'Cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const gcashPayments = data.payments.filter(p => p.payment_source === 'GCash').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const cardPayments = data.payments.filter(p => p.payment_source === 'Card').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
  const cancelledValue = data.cancelledOrders.reduce((s, o) => s + parseFloat(o.total_amount || 0), 0)
  const totalInventoryValue = data.inventory.reduce((s, item) => s + (parseFloat(item.price || 0) * parseInt(item.stock_quantity || 0)), 0)
  
  // Group payments by date for daily register
  const byDate = data.payments.reduce((acc, p) => {
    const date = p.date_paid || p.created_at?.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(p)
    return acc
  }, {})

  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 print:border-none print:p-0 print-container">
      {/* Report Header - HNU Official Letterhead */}
      <div className="mb-6 pb-4 border-b-2 border-slate-800 print-header">
        {/* Top Row: Logo and University Header */}
        <div className="flex items-start gap-4 mb-3">
          {/* HNU Logo */}
          <div className="shrink-0">
            <img 
              src="/images/hnu-logo.png" 
              alt="HNU Logo" 
              className="w-16 h-16 object-contain"
              onError={(e) => {
                e.target.style.display = 'none'
                e.target.nextSibling.style.display = 'flex'
              }}
            />
            <div className="w-16 h-16 border-2 border-gray-400 flex items-center justify-center bg-gray-100 hidden">
              <span className="text-xs text-gray-500">HNU</span>
            </div>
          </div>
          
          {/* University Name and Core Values */}
          <div className="flex-1 pt-1">
            <h1 className="text-xl font-bold uppercase tracking-wide text-green-700 mb-1">
              Holy Name University
            </h1>
            <p className="text-[10px] uppercase tracking-wider text-gray-600 mb-0.5">
              INTEGRITY • SOCIAL RESPONSIBILITY • EXCELLENCE • EVANGELIZATION • SERVANT LEADERSHIP
            </p>
            <p className="text-[9px] text-gray-500">
              Corner Dagohoy and Gallares Streets, Tagbilaran City 6300, Bohol, Philippines
            </p>
            <p className="text-[9px] text-gray-500">
              +63 (38) 501-0742 | (38) 501-0742 | +63 917 631 3333 | info@hnu.edu.ph | www.hnu.edu.ph
            </p>
          </div>
        </div>
        
        {/* Report Title */}
        <h2 className="text-lg font-bold uppercase text-center border-t border-b border-slate-800 py-2 my-3">
          {type === 'audit_sales' && 'Daily Sales & Collection Report'}
          {type === 'audit_inventory' && 'Inventory Ledger / Stock Listing'}
          {type === 'audit_voids' && 'Void / Cancellation Report'}
          {type === 'audit_or_log' && 'Official Receipt (OR) Log'}
        </h2>
        
        {/* Date Information */}
        <div className="text-sm text-slate-500 text-center">
          <p>Period: {formatDate(from)} to {formatDate(to)}</p>
          <p className="text-xs mt-1">Generated: {formatDateTime(new Date().toISOString())}</p>
        </div>
      </div>

      {/* AUDIT: DAILY SALES */}
      {type === 'audit_sales' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Total Collection</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalSales)}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Total Orders</p>
              <p className="text-lg font-bold">{data.orders.length}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Released</p>
              <p className="text-lg font-bold text-blue-600">
                {data.orders.filter(o => o.status === 'Released').length}
              </p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">ORs Issued</p>
              <p className="text-lg font-bold">{orPayments.length}</p>
            </div>
          </div>

          {/* Collection by Payment Method */}
          <h3 className="font-bold text-sm uppercase border-b border-slate-800 pb-1 mb-3">Collection by Payment Method</h3>
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2 text-left">Payment Method</th>
                <th className="border border-slate-300 p-2 text-center">Transactions</th>
                <th className="border border-slate-300 p-2 text-right">Total Amount</th>
                <th className="border border-slate-300 p-2 text-right">% of Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-300 p-2">Cash</td>
                <td className="border border-slate-300 p-2 text-center">{data.payments.filter(p => p.payment_source === 'Cash').length}</td>
                <td className="border border-slate-300 p-2 text-right">{formatCurrency(cashPayments)}</td>
                <td className="border border-slate-300 p-2 text-right">{totalSales ? ((cashPayments / totalSales) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2">GCash / Digital</td>
                <td className="border border-slate-300 p-2 text-center">{data.payments.filter(p => p.payment_source === 'GCash').length}</td>
                <td className="border border-slate-300 p-2 text-right">{formatCurrency(gcashPayments)}</td>
                <td className="border border-slate-300 p-2 text-right">{totalSales ? ((gcashPayments / totalSales) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr>
                <td className="border border-slate-300 p-2">Card</td>
                <td className="border border-slate-300 p-2 text-center">{data.payments.filter(p => p.payment_source === 'Card').length}</td>
                <td className="border border-slate-300 p-2 text-right">{formatCurrency(cardPayments)}</td>
                <td className="border border-slate-300 p-2 text-right">{totalSales ? ((cardPayments / totalSales) * 100).toFixed(1) : 0}%</td>
              </tr>
              <tr className="font-bold bg-slate-100">
                <td className="border border-slate-300 p-2">TOTAL</td>
                <td className="border border-slate-300 p-2 text-center">{data.payments.length}</td>
                <td className="border border-slate-300 p-2 text-right">{formatCurrency(totalSales)}</td>
                <td className="border border-slate-300 p-2 text-right">100%</td>
              </tr>
            </tbody>
          </table>

          {/* Daily Register */}
          <h3 className="font-bold text-sm uppercase border-b border-slate-800 pb-1 mb-3">Daily Register / X-Read</h3>
          <table className="w-full text-sm border-collapse mb-6">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2">Date</th>
                <th className="border border-slate-300 p-2">Opening OR</th>
                <th className="border border-slate-300 p-2">Closing OR</th>
                <th className="border border-slate-300 p-2 text-center">OR Count</th>
                <th className="border border-slate-300 p-2 text-right">Cash</th>
                <th className="border border-slate-300 p-2 text-right">Digital</th>
                <th className="border border-slate-300 p-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(byDate).sort().map(([date, payments]) => {
                const orNumbers = payments.filter(p => p.or_number).map(p => p.or_number).sort()
                const cash = payments.filter(p => p.payment_source === 'Cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
                const digital = payments.filter(p => p.payment_source !== 'Cash').reduce((s, p) => s + parseFloat(p.amount || 0), 0)
                return (
                  <tr key={date}>
                    <td className="border border-slate-300 p-2">{formatDate(date)}</td>
                    <td className="border border-slate-300 p-2 font-mono">{orNumbers[0] || 'N/A'}</td>
                    <td className="border border-slate-300 p-2 font-mono">{orNumbers[orNumbers.length - 1] || 'N/A'}</td>
                    <td className="border border-slate-300 p-2 text-center">{orNumbers.length}</td>
                    <td className="border border-slate-300 p-2 text-right">{formatCurrency(cash)}</td>
                    <td className="border border-slate-300 p-2 text-right">{formatCurrency(digital)}</td>
                    <td className="border border-slate-300 p-2 text-right font-bold">{formatCurrency(cash + digital)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}

      {/* AUDIT: INVENTORY LEDGER */}
      {type === 'audit_inventory' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Total Items</p>
              <p className="text-lg font-bold">{data.inventory.length}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Inventory Value</p>
              <p className="text-lg font-bold text-green-600">{formatCurrency(totalInventoryValue)}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Low Stock</p>
              <p className="text-lg font-bold text-orange-600">
                {data.inventory.filter(i => parseInt(i.stock_quantity) <= parseInt(i.reorder_level || 10)).length}
              </p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Out of Stock</p>
              <p className="text-lg font-bold text-red-600">
                {data.inventory.filter(i => parseInt(i.stock_quantity) === 0).length}
              </p>
            </div>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1">SKU</th>
                <th className="border border-slate-300 p-1">Item Name</th>
                <th className="border border-slate-300 p-1">Category</th>
                <th className="border border-slate-300 p-1 text-right">Stock</th>
                <th className="border border-slate-300 p-1 text-right">Reserved</th>
                <th className="border border-slate-300 p-1 text-right">Available</th>
                <th className="border border-slate-300 p-1 text-right">Unit Price</th>
                <th className="border border-slate-300 p-1 text-right">Total Value</th>
              </tr>
            </thead>
            <tbody>
              {data.inventory.sort((a, b) => a.name?.localeCompare(b.name)).map(item => {
                const available = (item.stock_quantity || 0) - (item.reserved_quantity || 0)
                const value = (item.stock_quantity || 0) * parseFloat(item.price || 0)
                const isLow = parseInt(item.stock_quantity) <= parseInt(item.reorder_level || 10)
                const isOut = parseInt(item.stock_quantity) === 0
                return (
                  <tr key={item.item_id} className={isOut ? 'bg-red-50' : isLow ? 'bg-orange-50' : ''}>
                    <td className="border border-slate-300 p-1 font-mono">{item.sku || item.item_id}</td>
                    <td className="border border-slate-300 p-1">{item.name}</td>
                    <td className="border border-slate-300 p-1">{item.category}</td>
                    <td className="border border-slate-300 p-1 text-right">{item.stock_quantity}</td>
                    <td className="border border-slate-300 p-1 text-right">{item.reserved_quantity || 0}</td>
                    <td className="border border-slate-300 p-1 text-right font-bold">{available}</td>
                    <td className="border border-slate-300 p-1 text-right">{formatCurrency(item.price)}</td>
                    <td className="border border-slate-300 p-1 text-right">{formatCurrency(value)}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="font-bold bg-slate-200">
                <td colSpan={7} className="border border-slate-300 p-2 text-right">TOTAL INVENTORY VALUE:</td>
                <td className="border border-slate-300 p-2 text-right text-green-700">{formatCurrency(totalInventoryValue)}</td>
              </tr>
            </tfoot>
          </table>
        </>
      )}

      {/* AUDIT: VOID/CANCEL REPORT */}
      {type === 'audit_voids' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Cancelled Orders</p>
              <p className="text-lg font-bold text-red-600">{data.cancelledOrders.length}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Cancelled Value</p>
              <p className="text-lg font-bold text-red-600">{formatCurrency(cancelledValue)}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">% of Sales</p>
              <p className="text-lg font-bold">
                {totalSales ? ((cancelledValue / (totalSales + cancelledValue)) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2">Date Cancelled</th>
                <th className="border border-slate-300 p-2">Order #</th>
                <th className="border border-slate-300 p-2">Customer</th>
                <th className="border border-slate-300 p-2 text-right">Amount</th>
                <th className="border border-slate-300 p-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {data.cancelledOrders.map((order) => (
                <tr key={order.order_id} className="bg-red-50">
                  <td className="border border-slate-300 p-2">{formatDateTime(order.updated_at)}</td>
                  <td className="border border-slate-300 p-2 font-mono font-bold">{order.order_number}</td>
                  <td className="border border-slate-300 p-2">
                    {order.user?.first_name} {order.user?.last_name} ({order.user?.id_number})
                  </td>
                  <td className="border border-slate-300 p-2 text-right font-bold">{formatCurrency(order.total_amount)}</td>
                  <td className={cn('border border-slate-300 p-2 font-bold', !order.notes && 'text-red-600')}>
                    {order.notes || 'NO REASON PROVIDED'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="font-bold text-red-800">Audit Note</h3>
            <p className="text-sm text-red-700">
              High cancellation rates may indicate operational issues or potential fraud. 
              Each cancellation should have a documented reason and supervisor approval.
            </p>
          </div>
        </>
      )}

      {/* AUDIT: OR LOG */}
      {type === 'audit_or_log' && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">First OR</p>
              <p className="text-lg font-bold">{orPayments[0]?.or_number || 'N/A'}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Last OR</p>
              <p className="text-lg font-bold">{orPayments[orPayments.length - 1]?.or_number || 'N/A'}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Total ORs</p>
              <p className="text-lg font-bold text-green-600">{orPayments.length}</p>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2">OR Number</th>
                <th className="border border-slate-300 p-2">Date</th>
                <th className="border border-slate-300 p-2">Order #</th>
                <th className="border border-slate-300 p-2 text-right">Amount</th>
                <th className="border border-slate-300 p-2">Method</th>
                <th className="border border-slate-300 p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {orPayments.map((payment) => (
                <tr key={payment.payment_id}>
                  <td className="border border-slate-300 p-2 font-mono font-bold">{payment.or_number}</td>
                  <td className="border border-slate-300 p-2">{formatDate(payment.date_paid)}</td>
                  <td className="border border-slate-300 p-2 font-mono">{payment.order_id}</td>
                  <td className="border border-slate-300 p-2 text-right">{formatCurrency(payment.amount)}</td>
                  <td className="border border-slate-300 p-2">{payment.payment_source}</td>
                  <td className="border border-slate-300 p-2 text-green-600 font-bold">VALID</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h3 className="font-bold text-yellow-800">Gap Detection</h3>
            <p className="text-sm text-yellow-700">
              Gaps in OR numbering may indicate unrecorded sales or unauthorized voids. 
              This log should be reconciled daily with physical OR booklets.
            </p>
          </div>
        </>
      )}

      {/* AUDIT: FEEDBACK */}
      {type === 'feedback' && (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Total Reviews</p>
              <p className="text-lg font-bold">{data.feedback.length}</p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Average Rating</p>
              <p className="text-lg font-bold text-green-600">
                {data.feedback.length ? (data.feedback.reduce((s, f) => s + parseFloat(f.rating || 0), 0) / data.feedback.length).toFixed(1) : '0.0'} / 5.0
              </p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">5-Star Reviews</p>
              <p className="text-lg font-bold text-green-600">
                {data.feedback.filter(f => Math.round(parseFloat(f.rating || 0)) === 5).length}
              </p>
            </div>
            <div className="p-3 border border-slate-300 text-center">
              <p className="text-xs text-slate-500 uppercase">Low Ratings (1-2)</p>
              <p className="text-lg font-bold text-red-600">
                {data.feedback.filter(f => {
                  const r = Math.round(parseFloat(f.rating || 0))
                  return r === 1 || r === 2
                }).length}
              </p>
            </div>
          </div>

          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-2">Date</th>
                <th className="border border-slate-300 p-2">Rating</th>
                <th className="border border-slate-300 p-2">Visual</th>
                <th className="border border-slate-300 p-2">Sentiment</th>
                <th className="border border-slate-300 p-2">Comments</th>
              </tr>
            </thead>
            <tbody>
              {data.feedback.map((f, idx) => {
                const rating = parseFloat(f.rating || 0)
                const rounded = Math.round(rating)
                let sentiment = 'Neutral'
                let sentimentColor = 'text-yellow-600'
                if (rating >= 4) { sentiment = 'Positive'; sentimentColor = 'text-green-600' }
                if (rating <= 2) { sentiment = 'Negative'; sentimentColor = 'text-red-600' }
                return (
                  <tr key={idx}>
                    <td className="border border-slate-300 p-2">{formatDate(f.created_at)}</td>
                    <td className="border border-slate-300 p-2 text-center font-bold">{rating.toFixed(1)}</td>
                    <td className="border border-slate-300 p-2 text-center">
                      {'★'.repeat(rounded)}{'☆'.repeat(5 - rounded)}
                    </td>
                    <td className={cn('border border-slate-300 p-2 font-bold', sentimentColor)}>{sentiment}</td>
                    <td className="border border-slate-300 p-2">{f.comments || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-bold text-blue-800">Feedback Analysis</h3>
            <p className="text-sm text-blue-700">
              Customer feedback is essential for service improvement. Low ratings should be reviewed 
              to identify areas for enhancement.
            </p>
          </div>
        </>
      )}

      {/* Itemized Sales Section (shown for audit_sales) */}
      {type === 'audit_sales' && filteredOrderItems.length > 0 && (
        <>
          <h3 className="font-bold text-sm uppercase border-b border-slate-800 pb-1 mb-3 mt-8">Itemized Sales Detail</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 p-1">Order #</th>
                <th className="border border-slate-300 p-1">Item</th>
                <th className="border border-slate-300 p-1">Category</th>
                <th className="border border-slate-300 p-1 text-right">Qty</th>
                <th className="border border-slate-300 p-1 text-right">Unit Price</th>
                <th className="border border-slate-300 p-1 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrderItems.map((oi, idx) => (
                <tr key={idx}>
                  <td className="border border-slate-300 p-1 font-mono">{oi.order_id}</td>
                  <td className="border border-slate-300 p-1">{oi.item?.name}</td>
                  <td className="border border-slate-300 p-1">{oi.item?.category}</td>
                  <td className="border border-slate-300 p-1 text-right">{oi.quantity}</td>
                  <td className="border border-slate-300 p-1 text-right">{formatCurrency(oi.unit_price)}</td>
                  <td className="border border-slate-300 p-1 text-right font-bold">{formatCurrency(oi.quantity * oi.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Signatures */}
      <div className="mt-12 grid grid-cols-2 gap-16">
        <div className="text-center">
          <div className="border-t border-slate-800 pt-2">
            <p className="font-bold">Prepared By</p>
            <p className="text-xs text-slate-500">(Name & Signature)</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-slate-800 pt-2">
            <p className="font-bold">Verified By</p>
            <p className="text-xs text-slate-500">(Auditor / Supervisor)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
