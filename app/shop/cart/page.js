'use client'
import { useCart } from '@/components/providers/CartProvider'
import { useToast } from '@/components/providers/ToastProvider'
import Link from 'next/link'
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Tag } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function CartPage() {
  const { cart, cartKey, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart()
  const toast = useToast()

  function handleRemove(item) {
    removeFromCart(cartKey(item))
    toast(`${item.name} removed from cart.`, 'info')
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-300">
          <ShoppingBag size={48}/>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Your cart is empty</h2>
        <p className="text-slate-500 mb-8 max-w-md">Browse the shop and add items to your cart.</p>
        <Link href="/shop" className="btn-primary py-3 px-8 text-base">Start Shopping</Link>
      </div>
    )
  }

  const needsTeller = cartTotal >= 100

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-display font-bold text-hnu-dark">Shopping Cart</h1>
        <button onClick={()=>{clearCart();toast('Cart cleared.','info')}} className="text-xs text-red-400 hover:text-red-600 font-medium underline">Clear cart</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          {cart.map(item => (
            <div key={cartKey(item)} className="bg-white rounded-xl border border-slate-100 p-4 flex items-center gap-4 hover:border-slate-200 transition-colors shadow-sm">
              <div className="w-16 h-16 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 shrink-0 overflow-hidden">
                {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover"/> : <span className="text-2xl">📖</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{item.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{item.category} · {item.shop?.replace('_',' ')}{item.selectedSize ? ` · Size: ${item.selectedSize}` : ''}</p>
                <p className="font-bold text-hnu-dark mt-1">{formatCurrency(item.price)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={()=>updateQuantity(cartKey(item), item.quantity-1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><Minus size={12}/></button>
                <span className="w-8 text-center font-bold text-slate-700">{item.quantity}</span>
                <button onClick={()=>updateQuantity(cartKey(item), item.quantity+1)} className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"><Plus size={12}/></button>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-slate-700">{formatCurrency(item.price * item.quantity)}</p>
                <button onClick={()=>handleRemove(item)} className="mt-1 text-red-400 hover:text-red-600 transition-colors"><Trash2 size={14}/></button>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-4">Order Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>{cart.reduce((s,c)=>s+c.quantity,0)} item(s)</span><span>{formatCurrency(cartTotal)}</span></div>
              <div className="flex justify-between text-slate-400"><span>Service Fee</span><span>Free</span></div>
              <div className="border-t border-slate-100 pt-2 flex justify-between font-bold text-slate-800 text-base"><span>Total</span><span className="text-hnu-dark">{formatCurrency(cartTotal)}</span></div>
            </div>
          </div>

          {/* Payment note */}
          <div className={`rounded-xl p-4 border text-sm ${needsTeller ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
            <p className="font-bold mb-1 flex items-center gap-1.5"><Tag size={13}/> Payment Method</p>
            {needsTeller
              ? <p>Your total is ₱100+. You must pay at the <strong>School Teller</strong> and present your Official Receipt (OR) at the bookstore.</p>
              : <p>Below ₱100 — pay directly at the <strong>Bookstore counter</strong> upon pickup.</p>
            }
          </div>

          <Link href="/shop/checkout" className="block w-full btn-primary py-3 justify-center text-base font-bold shadow-lg shadow-brand-500/20 text-center">
            Proceed to Checkout <ArrowRight size={16}/>
          </Link>
          <Link href="/shop" className="block text-center text-sm text-slate-400 hover:text-slate-600 transition-colors">← Continue Shopping</Link>
        </div>
      </div>
    </div>
  )
}
