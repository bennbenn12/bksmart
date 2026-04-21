'use client'
import { formatCurrency, formatDateTime, formatDate } from '@/lib/utils'
import { Printer, CheckCircle } from 'lucide-react'

/**
 * Official Receipt Component - For printing after order release
 * Shows all transaction details for customer and audit purposes
 */
export default function OfficialReceipt({ order, user, items, payments, processedBy }) {
  if (!order) return null

  const totalAmount = parseFloat(order.total_amount) || 
    (items?.reduce((sum, item) => sum + (parseFloat(item.unit_price) * item.quantity), 0)) || 0
  
  const payment = payments?.[0]
  const orNumber = payment?.or_number || order.or_number || 'N/A'
  const receiptDate = order.released_at || order.completed_at || new Date().toISOString()

  return (
    <div className="max-w-lg mx-auto bg-white p-8 font-mono text-sm relative print:border-none print:w-full print:max-w-none shadow-xl border border-slate-300">
      {/* Header */}
      <div className="text-center mb-6 pb-4 border-b-2 border-slate-800">
        <h1 className="font-bold text-lg uppercase tracking-wide">Holy Name University</h1>
        <p className="text-xs uppercase tracking-wider">BookSmart Bookstore</p>
        <p className="text-xs mt-1">Tagbilaran City, Bohol</p>
        <p className="text-xs mt-1">VAT Reg. TIN: 000-000-000-000</p>
        
        <div className="mt-4 pt-4 border-t border-slate-300">
          <h2 className="font-bold text-xl">OFFICIAL RECEIPT</h2>
          <p className="text-xs mt-1">OR No: <span className="font-bold">{orNumber}</span></p>
        </div>
      </div>

      {/* Customer Info */}
      <div className="mb-6 space-y-1 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Date:</span>
          <span className="font-bold">{formatDateTime(receiptDate)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Order Ref:</span>
          <span className="font-bold">{order.order_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">ID Number:</span>
          <span className="font-bold">{user?.id_number || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Customer:</span>
          <span className="font-bold uppercase">{user?.first_name} {user?.last_name}</span>
        </div>
        {processedBy && (
          <div className="flex justify-between">
            <span className="text-slate-500">Processed By:</span>
            <span className="font-bold">{processedBy.first_name} {processedBy.last_name}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-slate-800">
              <th className="text-left py-2">Qty</th>
              <th className="text-left py-2">Item Description</th>
              <th className="text-right py-2">Unit Price</th>
              <th className="text-right py-2">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items?.map((item, idx) => (
              <tr key={idx} className="border-b border-slate-200">
                <td className="py-2">{item.quantity}</td>
                <td className="py-2">{item.item?.name || item.name || 'Item'}</td>
                <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                <td className="py-2 text-right">{formatCurrency(item.subtotal || (item.unit_price * item.quantity))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="border-t-2 border-slate-800 pt-4 mb-6">
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatCurrency(totalAmount / 1.12)}</span>
          </div>
          <div className="flex justify-between">
            <span>VAT (12%):</span>
            <span>{formatCurrency(totalAmount - (totalAmount / 1.12))}</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t border-slate-400 pt-2 mt-2">
            <span>TOTAL AMOUNT PAID:</span>
            <span>{formatCurrency(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Payment Info */}
      <div className="mb-6 p-3 bg-slate-50 border border-slate-200 text-xs">
        <p className="font-bold mb-2">Payment Details:</p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-slate-500">Method:</span>
            <span className="font-bold uppercase">{payment?.payment_source || 'Cash'}</span>
          </div>
          {payment?.reference_number && (
            <div className="flex justify-between">
              <span className="text-slate-500">Ref No:</span>
              <span className="font-bold">{payment.reference_number}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Status:</span>
            <span className="font-bold text-green-600 flex items-center gap-1">
              <CheckCircle size={12} /> PAID
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center space-y-4 mt-8">
        <div className="pt-4 border-t border-slate-300">
          <p className="text-xs text-slate-500 mb-4">
            This is an official receipt. Please keep for your records.
          </p>
          
          <div className="grid grid-cols-2 gap-8 text-xs mt-6">
            <div className="text-center">
              <div className="border-t border-slate-400 pt-1 mt-8">
                <p className="font-bold">Customer Signature</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-slate-400 pt-1 mt-8">
                <p className="font-bold">Authorized Signature</p>
              </div>
            </div>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 mt-4">
          Thank you for shopping at BookSmart! <br/>
          For inquiries, contact bookstore@hnu.edu.ph
        </p>
        
        <button 
          onClick={() => window.print()} 
          className="btn-primary w-full flex items-center justify-center gap-2 print:hidden mt-6"
        >
          <Printer size={16} /> Print Receipt
        </button>
      </div>
    </div>
  )
}
