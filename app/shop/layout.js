'use client'
import { AuthProvider, useAuth } from '@/components/providers/AuthProvider'
import { CartProvider, useCart } from '@/components/providers/CartProvider'
import Link from 'next/link'
import { Search, ShoppingCart, User, Bell, ListOrdered, Package, CalendarDays } from 'lucide-react'
import { useRouter, usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/db/client'
import { useRealtime } from '@/lib/useRealtime'
import { formatDateTime, cn } from '@/lib/utils'

function ShopHeader() {
  const { cartCount } = useCart()
  const { profile } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [search, setSearch]         = useState('')
  const [notifs, setNotifs]         = useState([])
  const [notifOpen, setNotifOpen]   = useState(false)
  const [mobileSearch, setMSearch]  = useState(false)
  const supabase = createClient()

  const fetchNotifs = useCallback(async () => {
    if (!profile) return
    const { data } = await supabase.from('notifications').select('*').eq('user_id',profile.id_number).order('created_at',{ascending:false}).limit(12)
    setNotifs(data||[])
  }, [profile])

  useRealtime({ tables:[{table:'notifications',filter:`user_id=eq.${profile?.id_number}`}], onRefresh:fetchNotifs, enabled:!!profile })
  useEffect(() => { if (profile) fetchNotifs() }, [profile])

  async function markAllRead() {
    await supabase.from('notifications').update({status:'Read'}).eq('user_id',profile.id_number).eq('status','Unread')
    setNotifs(prev=>prev.map(n=>({...n,status:'Read'})))
  }

  const unread = notifs.filter(n=>n.status==='Unread').length

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) router.push(`/shop/search?q=${encodeURIComponent(search)}`)
  }

  const navLinks = [
    {href:'/shop',label:'All Products',exact:true},
    {href:'/shop/textbooks',label:'Textbooks'},
    {href:'/shop/uniforms',label:'Uniforms'},
    {href:'/shop/supplies',label:'School Supplies'},
    {href:'/shop/souvenirs',label:'HNU Souvenirs'},
  ]

  const isActive = (href, exact) => exact ? pathname===href : pathname.startsWith(href) && href!=='/shop'

  return (
    <header className="sticky top-0 z-50 bg-hnu-dark text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo */}
          <Link href="/shop" className="flex items-center gap-2 shrink-0">
            <img src="/images/booksmart-logo.png" alt="BookSmart" className="h-9 w-auto bg-white rounded-lg p-1"/>
            <div className="hidden md:block">
              <h1 className="text-lg font-bold font-display leading-none">BookSmart</h1>
              <p className="text-[9px] text-white/60 uppercase tracking-wider">Holy Name University</p>
            </div>
          </Link>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 max-w-lg hidden md:block">
            <div className="relative">
              <input type="text" placeholder="Search books, uniforms, supplies..." className="w-full pl-4 pr-12 py-2 rounded-lg text-slate-800 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-hnu-gold shadow-sm" value={search} onChange={e=>setSearch(e.target.value)}/>
              <button type="submit" className="absolute right-1 top-1 bottom-1 px-3 bg-hnu-gold hover:bg-yellow-400 text-hnu-dark rounded-md transition-colors flex items-center"><Search size={15}/></button>
            </div>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={()=>setMSearch(!mobileSearch)} className="md:hidden p-2 hover:bg-white/10 rounded-lg"><Search size={20}/></button>

            {/* Notifications */}
            <div className="relative">
              <button onClick={()=>setNotifOpen(!notifOpen)} className="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
                <Bell size={20}/>
                {unread > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-red-500 rounded-full text-[9px] font-bold flex items-center justify-center">{unread>9?'9+':unread}</span>}
              </button>
              {notifOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-modal border border-slate-100 z-50 overflow-hidden text-slate-800">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <Link href="/shop/notifications" onClick={()=>setNotifOpen(false)} className="text-sm font-semibold text-slate-700 hover:text-hnu-dark">Notifications</Link>
                    {unread>0 && <button onClick={markAllRead} className="text-xs text-brand-600 font-medium">Mark all read</button>}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
                    {notifs.length===0 ? <p className="text-sm text-slate-400 text-center py-8">No notifications yet</p>
                    : notifs.slice(0,6).map(n=>(
                      <Link href="/shop/notifications" key={n.notification_id} onClick={()=>setNotifOpen(false)} className={cn('block px-4 py-3 hover:bg-slate-50 transition-colors',n.status==='Unread'&&'bg-brand-50/60')}>
                        {n.title&&<p className="text-xs font-bold text-slate-700">{n.title}</p>}
                        <p className="text-sm text-slate-600 truncate">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{formatDateTime(n.created_at)}</p>
                      </Link>
                    ))}
                  </div>
                  <Link href="/shop/notifications" onClick={()=>setNotifOpen(false)} className="block text-center py-2.5 text-xs text-brand-600 hover:text-brand-700 font-medium bg-slate-50 border-t border-slate-100">View All</Link>
                </div>
              )}
            </div>

            {/* Queue quick access */}
            <Link href="/shop/queue" className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Queue">
              <ListOrdered size={20}/>
            </Link>

            {/* Cart */}
            <Link href="/shop/cart" className="relative p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ShoppingCart size={20}/>
              {cartCount > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 bg-hnu-gold text-hnu-dark rounded-full text-[9px] font-bold flex items-center justify-center">{cartCount}</span>}
            </Link>

            <div className="h-6 w-[1px] bg-white/20 mx-1"/>

            {/* Profile */}
            <Link href="/shop/profile" className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded-lg transition-colors">
              <div className="w-7 h-7 rounded-full bg-hnu-gold/30 flex items-center justify-center border border-white/20 font-bold text-xs">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </div>
              <span className="text-sm font-medium hidden sm:block">{profile?.first_name}</span>
            </Link>
          </div>
        </div>

        {/* Mobile search */}
        {mobileSearch && (
          <div className="md:hidden pb-3">
            <form onSubmit={handleSearch} className="relative">
              <input type="text" placeholder="Search products..." className="w-full pl-4 pr-10 py-2.5 rounded-lg text-slate-800 text-sm focus:outline-none" value={search} onChange={e=>setSearch(e.target.value)}/>
              <button type="submit" className="absolute right-1 top-1 bottom-1 px-3 bg-hnu-gold text-hnu-dark rounded-md flex items-center"><Search size={14}/></button>
            </form>
          </div>
        )}
      </div>

      {/* Category nav */}
      <div className="bg-hnu-dark/80 border-t border-white/10 overflow-x-auto no-scrollbar">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-0 h-10 text-xs font-semibold whitespace-nowrap">
            {navLinks.map(l=>(
              <Link key={l.href} href={l.href}
                className={cn('h-full flex items-center px-4 border-b-2 transition-all', isActive(l.href,l.exact)?'border-hnu-gold text-hnu-gold':'border-transparent text-white/70 hover:text-white hover:border-white/30')}>
                {l.label}
              </Link>
            ))}
            <div className="w-px h-5 bg-white/10 mx-2"/>
            <Link href="/shop/queue" className={cn('h-full flex items-center gap-1.5 px-4 border-b-2 transition-all font-bold', pathname==='/shop/queue'?'border-hnu-gold text-hnu-gold':'border-transparent text-white/70 hover:text-white')}>
              <ListOrdered size={13}/> Queue
            </Link>
            <Link href="/shop/orders" className={cn('h-full flex items-center gap-1.5 px-4 border-b-2 transition-all', pathname==='/shop/orders'?'border-hnu-gold text-hnu-gold':'border-transparent text-white/70 hover:text-white')}>
              <Package size={13}/> My Orders
            </Link>
            <Link href="/shop/appointments" className={cn('h-full flex items-center gap-1.5 px-4 border-b-2 transition-all', pathname==='/shop/appointments'?'border-hnu-gold text-hnu-gold':'border-transparent text-white/70 hover:text-white')}>
              <CalendarDays size={13}/> Appointments
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}

export default function ShopLayout({ children }) {
  return (
    <AuthProvider>
      <CartProvider>
        <div className="min-h-screen bg-slate-100 font-body">
          <ShopHeader/>
          <main className="container mx-auto px-4 py-6 pb-20">{children}</main>
          <footer className="bg-hnu-dark text-white/50 text-xs text-center py-5 mt-8">
            © {new Date().getFullYear()} Holy Name University · Finance Office Bookstore · BookSmart System
          </footer>
        </div>
      </CartProvider>
    </AuthProvider>
  )
}
