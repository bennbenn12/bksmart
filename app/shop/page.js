import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

// Revalidate this page every 60 seconds — products don't change every second
export const revalidate = 60

export default async function ShopPage() {
  const supabase = await createClient()

  // Parallel: featured items (limit 20) + counts per category — single round trip each
  const [{ data: items }, { data: featured }] = await Promise.all([
    supabase
      .from('bookstore_items')
      // Only select columns the UI actually uses — avoids transferring description, image_url bloat
      .select('item_id, name, price, stock_quantity, category, shop, image_url')
      .eq('is_active', true)
      .gt('stock_quantity', 0)   // only show in-stock on homepage
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('bookstore_items')
      .select('item_id, name, price, stock_quantity, category, image_url')
      .eq('is_active', true)
      .order('stock_quantity', { ascending: false })
      .limit(5),
  ])

  const categories = [
    { name: 'Textbooks',     slug: 'textbooks',  icon: '📚', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { name: 'Uniforms',      slug: 'uniforms',   icon: '👕', color: 'bg-green-50 text-green-600 border-green-100' },
    { name: 'Supplies',      slug: 'supplies',   icon: '✏️', color: 'bg-yellow-50 text-yellow-600 border-yellow-100' },
    { name: 'Souvenirs',     slug: 'souvenirs',  icon: '🎁', color: 'bg-red-50 text-red-600 border-red-100' },
    { name: 'Riso Services', slug: 'riso',       icon: '🖨️', color: 'bg-purple-50 text-purple-600 border-purple-100' },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-lg h-56 md:h-72 bg-gradient-to-r from-hnu-dark to-brand-800">
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-center px-4">
          <h1 className="text-3xl md:text-5xl font-display text-white drop-shadow-lg font-bold mb-2">
            Welcome to <span className="text-hnu-gold">BookSmart</span>
          </h1>
          <p className="text-white/80 text-base md:text-lg font-light max-w-xl">
            Pre-order textbooks, uniforms & supplies online.
          </p>
          <Link href="/shop/queue" className="mt-4 inline-flex items-center gap-2 bg-hnu-gold text-hnu-dark font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-yellow-400 transition-colors shadow-lg">
            Join Queue →
          </Link>
        </div>
        {/* Use CSS gradient instead of loading a heavy background image */}
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-hnu-gold/10 rounded-full blur-2xl" />
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {categories.map(cat => (
          <Link
            href={`/shop/${cat.slug}`}
            key={cat.name}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border hover:shadow-md hover:-translate-y-0.5 transition-all bg-white ${cat.color.split(' ').slice(2).join(' ')} group cursor-pointer h-24`}
          >
            <span className="text-2xl mb-1.5">{cat.icon}</span>
            <span className={`text-xs font-semibold ${cat.color.split(' ').slice(0, 2).join(' ')} group-hover:opacity-80 text-center leading-tight`}>
              {cat.name}
            </span>
          </Link>
        ))}
      </div>

      {/* Product grid */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-hnu-dark border-l-4 border-hnu-gold pl-3 uppercase tracking-wide">
            New Arrivals
          </h2>
          <Link href="/shop/search?q=" className="text-sm text-hnu-mid hover:text-hnu-dark font-medium">
            See all →
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items?.map(item => (
            <Link
              href={`/shop/product/${item.item_id}`}
              key={item.item_id}
              className="group flex flex-col rounded-xl border border-slate-100 hover:border-brand-200 hover:shadow-card-hover transition-all overflow-hidden bg-white hover:-translate-y-0.5 duration-200"
            >
              {/* Image */}
              <div className="aspect-square bg-slate-50 relative overflow-hidden">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl">
                    {categories.find(c => c.name.toLowerCase().startsWith(item.category?.toLowerCase()))?.icon || '📦'}
                  </div>
                )}
                {item.stock_quantity === 0 && (
                  <div className="absolute inset-0 bg-white/75 flex items-center justify-center">
                    <span className="text-[10px] font-bold bg-slate-700 text-white px-2 py-0.5 rounded-full">Out of Stock</span>
                  </div>
                )}
              </div>
              {/* Info */}
              <div className="p-2.5 flex flex-col flex-1">
                <p className="text-xs font-medium text-slate-700 line-clamp-2 leading-snug min-h-[2.2rem] group-hover:text-hnu-dark">
                  {item.name}
                </p>
                <div className="mt-auto pt-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-hnu-dark">₱{Number(item.price).toFixed(2)}</span>
                  {item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                    <span className="text-[9px] font-bold text-orange-500">{item.stock_quantity} left</span>
                  )}
                </div>
              </div>
            </Link>
          ))}

          {(!items || items.length === 0) && (
            <div className="col-span-full py-12 flex flex-col items-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <span className="text-3xl mb-2">🔍</span>
              <p className="text-sm">No products available at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}