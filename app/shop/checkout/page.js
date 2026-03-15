'use client'
import { useCart } from '@/components/providers/CartProvider'
import { useAuth } from '@/components/providers/AuthProvider'
import { createOrder } from '../actions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import AppointmentBooking from '../appointments/AppointmentBooking'
import TellerSlip from './TellerSlip'

export default function CheckoutPage() {
  const { profile } = useAuth()
  const { cart, cartTotal, clearCart } = useCart()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState(null)
  const [realOrderId, setRealOrderId] = useState(null) // Database UUID
  const [placedOrderTotal, setPlacedOrderTotal] = useState(0)

  if (cart.length === 0 && !success) {
    router.push('/shop/cart')
    return null
  }

  const handlePlaceOrder = async () => {
    const total = cartTotal
    setLoading(true)
    setError('')
    
    try {
      const result = await createOrder(cart, total)
      
      if (result.success) {
        setSuccess(true)
        setOrderId(result.orderNumber)
        setRealOrderId(result.orderId)
        setPlacedOrderTotal(total)
        clearCart()
      } else {
        setError(result.message || 'Something went wrong. Please try again.')
      }
    } catch (err) {
      setError('An unexpected error occurred.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    if (placedOrderTotal > 100) {
      return (
        <div className="max-w-2xl mx-auto min-h-[60vh] py-12 px-4">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600">
              <CheckCircle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Order Placed!</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Since your order is above ₱100.00, please proceed to the University Teller for payment.
            </p>
          </div>

          <TellerSlip 
            order={{ orderNumber: orderId, totalAmount: placedOrderTotal }} 
            user={profile} 
          />

          <div className="mt-8 text-center space-y-4">
             <AppointmentBooking orderId={realOrderId} onComplete={() => router.push(`/feedback?action=create&orderId=${realOrderId}`)} />
             
             <Link href={`/feedback?action=create&orderId=${realOrderId}`} className="block text-sm text-slate-500 hover:text-hnu-dark underline">
               Give Feedback
             </Link>
          </div>
        </div>
      )
    }

    return (
      <div className="max-w-2xl mx-auto min-h-[60vh] flex flex-col items-center justify-center py-12">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle size={40} />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Order Placed Successfully!</h2>
          <p className="text-slate-500">
            Order # <span className="font-mono font-bold text-slate-700">{orderId}</span>
          </p>
        </div>

        <div className="w-full space-y-6">
          <AppointmentBooking orderId={realOrderId} onComplete={() => router.push(`/feedback?action=create&orderId=${realOrderId}`)} />
          
          <div className="flex justify-center">
            <Link href={`/feedback?action=create&orderId=${realOrderId}`} className="text-sm text-slate-500 hover:text-hnu-dark underline">
              Skip booking and give feedback
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-display font-bold text-hnu-dark mb-6">Checkout</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          {/* Pickup Info */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">1</span>
              Pickup Location
            </h3>
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="font-bold text-slate-800">Holy Name University - Finance Office</p>
              <p className="text-sm text-slate-500">Janssen Heights, Dampas District</p>
              <p className="text-sm text-slate-500">Tagbilaran City, Bohol</p>
            </div>
          </div>

          {/* Payment Method */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs">2</span>
              Payment Method
            </h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all hover:border-hnu-gold hover:bg-yellow-50/30 border-hnu-gold bg-yellow-50/10">
                <input type="radio" name="payment" defaultChecked className="text-hnu-gold focus:ring-hnu-gold" />
                <div>
                  <p className="font-bold text-slate-800">Cash on Pickup / Over-the-Counter</p>
                  <p className="text-xs text-slate-500">Pay directly at the Finance Office cashier.</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-4 border border-slate-200 rounded-lg cursor-not-allowed opacity-60">
                <input type="radio" name="payment" disabled />
                <div>
                  <p className="font-bold text-slate-800">Online Payment (GCash/Maya)</p>
                  <p className="text-xs text-slate-500">Coming soon</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 sticky top-24">
            <h3 className="font-bold text-slate-800 mb-4">Order Review</h3>
            
            <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {cart.map(item => (
                <div key={item.item_id} className="flex justify-between items-start text-sm">
                   <div className="flex gap-3">
                     <div className="w-10 h-10 bg-slate-100 rounded border border-slate-200 overflow-hidden flex-shrink-0">
                       {item.image_url ? (
                         <img src={item.image_url} className="w-full h-full object-cover" />
                       ) : (
                         <div className="w-full h-full flex items-center justify-center text-slate-300">📖</div>
                       )}
                     </div>
                     <div>
                       <p className="font-medium text-slate-700 line-clamp-1">{item.name}</p>
                       <p className="text-xs text-slate-500">Qty: {item.quantity}</p>
                     </div>
                   </div>
                   <p className="font-medium text-slate-900">₱{(item.price * item.quantity).toFixed(2)}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4 space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-900">₱{cartTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span className="text-slate-800">Total</span>
                <span className="text-hnu-dark">₱{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <button 
              onClick={handlePlaceOrder}
              disabled={loading}
              className="w-full btn-primary py-3.5 justify-center text-base font-bold shadow-lg shadow-brand-500/20 hover:shadow-xl hover:shadow-brand-500/30 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Processing...
                </>
              ) : (
                'Place Order'
              )}
            </button>
            <p className="text-xs text-center text-slate-400 mt-4">
              By placing this order, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
