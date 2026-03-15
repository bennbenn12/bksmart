'use client'
import { formatCurrency } from '@/lib/utils'
import { Printer } from 'lucide-react'

export default function TellerSlip({ order, user, items }) {
  if (!order) return null

  // Calculate total from items if not provided directly
  const totalAmount = order.total_amount || (items?.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0)) || 0

  return (
    <div className="max-w-md mx-auto bg-white border-2 border-slate-800 p-8 font-mono text-sm relative print:border-none print:w-full print:max-w-none shadow-xl">
      <div className="text-center mb-6 pb-6 border-b-2 border-slate-800 border-dashed">
        <h2 className="font-bold text-xl uppercase mb-1">Holy Name University</h2>
        <p className="text-xs uppercase tracking-wider">Finance Office - Teller</p>
        <p className="text-xs mt-2">Tagbilaran City, Bohol</p>
      </div>

      <div className="space-y-4 mb-6">
        <div className="flex justify-between">
          <span className="text-slate-500">Date:</span>
          <span className="font-bold">{new Date(order.created_at || new Date()).toLocaleDateString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Order Ref:</span>
          <span className="font-bold">{order.order_number || order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Student ID:</span>
          <span className="font-bold">{user?.student_id || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Name:</span>
          <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>
        </div>
      </div>

      {items && items.length > 0 && (
        <div className="mb-6 pb-6 border-b border-slate-200 border-dashed">
          <p className="font-bold mb-2 uppercase text-xs text-slate-500">Items</p>
          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between text-xs">
                <span>{item.quantity}x {item.item?.name || 'Item'}</span>
                <span>{formatCurrency(item.subtotal || (item.unit_price * item.quantity))}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-y-2 border-slate-800 border-dashed py-4 mb-6">
        <div className="flex justify-between items-end">
          <span className="font-bold uppercase">Amount Due</span>
          <span className="text-2xl font-bold">{formatCurrency(totalAmount)}</span>
        </div>
      </div>

      <div className="text-center space-y-4">
        <div className="p-3 bg-slate-100 rounded text-xs text-left mb-4">
          <p className="font-bold mb-1">Instructions:</p>
          <ol className="list-decimal list-inside space-y-1 text-slate-600">
            <li>Present this slip to the University Teller.</li>
            <li>Pay the amount due.</li>
            <li>Present the Official Receipt to the Bookstore to claim your items.</li>
          </ol>
        </div>

        <p className="text-xs uppercase font-bold text-slate-800 pt-2">
          *** Please present this slip to the teller ***
        </p>
        
        <button 
          onClick={() => window.print()} 
          className="btn-primary w-full flex items-center justify-center gap-2 print:hidden"
        >
          <Printer size={16} /> Print Slip
        </button>
      </div>
    </div>
  )
}
