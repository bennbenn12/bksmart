'use client'
import { cn } from '@/lib/utils'
import { X, AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function Badge({ children, className }) {
  return <span className={cn('badge', className)}>{children}</span>
}

export function StatsCard({ label, value, icon: Icon, sub, color='brand' }) {
  const c = { brand:{bg:'bg-brand-50',ic:'text-brand-600',val:'text-brand-700'}, green:{bg:'bg-green-50',ic:'text-green-600',val:'text-green-700'}, orange:{bg:'bg-orange-50',ic:'text-orange-600',val:'text-orange-700'}, red:{bg:'bg-red-50',ic:'text-red-600',val:'text-red-700'}, purple:{bg:'bg-purple-50',ic:'text-purple-600',val:'text-purple-700'} }[color] || {bg:'bg-brand-50',ic:'text-brand-600',val:'text-brand-700'}
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={cn('font-display text-3xl mt-1 tracking-tight', c.val)}>{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {Icon && <div className={cn('p-2.5 rounded-xl', c.bg)}><Icon size={20} className={c.ic} /></div>}
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, size='md' }) {
  const pathname = usePathname()
  if (!open) return null
  const sizes = { sm:'max-w-sm', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl' }
  const dashboardPaths = ['/dashboard','/accounts','/appointments','/feedback','/inventory','/job-orders','/notifications','/orders','/payments','/queue','/reports']
  const inDashboard = dashboardPaths.some(p => pathname === p || pathname?.startsWith(`${p}/`))
  return (
    <div className={cn('fixed inset-0 z-50 overflow-y-auto', inDashboard && 'md:pl-56')}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="flex min-h-full items-center justify-center p-4">
        <div className={cn('relative bg-white rounded-xl shadow-modal w-full max-h-[85vh] flex flex-col', sizes[size])}>
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
            <h2 className="section-title">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
          </div>
          <div className="px-6 py-5 overflow-y-auto flex-1 min-h-0">{children}</div>
        </div>
      </div>
    </div>
  )
}

export function Alert({ type='info', message }) {
  const m = { info:{Icon:Info,cls:'bg-blue-50 border-blue-200 text-blue-700'}, success:{Icon:CheckCircle2,cls:'bg-green-50 border-green-200 text-green-700'}, warning:{Icon:AlertTriangle,cls:'bg-yellow-50 border-yellow-200 text-yellow-700'}, error:{Icon:AlertCircle,cls:'bg-red-50 border-red-200 text-red-700'} }[type]
  return <div className={cn('flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm', m.cls)}><m.Icon size={14} className="shrink-0" /><span>{message}</span></div>
}

export function EmptyState({ icon:Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      {Icon && <div className="p-4 rounded-2xl bg-slate-100 mb-4"><Icon size={28} className="text-slate-400" /></div>}
      <h3 className="font-display text-lg text-slate-600">{title}</h3>
      {description && <p className="text-sm text-slate-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function LoadingSpinner({ className }) {
  return <div className={cn('flex items-center justify-center py-12', className)}><div className="w-7 h-7 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel='Confirm', danger=false }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-slate-600 mb-6">{message}</p>
      <div className="flex justify-end gap-3">
        <button onClick={onClose} className="btn-secondary">Cancel</button>
        <button onClick={() => { onConfirm(); onClose() }} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
      </div>
    </Modal>
  )
}

export function Pagination({ page, total, pageSize, onPageChange }) {
  const pages = Math.ceil(total / pageSize)
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">Showing {(page-1)*pageSize+1}–{Math.min(page*pageSize,total)} of {total}</p>
      <div className="flex items-center gap-1">
        <button disabled={page===1} onClick={()=>onPageChange(page-1)} className="btn-ghost text-xs disabled:opacity-40">← Prev</button>
        {Array.from({length:Math.min(5,pages)},(_,i)=>i+1).map(p=>(
          <button key={p} onClick={()=>onPageChange(p)} className={cn('w-7 h-7 rounded-lg text-xs font-medium transition-colors', p===page?'bg-brand-600 text-white':'text-slate-600 hover:bg-slate-100')}>{p}</button>
        ))}
        <button disabled={page===pages} onClick={()=>onPageChange(page+1)} className="btn-ghost text-xs disabled:opacity-40">Next →</button>
      </div>
    </div>
  )
}
