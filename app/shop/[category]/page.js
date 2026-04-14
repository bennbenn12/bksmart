import { createClient } from '@/lib/db/server'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'

export default async function CategoryPage({ params }) {
  const { category } = await params
  
  // RISO has its own dedicated page - redirect there
  if (category.toLowerCase() === 'riso') {
    redirect('/shop/riso')
  }

  // Normalize category for DB query (e.g. "textbooks" -> "Textbook")
  const catMap = {
    'textbooks': 'Textbook',
    'uniforms': 'Uniform',
    'supplies': 'Supply',
    'souvenirs': 'Souvenir'
  }
  
  const dbCategory = catMap[category.toLowerCase()]

  if (!dbCategory) {
    notFound()
  }

  const supabase = await createClient()

  const { data: items } = await supabase
    .from('bookstore_items')
    .select('*')
    .eq('category', dbCategory)
    .eq('is_active', true)
    .limit(100)

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-display font-bold text-hnu-dark capitalize mb-2">{category}</h1>
        <p className="text-slate-500">Browse our collection of {category}.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {items?.map((item) => (
          <Link href={`/shop/product/${item.item_id}`} key={item.item_id} className="bg-white rounded-lg shadow-card hover:shadow-card-hover transition-all group overflow-hidden border border-slate-100 flex flex-col h-full hover:-translate-y-1 duration-300">
            <div className="aspect-square bg-slate-50 relative overflow-hidden border-b border-slate-100">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <span className="text-4xl mb-2">📖</span>
                    <span className="text-xs">No Image</span>
                  </div>
                )}
                {(item.stock_quantity - (item.reserved_quantity || 0)) <= 0 && (
                  <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-10">
                    <span className="bg-slate-800 text-white text-xs px-3 py-1.5 rounded-full font-medium shadow-lg">Out of Stock</span>
                  </div>
                )}
            </div>
            
            <div className="p-3 flex flex-col flex-1">
                <h3 className="text-sm font-medium text-slate-700 line-clamp-2 mb-2 group-hover:text-hnu-dark transition-colors leading-relaxed min-h-[2.5rem]">{item.name}</h3>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-0.5 mb-2">
                    <span className="text-xs text-hnu-gold font-medium">₱</span>
                    <span className="text-lg font-bold text-hnu-dark">{item.price}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>{(() => { const avail = item.stock_quantity - (item.reserved_quantity || 0); return avail > 0 ? `${avail} available` : 'Sold out' })()}</span>
                      <span className="text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-100">HNU Official</span>
                  </div>
                </div>
            </div>
          </Link>
        ))}
        {(!items || items.length === 0) && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-2xl">🔍</div>
            <p>No products found in this category.</p>
          </div>
        )}
      </div>
    </div>
  )
}
