'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { getNavItems, ROLE_LABELS, ROLE_COLORS, cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, ListOrdered, CalendarDays, ShoppingCart,
  ClipboardList, CreditCard, Package, MessageSquare, BarChart3,
  BookOpen, LogOut, ChevronLeft, ChevronRight
} from 'lucide-react'
import { useState } from 'react'

const ICONS = { LayoutDashboard, Users, ListOrdered, CalendarDays, ShoppingCart, ClipboardList, CreditCard, Package, MessageSquare, BarChart3 }

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  if (!profile) return null
  const nav = getNavItems(profile.role_id)

  return (
    <aside className={cn('flex flex-col h-screen bg-brand-950 border-r border-brand-900/50 shrink-0 transition-all duration-300', collapsed ? 'w-[68px]' : 'w-56')}>

      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-brand-900/50">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-400/30 text-brand-300 shrink-0">
          <BookOpen size={17} />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display text-[17px] text-white leading-none truncate">BookSmart</p>
            <p className="text-[10px] text-brand-400 mt-0.5 truncate">HNU Finance Office</p>
          </div>
        )}
      </div>

      {/* User pill */}
      {!collapsed && (
        <div className="mx-3 mt-3 p-3 rounded-xl bg-brand-900/50 border border-brand-800/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
              {profile.first_name?.[0]}{profile.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{profile.first_name} {profile.last_name}</p>
              <span className={cn('badge text-[10px] mt-0.5', ROLE_COLORS[profile.role_id])}>{ROLE_LABELS[profile.role_id]}</span>
            </div>
          </div>
        </div>
      )}
      {collapsed && (
        <div className="flex justify-center mt-3">
          <div className="w-9 h-9 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
            {profile.first_name?.[0]}
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {nav.map(item => {
          const Icon = ICONS[item.icon]
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn('nav-link', active ? 'nav-link-active' : 'text-brand-400 hover:text-white hover:bg-brand-800/60')}
            >
              {Icon && <Icon size={17} className="shrink-0" />}
              {!collapsed && <span className="truncate">{item.label}</span>}
              {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-400" />}
            </Link>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-3 pt-2 border-t border-brand-900/50 space-y-1">
        <button onClick={() => setCollapsed(!collapsed)}
          className="nav-link w-full text-brand-400 hover:text-white hover:bg-brand-800/60"
          title={collapsed ? 'Expand' : 'Collapse'}>
          {collapsed ? <ChevronRight size={17} /> : <><ChevronLeft size={17}/><span>Collapse</span></>}
        </button>
        <button onClick={signOut} title={collapsed ? 'Sign out' : undefined}
          className="nav-link w-full text-red-400 hover:text-red-300 hover:bg-red-900/20">
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </aside>
  )
}
