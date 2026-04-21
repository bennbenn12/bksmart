'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/providers/AuthProvider'
import { getNavItems, ROLE_LABELS, ROLE_COLORS, cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, ListOrdered, CalendarDays, ShoppingCart,
  ClipboardList, CreditCard, Package, MessageSquare, BarChart3,
  BookOpen, LogOut, ChevronLeft, ChevronRight, UserCog, Loader2, Eye, EyeOff, Printer
} from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/db/client'
import { Modal, Alert } from '@/components/ui'
import { useToast } from '@/components/providers/ToastProvider'

const ICONS = { LayoutDashboard, Users, ListOrdered, CalendarDays, ShoppingCart, ClipboardList, CreditCard, Package, MessageSquare, BarChart3, Printer }

export default function Sidebar() {
  const { profile, signOut, refreshProfile } = useAuth()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)

  if (!profile) return null
  const nav = getNavItems(profile.role_type)

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
            <p className="text-[10px] text-brand-400 mt-0.5 truncate">HNU Bookstore</p>
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
              <span className={cn('badge text-[10px] mt-0.5', ROLE_COLORS[profile.role_type])}>{ROLE_LABELS[profile.role_type]}</span>
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
        <button onClick={() => setShowEditProfile(true)}
          className="nav-link w-full text-brand-400 hover:text-white hover:bg-brand-800/60"
          title={collapsed ? 'Edit Profile' : undefined}>
          <UserCog size={17} className="shrink-0" />
          {!collapsed && <span>Edit Profile</span>}
        </button>
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

      {showEditProfile && <EditProfileModal profile={profile} onClose={() => setShowEditProfile(false)} onSaved={() => { setShowEditProfile(false); refreshProfile() }} />}
    </aside>
  )
}

function EditProfileModal({ profile, onClose, onSaved }) {
  const toast = useToast()
  const supabase = createClient()
  const [form, setForm] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    contact_number: profile.contact_number || '',
    password: '',
    confirm_password: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showPw, setShowPw] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    if (form.password && form.password.length < 6) return setError('Password must be at least 6 characters.')
    if (form.password && form.password !== form.confirm_password) return setError('Passwords do not match.')

    setSaving(true)
    try {
      const { error: updateErr } = await supabase.from('users').update({
        first_name: form.first_name,
        last_name: form.last_name,
        contact_number: form.contact_number || null,
      }).eq('id_number', profile.id_number)
      if (updateErr) throw updateErr

      if (form.password) {
        const { error: pwErr } = await supabase.auth.updateUser({ password: form.password })
        if (pwErr) throw pwErr
      }

      toast('Profile updated successfully.', 'success')
      onSaved()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={true} onClose={onClose} title="Edit Profile" size="sm">
      {error && <Alert type="error" message={error} />}
      <form onSubmit={handleSave} className="space-y-4 mt-2">
        {/* ID Number - read only */}
        <div className="flex items-center gap-3 p-3 bg-brand-50 border border-brand-100 rounded-xl">
          <span className="text-xs text-brand-500 font-bold uppercase">{profile.role_type === 'parent' && profile.id_type ? profile.id_type : 'ID Number'}</span>
          <span className="font-mono font-black text-brand-700">{profile.id_number || '—'}</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">First Name</label>
            <input className="input" value={form.first_name} onChange={e => set('first_name', e.target.value)} required />
          </div>
          <div>
            <label className="label">Last Name</label>
            <input className="input" value={form.last_name} onChange={e => set('last_name', e.target.value)} required />
          </div>
        </div>
        <div>
          <label className="label">Contact Number</label>
          <input className="input" value={form.contact_number} onChange={e => set('contact_number', e.target.value)} placeholder="0912 345 6789" />
        </div>
        <div className="pt-4 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-700 mb-3">Change Password (Optional)</h4>
          <div className="space-y-3">
            <div>
              <label className="label">New Password</label>
              <div className="relative">
                <input type={showPw ? 'text' : 'password'} minLength={6} className="input pr-10" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Leave blank to keep current" />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            {form.password && (
              <div>
                <label className="label">Confirm New Password</label>
                <input type="password" minLength={6} className="input" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} placeholder="Retype new password" required={!!form.password} />
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
