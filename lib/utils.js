import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...i) => twMerge(clsx(i))

export const formatCurrency = v => new Intl.NumberFormat('en-PH', { style:'currency', currency:'PHP', minimumFractionDigits:2 }).format(v)
export const formatDate = (d,o={}) => d ? new Intl.DateTimeFormat('en-PH', { year:'numeric',month:'short',day:'numeric',...o }).format(new Date(d)) : '—'
export const formatDateTime = d => d ? new Intl.DateTimeFormat('en-PH', { year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit' }).format(new Date(d)) : '—'
export const formatTime = t => t ? t.slice(0,5) : '—'

// ── Roles (from 3.2.3 Program Hierarchy) ───────────────────────
export const ROLE_LABELS = {
  bookstore_manager: 'Bookstore Manager',
  bookstore_staff:   'Bookstore Staff',
  working_student:   'Working Student',
  teacher:           'Teacher',
  student:           'Student',
  parent:            'Parent',
}

export const ROLE_COLORS = {
  bookstore_manager: 'bg-brand-100 text-brand-800',
  bookstore_staff:   'bg-blue-100 text-blue-800',
  working_student:   'bg-cyan-100 text-cyan-800',
  teacher:           'bg-purple-100 text-purple-800',
  student:           'bg-green-100 text-green-800',
  parent:            'bg-orange-100 text-orange-800',
}

// ── Order statuses (Table 3: ENUM Pending,Ready,Released,Cancelled)
export const ORDER_STATUS_COLORS = {
  Pending:   'bg-yellow-100 text-yellow-800',
  Ready:     'bg-purple-100 text-purple-800',
  Released:  'bg-green-100 text-green-800',
  Cancelled: 'bg-red-100 text-red-800',
}

// ── Job Order statuses
export const JO_STATUS_COLORS = {
  Draft:         'bg-slate-100 text-slate-600',
  Pending_Audit: 'bg-yellow-100 text-yellow-800',
  Approved:      'bg-blue-100 text-blue-800',
  Processing:    'bg-purple-100 text-purple-800',
  Completed:     'bg-green-100 text-green-800',
  Rejected:      'bg-red-100 text-red-800',
}

// ── Appointment statuses (Table 6: Confirmed,Completed,Rescheduled)
export const APPT_STATUS_COLORS = {
  Confirmed:   'bg-blue-100 text-blue-800',
  Completed:   'bg-green-100 text-green-800',
  Rescheduled: 'bg-orange-100 text-orange-800',
}

// ── Queue statuses (Table 7: Waiting,Processing,Completed)
export const QUEUE_STATUS_COLORS = {
  Waiting:    'bg-yellow-100 text-yellow-800',
  Processing: 'bg-blue-100 text-blue-800',
  Completed:  'bg-green-100 text-green-800',
}

// ── Payment source (Table 4: Bookstore,Teller)
export const PAYMENT_SOURCE_COLORS = {
  Bookstore: 'bg-green-100 text-green-800',
  Teller:    'bg-purple-100 text-purple-800',
}

// ── Navigation by role (from 3.2.3 Program Hierarchy) ──────────
export function getNavItems(role) {
  const items = [
    { href:'/dashboard',    label:'Dashboard',    icon:'LayoutDashboard',
      roles:['bookstore_manager','bookstore_staff','working_student','teacher','student','parent'] },
    { href:'/accounts',     label:'Accounts',     icon:'Users',
      roles:['bookstore_manager'] },
    { href:'/queue',        label:'Queue',         icon:'ListOrdered',
      roles:['bookstore_manager','bookstore_staff','working_student','student','parent'] },
    { href:'/appointments', label:'Appointments', icon:'CalendarDays',
      roles:['bookstore_manager','bookstore_staff','student','parent'] },
    { href:'/orders',       label:'Orders',       icon:'ShoppingCart',
      roles:['bookstore_manager','bookstore_staff','working_student','student','parent'] },
    { href:'/job-orders',   label:'Job Orders',   icon:'ClipboardList',
      roles:['bookstore_manager','bookstore_staff','teacher'] },
    { href:'/payments',     label:'Payments',     icon:'CreditCard',
      roles:['bookstore_manager','bookstore_staff'] },
    { href:'/inventory',    label:'Inventory',    icon:'Package',
      roles:['bookstore_manager','bookstore_staff','working_student'] },
    { href:'/feedback',     label:'Feedback',     icon:'MessageSquare',
      roles:['bookstore_manager','bookstore_staff','student','parent','teacher'] },
    { href:'/reports',      label:'Reports',      icon:'BarChart3',
      roles:['bookstore_manager'] },
  ]
  return items.filter(i => i.roles.includes(role))
}

// ── Shop / Category labels ──────────────────────────────────────
export const SHOPS      = ['Bookstore','Souvenir_Shop','Riso']
export const CATEGORIES = ['Textbook','Uniform','Supply','Souvenir','Riso']
export const shopLabel  = s => s?.replace(/_/g,' ')
export const fmtStatus  = s => s?.replace(/_/g,' ')
