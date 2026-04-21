'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Pagination, Badge } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { ROLE_LABELS, ROLE_COLORS, formatDate, cn } from '@/lib/utils'
import { Users, UserPlus, Search, Edit2, ToggleLeft, ToggleRight, Loader2, RefreshCw, Eye, EyeOff, Copy, Check, Mail, XCircle, Clock, Send } from 'lucide-react'

import { useAuth } from '@/components/providers/AuthProvider'

const ALL_ROLES = ['bookstore_manager','bookstore_staff','working_student','teacher','student','parent']

export default function AccountsPage() {
  const toast = useToast()
  const router = useRouter()
  const { profile: currentUser } = useAuth()
  const [profiles, setProfiles]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRole]     = useState('')
  const [statusFilter, setStatus] = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [showCreate, setCreate]   = useState(false)
  const [editUser, setEdit]       = useState(null)
  const [resending, setResending] = useState(null)
  const PAGE = 15
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('users').select('*', {count:'exact'})
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,id_number.ilike.%${search}%`)
    if (roleFilter) q = q.eq('role_type', roleFilter)
    if (statusFilter) q = q.eq('status', statusFilter)
    q = q.order('created_at',{ascending:false}).range((page-1)*PAGE, page*PAGE-1)
    const { data, count } = await q
    setProfiles(data||[]); setTotal(count||0); setLoading(false)
  }, [search, roleFilter, statusFilter, page])

  useRealtime({ tables:['users'], onRefresh:fetchUsers })
  useEffect(() => { fetchUsers() }, [search, roleFilter, statusFilter, page])

  async function resendWelcome(user) {
    setResending(user.id_number)
    try {
      const res = await fetch('/api/resend-welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_number: user.id_number, resetPassword: true })
      })
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Failed to resend welcome email')
      
      toast(`Welcome email resent to ${user.email}`, 'success')
      await fetchUsers() // Immediate client-side refresh
      router.refresh() // Server-side refresh
      
      // If email failed but we got a password, show it to manager
      if (data.temporaryPassword) {
        toast(`Temp password: ${data.temporaryPassword} (copy this!)`, 'warning', 10000)
      }
    } catch(e) {
      toast(e.message, 'error')
    } finally {
      setResending(null)
    }
  }

  async function toggleStatus(user) {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'

    // Prevent deactivating the last active bookstore manager
    if (newStatus === 'Inactive' && user.role_type === 'bookstore_manager') {
      const { data: activeManagers } = await supabase
        .from('users')
        .select('id_number', { count: 'exact' })
        .eq('role_type', 'bookstore_manager')
        .eq('status', 'Active')
      const activeCount = activeManagers?.length || 0
      if (activeCount <= 1) {
        toast('Cannot deactivate the only active Bookstore Manager. At least one must remain active.', 'error')
        return
      }
    }

    // Prevent bookstore manager from deactivating themselves
    if (user.id_number === currentUser?.id_number && newStatus === 'Inactive') {
      toast('You cannot deactivate your own account.', 'error')
      return
    }

    await supabase.from('users').update({ status:newStatus }).eq('id_number', user.id_number)
    toast(`${user.first_name} ${user.last_name} set to ${newStatus}.`, newStatus==='Active'?'success':'warning')
    await fetchUsers() // Immediate client-side refresh
    router.refresh() // Server-side refresh
  }

  return (
    <div className="page-enter">
      <Header title="Manage Accounts"/>
      <div className="p-6 space-y-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="input pl-9" placeholder="Search name, email, ID..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/>
          </div>
          <select className="input w-36" value={roleFilter} onChange={e=>{setRole(e.target.value);setPage(1)}}>
            <option value="">All Roles</option>
            {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          <select className="input w-32" value={statusFilter} onChange={e=>{setStatus(e.target.value);setPage(1)}}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
          <button onClick={fetchUsers} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
          <button onClick={()=>setCreate(true)} className="btn-primary ml-auto"><UserPlus size={14}/> Add User</button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><th className="th">Name</th><th className="th">ID Number</th><th className="th">Role</th><th className="th">Email</th><th className="th">Status</th><th className="th">Joined</th><th className="th text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={7} className="py-12"><LoadingSpinner/></td></tr>
                : profiles.length===0 ? <tr><td colSpan={7}><EmptyState icon={Users} title="No users found"/></td></tr>
                : profiles.map(u=>(
                  <tr key={u.id_number} className="hover:bg-slate-50 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 text-xs shrink-0">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div className="font-medium text-slate-800">{u.first_name} {u.last_name}</div>
                        {u.first_login_expires_at && !u.last_login_at && (
                          <span title="Account expires soon if not activated" className="text-amber-500">
                            <Clock size={14} />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="td">
                      <span className="font-bold text-brand-700 font-mono text-xs">{u.id_number || '—'}</span>
                      {u.role_type === 'parent' && u.id_type && <span className="block text-[10px] text-slate-400 uppercase">{u.id_type}</span>}
                    </td>
                    <td className="td"><span className={cn('badge', ROLE_COLORS[u.role_type]||'bg-slate-100')}>{ROLE_LABELS[u.role_type]||u.role_type}</span></td>
                    <td className="td text-slate-500 text-xs">{u.email}</td>
                    <td className="td">
                      <div className="flex flex-col gap-1">
                        <span className={cn('badge', u.status==='Active'?'bg-green-100 text-green-700':'bg-red-100 text-red-700')}>{u.status}</span>
                        {u.first_login_expires_at && !u.last_login_at && (
                          <span className="text-[10px] text-amber-600 font-medium">
                            Expires: {new Date(u.first_login_expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="td text-xs text-slate-400">{formatDate(u.created_at)}</td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Resend welcome button for pending users */}
                        {u.first_login_expires_at && !u.last_login_at && (
                          <button 
                            onClick={()=>resendWelcome(u)} 
                            className="btn-ghost p-1.5 text-blue-600 hover:text-blue-700"
                            title="Resend welcome email with new password"
                            disabled={resending === u.id_number}
                          >
                            {resending === u.id_number ? <Loader2 size={14} className="animate-spin"/> : <Send size={14}/>}
                          </button>
                        )}
                        <button onClick={()=>setEdit(u)} className="btn-ghost p-1.5"><Edit2 size={12}/></button>
                        <button onClick={()=>toggleStatus(u)} className={cn('btn-ghost p-1.5', u.status==='Active'?'text-green-600 hover:text-red-500':'text-red-400 hover:text-green-600')}>
                          {u.status==='Active'?<ToggleRight size={16}/>:<ToggleLeft size={16}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={PAGE} onPageChange={setPage}/>
        </div>
      </div>

      {(showCreate||editUser) && <UserModal user={editUser} onClose={()=>{setCreate(false);setEdit(null)}} onSaved={()=>{setCreate(false);setEdit(null);fetchUsers();router.refresh();toast('User saved!','success')}}/>}
    </div>
  )
}

function UserModal({ user, onClose, onSaved }) {
  const toast = useToast()
  const EMPTY = { first_name:'',last_name:'',email:'',username:'',role_type:'student',id_number:'',id_type:'',department:'',contact_number:'',status:'Active' }
  const [form, setForm] = useState(user||EMPTY)
  const [saving, setSaving] = useState(false)
  const [createdUser, setCreatedUser] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [copied, setCopied] = useState(false)
  const supabase = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function submit(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (user) {
        await supabase.from('users').update({ first_name:form.first_name, last_name:form.last_name, role_type:form.role_type, id_number:form.id_number||null, id_type:form.id_type||null, department:form.department||null, contact_number:form.contact_number||null, status:form.status }).eq('id_number', user.id_number)
        onSaved()
      } else {
        // Create new user via API
        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            first_name: form.first_name,
            last_name: form.last_name,
            email: form.email,
            role_type: form.role_type,
            id_number: form.id_number || null,
            id_type: form.id_type || null,
            department: form.department || null,
            contact_number: form.contact_number || null,
            status: form.status
          })
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create user')
        setCreatedUser(data)
        toast('User created successfully!','success')
      }
    } catch(e) { toast(e.message,'error') } finally { setSaving(false) }
  }

  function copyPassword() {
    if (createdUser?.temporaryPassword) {
      navigator.clipboard.writeText(createdUser.temporaryPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  if (createdUser) {
    const emailDelivered = createdUser.emailSent
    const emailFailed = createdUser.emailError && !emailDelivered
    
    return (
      <Modal open={true} onClose={() => { setCreatedUser(null); onSaved(); }} title="User Created Successfully" size="md">
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
              <Check size={18} /> Account Created
            </div>
            <p className="text-sm text-slate-600">
              <strong>{createdUser.user.first_name} {createdUser.user.last_name}</strong> has been added with role <strong>{ROLE_LABELS[createdUser.user.role_type]}</strong>.
            </p>
          </div>

          {/* Email Status */}
          {emailDelivered ? (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-green-700 font-semibold mb-2">
                <Check size={18} /> Email Sent Successfully
              </div>
              <p className="text-sm text-slate-600">
                Welcome email with login credentials has been sent to <strong>{createdUser.user.email}</strong>. The user can sign in immediately.
              </p>
            </div>
          ) : emailFailed ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-red-700 font-semibold mb-2">
                <XCircle size={18} /> Email Failed to Send
              </div>
              <p className="text-sm text-slate-600 mb-2">
                Could not send welcome email. Please manually share the credentials below with the user.
              </p>
              {createdUser.emailError && (
                <p className="text-xs text-red-600">Error: {createdUser.emailError}</p>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-blue-700 font-semibold mb-2">
                <Mail size={18} /> Email Configuration
              </div>
              <p className="text-sm text-slate-600">
                Email sending is not configured. Please manually share the credentials below with the user.
              </p>
            </div>
          )}
          
          {/* Show password if email failed or in development */}
          {(!emailDelivered || process.env.NODE_ENV === 'development') && createdUser.temporaryPassword && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 text-amber-700 font-semibold mb-2">
                <Eye size={18} /> Temporary Password
              </div>
              <p className="text-sm text-slate-600 mb-3">
                Share this password with the user. They should change it on first login.
              </p>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    value={createdUser.temporaryPassword} 
                    readOnly
                    className="input font-mono text-sm bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={copyPassword}
                  className="btn-ghost p-2 text-slate-600 hover:text-brand-600"
                  title="Copy password"
                >
                  {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => { setCreatedUser(null); onSaved(); }} className="btn-primary">
              Done
            </button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={true} onClose={onClose} title={user?`Edit: ${user.first_name} ${user.last_name}`:'Add New User'} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">First Name <span className="text-red-500">*</span></label><input className="input" value={form.first_name} onChange={e=>set('first_name',e.target.value)} required/></div>
          <div><label className="label">Last Name <span className="text-red-500">*</span></label><input className="input" value={form.last_name} onChange={e=>set('last_name',e.target.value)} required/></div>
          {!user && (
            <div className="col-span-2"><label className="label">Email <span className="text-red-500">*</span></label><input type="email" className="input" value={form.email} onChange={e=>set('email',e.target.value)} placeholder="user@example.com" required/></div>
          )}
          <div><label className="label">Role <span className="text-red-500">*</span></label>
            <select className="input" value={form.role_type} onChange={e=>set('role_type',e.target.value)}>
              {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={e=>set('status',e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </select>
          </div>
          <div><label className="label">{form.role_type==='parent'?'ID Number':['bookstore_manager','bookstore_staff','working_student','teacher'].includes(form.role_type)?'Employee Number':'Student ID Number'} <span className="text-red-500">*</span></label><input className="input font-mono" value={form.id_number||''} onChange={e=>set('id_number',e.target.value)} placeholder={form.role_type==='parent'?'e.g. 1234-5678-9012':form.role_type==='student'?'e.g. 2024-00123':'e.g. EMP-0001'} required/></div>
          {form.role_type==='parent' && (
            <div><label className="label">ID Type</label>
              <select className="input" value={form.id_type||''} onChange={e=>set('id_type',e.target.value)}>
                <option value="">— Select ID Type —</option>
                <option value="SSS">SSS</option>
                <option value="PhilHealth">PhilHealth</option>
                <option value="TIN">TIN</option>
                <option value="GSIS">GSIS</option>
                <option value="Driver's License">Driver's License</option>
                <option value="Passport">Passport</option>
                <option value="Postal ID">Postal ID</option>
                <option value="Voter's ID">Voter's ID</option>
                <option value="National ID">National ID</option>
                <option value="Other">Other</option>
              </select>
            </div>
          )}
          <div><label className="label">Department</label><input className="input" value={form.department||''} onChange={e=>set('department',e.target.value)}/></div>
          <div><label className="label">Contact</label><input className="input" value={form.contact_number||''} onChange={e=>set('contact_number',e.target.value)}/></div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? <Loader2 size={14} className="animate-spin"/> : user ? 'Save Changes' : <><UserPlus size={14}/> Create User</>}
          </button>
        </div>
      </form>
    </Modal>
  )
}
