'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { LoadingSpinner, EmptyState } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { formatCurrency, formatDate, cn } from '@/lib/utils'
import { 
  TrendingUp, TrendingDown, ShoppingCart, Users, CreditCard, 
  Package, Calendar, Star, Download, RefreshCw, ChevronDown,
  BarChart3, PieChart, Activity
} from 'lucide-react'

const today = () => new Date().toISOString().split('T')[0]
const thisWeekStart = () => {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}
const thisMonthStart = () => {
  const d = new Date()
  d.setDate(1)
  return d.toISOString().split('T')[0]
}

export default function AnalyticsPage() {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('today') // today, week, month
  const [stats, setStats] = useState({
    revenue: 0,
    orders: 0,
    avgOrderValue: 0,
    topItems: [],
    salesByCategory: [],
    hourlyData: [],
    customerCount: 0,
    newCustomers: 0,
    feedbackCount: 0,
    avgRating: 0
  })
  const supabase = createClient()
  const isManager = profile?.role_type === 'bookstore_manager'

  const fetchAnalytics = useCallback(async () => {
    setLoading(true)
    
    let startDate = today()
    if (dateRange === 'week') startDate = thisWeekStart()
    if (dateRange === 'month') startDate = thisMonthStart()

    try {
      // Revenue and orders
      const { data: ordersData } = await supabase
        .from('orders')
        .select('total_amount, created_at, user_id, status')
        .gte('created_at', startDate)
        .in('status', ['Released', 'Ready'])

      // Top selling items
      const { data: itemsData } = await supabase
        .from('order_items')
        .select('quantity, unit_price, item:item_id(name, category)')
        .gte('created_at', startDate)
        .limit(100)

      // Customer stats
      const { data: customersData } = await supabase
        .from('orders')
        .select('user_id')
        .gte('created_at', startDate)

      // Feedback stats
      const { data: feedbackData } = await supabase
        .from('feedback')
        .select('rating')
        .gte('created_at', startDate)

      // Calculate stats
      const revenue = ordersData?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0
      const orders = ordersData?.length || 0
      const avgOrderValue = orders > 0 ? revenue / orders : 0
      const uniqueCustomers = new Set(customersData?.map(o => o.user_id)).size

      // Top items aggregation
      const itemMap = new Map()
      itemsData?.forEach(item => {
        const key = item.item?.name || 'Unknown'
        const existing = itemMap.get(key) || { name: key, quantity: 0, revenue: 0, category: item.item?.category }
        existing.quantity += item.quantity || 0
        existing.revenue += (item.quantity || 0) * (item.unit_price || 0)
        itemMap.set(key, existing)
      })
      const topItems = Array.from(itemMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      // Sales by category
      const categoryMap = new Map()
      topItems.forEach(item => {
        const cat = item.category || 'Other'
        const existing = categoryMap.get(cat) || { category: cat, revenue: 0 }
        existing.revenue += item.revenue
        categoryMap.set(cat, existing)
      })
      const salesByCategory = Array.from(categoryMap.values())
        .sort((a, b) => b.revenue - a.revenue)

      // Hourly data (for today only)
      let hourlyData = []
      if (dateRange === 'today') {
        const hours = Array(12).fill(0).map((_, i) => i + 8) // 8AM to 7PM
        hourlyData = hours.map(hour => {
          const hourOrders = ordersData?.filter(o => {
            const orderHour = new Date(o.created_at).getHours()
            return orderHour === hour
          }) || []
          return {
            hour: `${hour % 12 || 12}${hour < 12 ? 'AM' : 'PM'}`,
            orders: hourOrders.length,
            revenue: hourOrders.reduce((sum, o) => sum + (o.total_amount || 0), 0)
          }
        })
      }

      // Feedback
      const ratings = feedbackData?.map(f => f.rating).filter(r => r) || []
      const avgRating = ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '0'

      setStats({
        revenue,
        orders,
        avgOrderValue,
        topItems,
        salesByCategory,
        hourlyData,
        customerCount: uniqueCustomers,
        newCustomers: 0, // Would need historical data
        feedbackCount: feedbackData?.length || 0,
        avgRating
      })
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }, [dateRange, supabase])

  useEffect(() => {
    if (profile) fetchAnalytics()
  }, [profile, fetchAnalytics])

  if (!isManager) {
    return (
      <div className="page-enter">
        <Header title="Analytics & Reports" />
        <div className="p-6">
          <EmptyState 
            title="Access Denied" 
            description="Only managers can access analytics and reports."
          />
        </div>
      </div>
    )
  }

  const exportData = () => {
    const data = {
      dateRange,
      generatedAt: new Date().toISOString(),
      stats,
      summary: {
        totalRevenue: formatCurrency(stats.revenue),
        totalOrders: stats.orders,
        avgOrderValue: formatCurrency(stats.avgOrderValue),
        uniqueCustomers: stats.customerCount,
        avgRating: stats.avgRating
      }
    }
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-${dateRange}-${today()}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="page-enter">
      <Header title="Analytics & Reports" />
      <div className="p-6 space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
            {['today', 'week', 'month'].map((range) => (
              <button
                key={range}
                onClick={() => setDateRange(range)}
                className={cn(
                  'px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all',
                  dateRange === range 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-slate-600 hover:text-slate-800'
                )}
              >
                {range === 'today' ? 'Today' : `This ${range}`}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={fetchAnalytics}
              className="btn-ghost gap-1 text-sm"
            >
              <RefreshCw size={14} /> Refresh
            </button>
            <button 
              onClick={exportData}
              className="btn-primary gap-1 text-sm"
            >
              <Download size={14} /> Export
            </button>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                label="Total Revenue"
                value={formatCurrency(stats.revenue)}
                icon={TrendingUp}
                color="green"
                subtext={`${stats.orders} orders`}
              />
              <KPICard
                label="Orders"
                value={stats.orders}
                icon={ShoppingCart}
                color="brand"
                subtext={`Avg: ${formatCurrency(stats.avgOrderValue)}`}
              />
              <KPICard
                label="Customers"
                value={stats.customerCount}
                icon={Users}
                color="blue"
                subtext="Unique customers"
              />
              <KPICard
                label="Avg Rating"
                value={stats.avgRating}
                icon={Star}
                color="yellow"
                subtext={`${stats.feedbackCount} reviews`}
              />
            </div>

            {/* Charts Section */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Top Selling Items */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={18} className="text-brand-600" />
                  <h3 className="font-bold text-slate-800">Top Selling Items</h3>
                </div>
                {stats.topItems.length === 0 ? (
                  <p className="text-slate-400 text-sm">No sales data for this period</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topItems.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 truncate">{item.name}</p>
                          <p className="text-xs text-slate-400">{item.quantity} sold</p>
                        </div>
                        <span className="text-sm font-bold text-slate-700">{formatCurrency(item.revenue)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sales by Category */}
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart size={18} className="text-purple-600" />
                  <h3 className="font-bold text-slate-800">Sales by Category</h3>
                </div>
                {stats.salesByCategory.length === 0 ? (
                  <p className="text-slate-400 text-sm">No category data</p>
                ) : (
                  <div className="space-y-3">
                    {stats.salesByCategory.map((cat) => (
                      <div key={cat.category} className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-slate-700">{cat.category}</span>
                            <span className="text-sm font-bold text-slate-700">
                              {formatCurrency(cat.revenue)}
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-brand-500 rounded-full"
                              style={{ 
                                width: `${(cat.revenue / stats.revenue * 100) || 0}%` 
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hourly Activity (Today only) */}
            {dateRange === 'today' && stats.hourlyData.length > 0 && (
              <div className="card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Activity size={18} className="text-orange-600" />
                  <h3 className="font-bold text-slate-800">Today's Activity</h3>
                </div>
                <div className="flex items-end gap-1 h-32">
                  {stats.hourlyData.map((hour) => (
                    <div key={hour.hour} className="flex-1 flex flex-col items-center gap-1">
                      <div 
                        className="w-full bg-brand-100 rounded-t transition-all hover:bg-brand-200"
                        style={{ 
                          height: `${Math.max((hour.revenue / Math.max(...stats.hourlyData.map(h => h.revenue))) * 100, 10)}%` 
                        }}
                        title={`${hour.hour}: ${formatCurrency(hour.revenue)} (${hour.orders} orders)`}
                      />
                      <span className="text-[10px] text-slate-400">{hour.hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary Report */}
            <div className="card p-5 bg-slate-50">
              <h3 className="font-bold text-slate-800 mb-4">Summary Report</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Period:</span>
                    <span className="font-medium">{dateRange === 'today' ? 'Today' : dateRange === 'week' ? 'This Week' : 'This Month'}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Total Revenue:</span>
                    <span className="font-bold">{formatCurrency(stats.revenue)}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Total Orders:</span>
                    <span className="font-medium">{stats.orders}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Average Order:</span>
                    <span className="font-medium">{formatCurrency(stats.avgOrderValue)}</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="flex justify-between">
                    <span className="text-slate-500">Unique Customers:</span>
                    <span className="font-medium">{stats.customerCount}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Feedback Count:</span>
                    <span className="font-medium">{stats.feedbackCount}</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Average Rating:</span>
                    <span className="font-medium">{stats.avgRating} ⭐</span>
                  </p>
                  <p className="flex justify-between">
                    <span className="text-slate-500">Top Category:</span>
                    <span className="font-medium">{stats.salesByCategory[0]?.category || 'N/A'}</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function KPICard({ label, value, icon: Icon, color, subtext }) {
  const colors = {
    green: 'bg-green-50 text-green-600 border-green-100',
    brand: 'bg-brand-50 text-brand-600 border-brand-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    yellow: 'bg-yellow-50 text-yellow-600 border-yellow-100',
    purple: 'bg-purple-50 text-purple-600 border-purple-100'
  }

  return (
    <div className={`card p-4 border ${colors[color]}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <div className="p-2 rounded-lg bg-white/50">
          <Icon size={20} />
        </div>
      </div>
      <p className="text-xs mt-2 opacity-80">{subtext}</p>
    </div>
  )
}
