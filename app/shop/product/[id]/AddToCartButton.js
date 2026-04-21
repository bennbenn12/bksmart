'use client'
import { useState } from 'react'
import { useCart } from '@/components/providers/CartProvider'
import { Minus, Plus, ShoppingCart, CheckCircle, ArrowRight, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { needsSize } from '@/lib/utils'

export default function AddToCartButton({ item }) {
  const [qty, setQty] = useState(1)
  const [selectedSize, setSelectedSize] = useState('')
  const { addToCart } = useCart()
  const [added, setAdded] = useState(false)
  const router = useRouter()

  const hasSizes = needsSize(item)
  const availableSizes = hasSizes ? item.sizes.split(',').map(s => s.trim()).filter(Boolean) : []

  const product = hasSizes ? { ...item, selectedSize } : item

  const availableStock = item.stock_quantity - (item.reserved_quantity || 0)
  const isOutOfStock = availableStock <= 0
  const canPreorder = isOutOfStock && item.allow_preorder
  const isUnavailable = isOutOfStock && !item.allow_preorder

  const handleAdd = () => {
    console.log('[AddToCart] Clicked:', { item: item.name, isUnavailable, canPreorder, hasSizes, selectedSize, availableStock })
    if (isUnavailable) {
      console.log('[AddToCart] Blocked: item unavailable')
      return
    }
    if (hasSizes && !selectedSize) {
      console.log('[AddToCart] Blocked: size required but not selected')
      return
    }
    addToCart({ ...product, isPreorder: canPreorder }, qty)
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
  }

  const handleBuyNow = () => {
    console.log('[BuyNow] Clicked:', { item: item.name, isUnavailable, canPreorder, hasSizes, selectedSize, availableStock })
    if (isUnavailable) {
      console.log('[BuyNow] Blocked: item unavailable')
      return
    }
    if (hasSizes && !selectedSize) {
      console.log('[BuyNow] Blocked: size required but not selected')
      return
    }
    addToCart({ ...product, isPreorder: canPreorder }, qty)
    router.push('/shop/cart')
  }

  // Button label based on stock status
  const buyNowLabel = canPreorder ? 'Pre-order Now' : 'Buy Now'
  const addToCartLabel = canPreorder ? 'Pre-order' : 'Add to Cart'

  return (
    <div className="flex flex-col gap-4">
      {/* Size Selector */}
      {hasSizes && (
        <div className="mb-2">
          <span className="text-sm font-medium text-slate-600 mb-2 block">Size</span>
          <div className="flex flex-wrap gap-2">
            {availableSizes.map(size => (
              <button key={size} type="button" onClick={() => setSelectedSize(size)}
                className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all ${
                  selectedSize === size
                    ? 'border-hnu-dark bg-hnu-dark text-white shadow-md'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
                }`}>
                {size}
              </button>
            ))}
          </div>
          {!selectedSize && <p className="text-xs text-orange-500 mt-1.5 font-medium">Please select a size</p>}
        </div>
      )}

      {/* Quantity Selector */}
      <div className="flex items-center gap-3 sm:gap-4 mb-2">
        <span className="text-sm font-medium text-slate-600">Quantity</span>
        <div className="flex items-center gap-1 sm:gap-2 bg-slate-50 p-1.5 sm:p-1 rounded-xl border border-slate-200">
          <button 
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-hnu-dark hover:bg-slate-100 shadow-sm transition-all active:scale-95"
          >
            <Minus size={18} />
          </button>
          <span className="w-10 sm:w-8 text-center font-bold text-slate-800 text-base sm:text-sm">{qty}</span>
          <button 
            onClick={() => setQty(Math.min(qty + 1, isOutOfStock ? 99 : availableStock))}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-white text-slate-500 hover:text-hnu-dark hover:bg-slate-100 shadow-sm transition-all active:scale-95"
          >
            <Plus size={18} />
          </button>
        </div>
        <span className={`text-xs sm:text-xs ${canPreorder ? 'text-amber-600 font-medium' : isUnavailable ? 'text-red-500' : 'text-slate-400'}`}>
          {canPreorder 
            ? (item.preorder_eta_days ? `Pre-order: ships in ${item.preorder_eta_days} days` : 'Pre-order available')
            : isUnavailable 
              ? 'Currently unavailable' 
              : `${availableStock} available`
          }
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
        <button 
          onClick={handleAdd}
          disabled={isUnavailable}
          className={`flex-1 flex items-center justify-center gap-2 py-4 sm:py-3.5 px-6 rounded-xl font-bold transition-all duration-300 transform active:scale-95 min-h-[52px] ${
            isUnavailable
              ? 'bg-slate-100 text-slate-400 border-2 border-slate-200 cursor-not-allowed'
              : added 
              ? 'bg-green-600 text-white shadow-lg ring-2 ring-green-200' 
              : canPreorder
              ? 'bg-amber-50 text-amber-700 border-2 border-amber-500 hover:bg-amber-500 hover:text-white shadow-sm'
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
              {canPreorder ? <Clock size={20} /> : <ShoppingCart size={20} />}
              <span>{addToCartLabel}</span>
            </>
          )}
        </button>
        
        <button 
          onClick={handleBuyNow}
          disabled={isUnavailable}
          className={`flex-1 flex items-center justify-center gap-2 py-4 sm:py-3.5 px-6 rounded-xl font-bold shadow-md transition-all duration-300 transform active:scale-95 group min-h-[52px] ${
            isUnavailable 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none' 
              : canPreorder
              ? 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-lg'
              : 'bg-hnu-gold text-hnu-dark hover:bg-yellow-400 hover:shadow-lg'
          }`}
        >
          <span>{buyNowLabel}</span>
          <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  )
}
