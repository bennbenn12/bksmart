import { createClient } from '@/lib/db/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Minus, Plus, ShoppingCart, Heart, Share2 } from 'lucide-react'
import AddToCartButton from './AddToCartButton' // Client component for interactivity
import ProductReviews from './ProductReviews' // New Client Component
import ImageGallery from './ImageGallery'

export default async function ProductPage({ params }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: item } = await supabase.from('bookstore_items').select('*').eq('item_id', id).single()

  if (!item) {
    notFound()
  }

  const images = item.image_url ? item.image_url.split(',').map(s => s.trim()).filter(Boolean) : []

  // Related products (same category)
  const { data: related } = await supabase
    .from('bookstore_items')
    .select('*')
    .eq('category', item.category)
    .neq('item_id', item.item_id)
    .eq('is_active', true)
    .limit(5)

  return (
    <div className="max-w-6xl mx-auto pb-16">
      {/* Breadcrumb / Back */}
      <div className="mb-6 flex items-center gap-2 text-sm text-slate-500">
        <Link href="/shop" className="hover:text-hnu-dark">Shop</Link>
        <span>/</span>
        <span className="text-slate-800 font-medium truncate max-w-[200px]">{item.name}</span>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mb-8 sm:mb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8">
          {/* Image Section */}
          <div className="bg-slate-50 p-4 sm:p-8 flex items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 relative group">
            <ImageGallery images={images} name={item.name} />
            
            <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex flex-col gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity z-10">
              <button className="p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-red-500 transition-colors">
                <Heart size={18} className="sm:w-5 sm:h-5" />
              </button>
              <button className="p-2 bg-white rounded-full shadow-md text-slate-400 hover:text-blue-500 transition-colors hidden sm:block">
                <Share2 size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>

          {/* Details Section */}
          <div className="p-4 sm:p-8 flex flex-col">
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                 <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-bold uppercase tracking-wider">{item.category}</span>
                 {(item.stock_quantity - (item.reserved_quantity || 0)) > 0 ? (
                   <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wider">
                     {(item.stock_quantity - (item.reserved_quantity || 0)) <= 10 ? `Only ${item.stock_quantity - (item.reserved_quantity || 0)} left` : 'In Stock'}
                   </span>
                 ) : item.allow_preorder ? (
                   <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold uppercase tracking-wider">
                     Pre-order
                   </span>
                 ) : (
                   <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold uppercase tracking-wider">Out of Stock</span>
                 )}
              </div>
              <h1 className="text-xl sm:text-3xl md:text-4xl font-display font-bold text-slate-900 mb-1 sm:mb-2 leading-tight">{item.name}</h1>
              <p className="text-slate-500 text-xs sm:text-sm">SKU: {item.sku}</p>
            </div>

            <div className="flex items-baseline gap-1 mb-4 sm:mb-6 pb-4 sm:pb-6 border-b border-slate-100">
              <span className="text-base sm:text-lg text-hnu-gold font-bold">₱</span>
              <span className="text-2xl sm:text-4xl font-bold text-hnu-dark">{item.price}</span>
            </div>

            <div className="prose prose-slate prose-sm mb-6 sm:mb-8 text-slate-600 leading-relaxed">
              <p>{item.description || 'No description available for this item.'}</p>
            </div>

            <div className="mt-auto">
               <AddToCartButton item={item} />
               
               <div className="mt-4 sm:mt-6 flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-slate-500">
                 <div className="flex items-center gap-1">
                   <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-green-100 text-green-600 flex items-center justify-center text-[8px] sm:text-xs">✓</div>
                   <span>Official HNU</span>
                 </div>
                 <div className="flex items-center gap-1">
                   <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[8px] sm:text-xs">🛡️</div>
                   <span>Secure</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <ProductReviews itemId={item.item_id} />

      {/* Related Items */}
      {related && related.length > 0 && (
        <div className="mt-12">
          <h2 className="text-xl font-bold text-hnu-dark mb-6 flex items-center gap-2">
            <span className="w-1 h-6 bg-hnu-gold rounded-full"></span>
            You might also like
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {related.map((rel) => (
              <Link href={`/shop/product/${rel.item_id}`} key={rel.item_id} className="bg-white p-3 rounded-xl shadow-sm hover:shadow-md transition-all border border-slate-100 group">
                 <div className="aspect-square bg-slate-50 rounded-lg mb-3 overflow-hidden">
                    {rel.image_url ? (
                      <img src={rel.image_url.split(',')[0].trim()} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-300 text-2xl">📖</div>
                    )}
                 </div>
                 <h3 className="text-sm font-medium text-slate-700 line-clamp-2 mb-1 group-hover:text-hnu-dark">{rel.name}</h3>
                 <p className="text-hnu-dark font-bold text-sm">₱{rel.price}</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
