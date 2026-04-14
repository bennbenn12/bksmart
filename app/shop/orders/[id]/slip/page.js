import { createClient } from '@/lib/db/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import TellerSlip from '@/app/shop/checkout/TellerSlip'
import PrintStyles from '../../PrintStyles'
import { ArrowLeft, Printer, Download } from 'lucide-react'

export default async function OrderSlipPage({ params }) {
  const supabase = await createClient()
  const { id } = await params

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: order } = await supabase
    .from('orders')
    .select('*, user:user_id(*), items:order_items(*, item:item_id(*))')
    .eq('order_id', id)
    .single()

  if (!order) notFound()

  // Security check: only owner or staff can view
  const { data: currentUserProfile } = await supabase
    .from('users')
    .select('role_type, id_number')
    .eq('auth_id', user.id)
    .single()

  const isStaff = ['bookstore_manager', 'bookstore_staff', 'working_student'].includes(currentUserProfile.role_type)
  
  if (order.user_id !== currentUserProfile.id_number && !isStaff) {
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
        <TellerSlip order={order} user={order.user} items={order.items} />
      </div>
    </div>
  )
}