'use client'
import { useState } from 'react'
import { useCart } from '@/components/providers/CartProvider'
import { Minus, Plus, ShoppingCart, CheckCircle, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function AddToCartButton({ item }) {
  const [qty, setQty] = useState(1)
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const router = useRouter()

  const handleAdd = () => {
    addToCart(item, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    addToCart(item, qty)
    router.push('/shop/cart')
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Quantity Selector */}
      <div className="flex items-center gap-4 mb-2">
        <span className="text-sm font-medium text-slate-600">Quantity</span>
        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-hnu-dark hover:bg-slate-100 shadow-sm transition-all"
          >
            <Minus size={16} />
          </button>
          <span className="w-8 text-center font-bold text-slate-800">{qty}</span>
          <button 
            onClick={() => setQty(qty + 1)}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-hnu-dark hover:bg-slate-100 shadow-sm transition-all"
          >
            <Plus size={16} />
          </button>
        </div>
        <span className="text-xs text-slate-400">{item.stock_quantity} pieces available</span>
      </div>

      <div className="flex items-center gap-3 w-full">
        <button 
          onClick={handleAdd}
          className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold transition-all duration-300 transform active:scale-95 ${
            added 
              ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-200' 
              : 'bg-white text-hnu-dark border-2 border-hnu-dark hover:bg-hnu-dark hover:text-white shadow-sm'
          }`}
        >
          {added ? (
            <>
              <CheckCircle size={20} />
              <span>Added!</span>
            </>
          ) : (
            <>
              <ShoppingCart size={20} />
              <span>Add to Cart</span>
            </>
          )}
        </button>
        
        <button 
          onClick={handleBuyNow}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 bg-hnu-gold text-hnu-dark rounded-xl font-bold shadow-md hover:bg-yellow-400 hover:shadow-lg transition-all duration-300 transform active:scale-95 group"
        >
          <span>Buy Now</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
