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
  risographer:       'Risographer',
}

// Alias export - same as ROLE_LABELS
export const ROLE_TYPES = ROLE_LABELS

export const ROLE_COLORS = {
  bookstore_manager: 'bg-brand-100 text-brand-800',
  bookstore_staff:   'bg-blue-100 text-blue-800',
  working_student:   'bg-cyan-100 text-cyan-800',
  teacher:           'bg-purple-100 text-purple-800',
  student:           'bg-green-100 text-green-800',
  parent:            'bg-orange-100 text-orange-800',
  risographer:       'bg-pink-100 text-pink-800',
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

// ── Appointment statuses
export const APPT_STATUS_COLORS = {
  Pending:     'bg-yellow-100 text-yellow-800',
  Confirmed:   'bg-blue-100 text-blue-800',
  Completed:   'bg-green-100 text-green-800',
  Rescheduled: 'bg-orange-100 text-orange-800',
  Cancelled:   'bg-red-100 text-red-800',
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
export function getNavItems(roleType) {
  const items = [
    { href:'/dashboard',    label:'Dashboard',    icon:'LayoutDashboard',
      roles:['bookstore_manager','bookstore_staff','working_student','teacher','student','parent','risographer'] },
    { href:'/accounts',     label:'Accounts',     icon:'Users',
      roles:['bookstore_manager'] },
    { href:'/queue',        label:'Queue',         icon:'ListOrdered',
      roles:['bookstore_manager','bookstore_staff','working_student','student','parent'] },
    { href:'/appointments', label:'Appointments', icon:'CalendarDays',
      roles:['bookstore_manager','bookstore_staff','student','parent'] },
    { href:'/orders',       label:'Orders',       icon:'ShoppingCart',
      roles:['bookstore_manager','bookstore_staff','working_student','student','parent'] },
    { href:'/job-orders',   label:'Job Orders',   icon:'ClipboardList',
      roles:['bookstore_manager','bookstore_staff','teacher','risographer'] },
    { href:'/riso-queue',   label:'RISO Queue',   icon:'Printer',
      roles:['bookstore_manager','bookstore_staff','risographer'] },
    { href:'/payments',     label:'Payments',     icon:'CreditCard',
      roles:['bookstore_manager','bookstore_staff'] },
    { href:'/inventory',    label:'Inventory',    icon:'Package',
      roles:['bookstore_manager','bookstore_staff','working_student','risographer'] },
    { href:'/feedback',     label:'Feedback',     icon:'MessageSquare',
      roles:['bookstore_manager','bookstore_staff','student','parent','teacher'] },
    { href:'/reports',      label:'Reports',      icon:'BarChart3',
      roles:['bookstore_manager'] },
  ]
  return items.filter(i => i.roles.includes(roleType))
}

// ── Auto-number generators (replaces DB triggers) ───────────────
function randomHex(len = 6) {
  return [...Array(len)].map(() => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase()
}
const datePart = () => new Date().toISOString().slice(0,10).replace(/-/g,'')
export const generateOrderNumber = () => `ORD-${datePart()}-${randomHex(6)}`
export const generateApptNumber  = () => `APT-${datePart()}-${randomHex(6)}`
export const generateJobNumber   = () => `JO-${datePart()}-${randomHex(6)}`

// ── Shop / Category labels ──────────────────────────────────────
export const SHOPS      = ['Bookstore','Souvenir_Shop','Riso']
export const CATEGORIES = ['Textbook','Uniform','Supply','Souvenir','Riso']
export const CLOTHING_SIZES = ['XS','S','M','L','XL','2XL','3XL']
export const needsSize = (item) => item?.category === 'Uniform' && item?.sizes
export const shopLabel  = s => s?.replace(/_/g,' ')
export const fmtStatus  = s => s?.replace(/_/g,' ')

// ── Validation Utilities ───────────────────────────────────────
export const Validators = {
  // Email validation
  email: (email) => {
    if (!email) return 'Email is required'
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) return 'Invalid email format'
    return null
  },

  // Password validation (min 8 chars, 1 uppercase, 1 lowercase, 1 number)
  password: (password) => {
    if (!password) return 'Password is required'
    if (password.length < 8) return 'Password must be at least 8 characters'
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter'
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number'
    return null
  },

  // ID Number validation
  idNumber: (idNumber) => {
    if (!idNumber) return 'ID number is required'
    if (idNumber.length < 3) return 'ID number must be at least 3 characters'
    if (!/^[a-zA-Z0-9\-_]+$/.test(idNumber)) return 'ID number can only contain letters, numbers, hyphens and underscores'
    return null
  },

  // Name validation
  name: (name, field = 'Name') => {
    if (!name || !name.trim()) return `${field} is required`
    if (name.trim().length < 2) return `${field} must be at least 2 characters`
    if (!/^[a-zA-Z\s\-'.]+$/.test(name)) return `${field} can only contain letters, spaces, hyphens, apostrophes and periods`
    return null
  },

  // Phone validation
  phone: (phone) => {
    if (!phone) return null // Phone is optional
    if (!/^\+?[\d\s\-\(\)]{7,20}$/.test(phone)) return 'Invalid phone number format'
    return null
  },

  // Date validation (YYYY-MM-DD)
  date: (date, allowFuture = false) => {
    if (!date) return 'Date is required'
    if (!/^(\d{4})-(\d{2})-(\d{2})$/.test(date)) return 'Invalid date format. Use YYYY-MM-DD'
    
    const d = new Date(date)
    if (isNaN(d.getTime())) return 'Invalid date'
    
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    if (!allowFuture && d > today) return 'Date cannot be in the future'
    if (allowFuture && d < today) return 'Date must be in the future'
    
    return null
  },

  // Time validation (HH:MM)
  time: (time) => {
    if (!time) return 'Time is required'
    if (!/^(\d{2}):(\d{2})$/.test(time)) return 'Invalid time format. Use HH:MM'
    const [hours, minutes] = time.split(':').map(Number)
    if (hours < 0 || hours > 23) return 'Hours must be between 0 and 23'
    if (minutes < 0 || minutes > 59) return 'Minutes must be between 0 and 59'
    return null
  },

  // Quantity validation
  quantity: (qty, maxQty = null) => {
    const num = parseInt(qty)
    if (isNaN(num) || num < 1) return 'Quantity must be at least 1'
    if (maxQty !== null && num > maxQty) return `Quantity cannot exceed ${maxQty}`
    return null
  },

  // Price validation
  price: (price) => {
    const num = parseFloat(price)
    if (isNaN(num) || num < 0) return 'Price must be a positive number'
    return null
  },

  // SKU validation
  sku: (sku) => {
    if (!sku) return 'SKU is required'
    if (sku.length < 3) return 'SKU must be at least 3 characters'
    if (!/^[a-zA-Z0-9\-_]+$/.test(sku)) return 'SKU can only contain letters, numbers, hyphens and underscores'
    return null
  },

  // Text length validation
  minLength: (text, min, field = 'Field') => {
    if (!text || text.trim().length < min) return `${field} must be at least ${min} characters`
    return null
  },

  // Required field validation
  required: (value, field = 'Field') => {
    if (value === undefined || value === null || value === '') return `${field} is required`
    return null
  }
}

// Helper to run multiple validators and return all errors
export function validateFields(validations) {
  const errors = {}
  for (const [field, validator] of Object.entries(validations)) {
    const error = validator()
    if (error) errors[field] = error
  }
  return Object.keys(errors).length > 0 ? errors : null
}
