'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { StatsCard, LoadingSpinner } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useRealtime } from '@/lib/useRealtime'
import { formatCurrency, cn } from '@/lib/utils'
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
]

export default function ReportsPage() {
  const [loading, setLoading]   = useState(true)
  const [from, setFrom]         = useState(new Date(Date.now()-86400000*30).toISOString().split('T')[0])
  const [to, setTo]             = useState(new Date().toISOString().split('T')[0])
  const [data, setData]         = useState({ orders:[], payments:[], inventory:[], feedback:[], jobOrders:[] })
  const [reportType, setReportType] = useState('all')
  const [showDownloadPicker, setShowDownloadPicker] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const [orders, payments, inventory, feedback, jobOrders] = await Promise.all([
      supabase.from('orders').select('order_id,status,total_amount,created_at').gte('created_at',from).lte('created_at',to+'T23:59:59'),
      supabase.from('payments').select('payment_id,amount,payment_source,date_paid,verified_at').gte('date_paid',from).lte('date_paid',to+'T23:59:59'),
      supabase.from('bookstore_items').select('item_id,name,stock_quantity,reserved_quantity,reorder_level,category,shop,price').eq('is_active',true),
      supabase.from('feedback').select('rating,created_at').not('rating','is',null),
      supabase.from('job_orders').select('job_id,status,department_account,created_at').gte('created_at',from).lte('created_at',to+'T23:59:59'),
    ])
    setData({ orders:orders.data||[], payments:payments.data||[], inventory:inventory.data||[], feedback:feedback.data||[], jobOrders:jobOrders.data||[] })
    setLoading(false)
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
          </>
        )}
      </div>
    </div>
  )
}
