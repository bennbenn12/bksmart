'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/db/client'
import TellerSlip from '@/app/shop/checkout/TellerSlip'
import PrintStyles from '../../PrintStyles'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'

export default function OrderSlipPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function loadOrder() {
      if (!id) return
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Fetch order
      const { data: orderData } = await supabase
        .from('orders')
        .select('*, user:user_id(*), items:order_items(*, item:item_id(*))')
        .eq('order_id', id)
        .single()

      if (!orderData) {
        router.push('/shop/orders')
        return
      }

      // Security check
      const { data: profile } = await supabase
        .from('users')
        .select('role_type, user_id')
        .eq('auth_id', user.id)
        .single()

      const isStaff = ['bookstore_manager', 'bookstore_staff', 'working_student'].includes(profile?.role_type)
      
      if (orderData.user_id !== profile?.user_id && !isStaff) {
        setUnauthorized(true)
        setLoading(false)
        return
      }

      setOrder(orderData)
      setLoading(false)
    }

    loadOrder()
  }, [id, router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-brand-600" size={32} />
      </div>
    )
  }

  if (unauthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-800 mb-2">Unauthorized Access</h1>
          <p className="text-slate-500 mb-4">You do not have permission to view this order slip.</p>
          <Link href="/shop" className="btn-primary">Return to Shop</Link>
        </div>
      </div>
    )
  }

  if (!order) return null

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 print:bg-white print:p-0">
      <PrintStyles />
      <div className="max-w-md mx-auto print:max-w-none">
        <div className="mb-6 print:hidden flex items-center justify-between">
          <Link href="/shop/profile" className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1">
            <ArrowLeft size={16} /> Back to Profile
          </Link>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => window.print()} 
              className="btn-primary text-sm flex items-center gap-1"
            >
              <Printer size={14} /> Print Slip
            </button>
          </div>
        </div>
        <TellerSlip order={order} user={order?.user} items={order?.items} />
      </div>
    </div>
  )
}