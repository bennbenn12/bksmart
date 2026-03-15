'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Pagination, Badge } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { ROLE_LABELS, ROLE_COLORS, formatDate, cn } from '@/lib/utils'
import { Users, UserPlus, Search, Edit2, ToggleLeft, ToggleRight, Loader2, RefreshCw } from 'lucide-react'

const ALL_ROLES = ['bookstore_manager','bookstore_staff','working_student','teacher','student','parent']

export default function AccountsPage() {
  const toast = useToast()
  const [profiles, setProfiles]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRole]     = useState('')
  const [statusFilter, setStatus] = useState('')
  const [page, setPage]           = useState(1)
  const [total, setTotal]         = useState(0)
  const [showCreate, setCreate]   = useState(false)
  const [editUser, setEdit]       = useState(null)
  const PAGE = 15
  const supabase = createClient()

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('users').select('*', {count:'exact'})
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,student_id.ilike.%${search}%`)
    if (roleFilter) q = q.eq('role_id', roleFilter)
    if (statusFilter) q = q.eq('status', statusFilter)
    q = q.order('created_at',{ascending:false}).range((page-1)*PAGE, page*PAGE-1)
    const { data, count } = await q
    setProfiles(data||[]); setTotal(count||0); setLoading(false)
  }, [search, roleFilter, statusFilter, page])

  useRealtime({ tables:['users'], onRefresh:fetchUsers })
  useEffect(() => { fetchUsers() }, [search, roleFilter, statusFilter, page])

  async function toggleStatus(user) {
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active'
    await supabase.from('users').update({ status:newStatus }).eq('user_id', user.id || user.user_id)
    toast(`${user.first_name} ${user.last_name} set to ${newStatus}.`, newStatus==='Active'?'success':'warning')
  }

  return (
    <div className="page-enter">
      <Header title="Manage Accounts"/>
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot"/> Live — updates automatically
        </div>

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
                <tr><th className="th">Name</th><th className="th">Email</th><th className="th">Role</th><th className="th">ID</th><th className="th">Status</th><th className="th">Joined</th><th className="th text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={7} className="py-12"><LoadingSpinner/></td></tr>
                : profiles.length===0 ? <tr><td colSpan={7}><EmptyState icon={Users} title="No users found"/></td></tr>
                : profiles.map(u=>(
                  <tr key={u.user_id} className="hover:bg-slate-50 transition-colors">
                    <td className="td">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-700 text-xs shrink-0">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div><div className="font-medium text-slate-800">{u.first_name} {u.last_name}</div><div className="text-xs text-slate-400">{u.username}</div></div>
                      </div>
                    </td>
                    <td className="td text-slate-500">{u.email}</td>
                    <td className="td"><span className={cn('badge', ROLE_COLORS[u.role_id]||'bg-slate-100')}>{ROLE_LABELS[u.role_id]||u.role_id}</span></td>
                    <td className="td font-mono text-xs text-slate-400">{u.student_id||u.employee_id||'—'}</td>
                    <td className="td"><span className={cn('badge', u.status==='Active'?'bg-green-100 text-green-700':'bg-red-100 text-red-700')}>{u.status}</span></td>
                    <td className="td text-xs text-slate-400">{formatDate(u.created_at)}</td>
                    <td className="td text-right">
                      <div className="flex items-center justify-end gap-1">
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

      {(showCreate||editUser) && <UserModal user={editUser} onClose={()=>{setCreate(false);setEdit(null)}} onSaved={()=>{setCreate(false);setEdit(null);fetchUsers();toast('User saved!','success')}}/>}
    </div>
  )
}

function UserModal({ user, onClose, onSaved }) {
  const toast = useToast()
  const EMPTY = { first_name:'',last_name:'',email:'',username:'',role_id:'student',student_id:'',employee_id:'',department:'',contact_number:'',status:'Active' }
  const [form, setForm] = useState(user||EMPTY)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function submit(e) {
    e.preventDefault(); setSaving(true)
    try {
      if (user) {
        await supabase.from('users').update({ first_name:form.first_name, last_name:form.last_name, role_id:form.role_id, student_id:form.student_id||null, employee_id:form.employee_id||null, department:form.department||null, contact_number:form.contact_number||null, status:form.status }).eq('user_id', user.user_id)
      } else {
        // Create via Supabase Auth + insert profile
        const { data:authData, error:authErr } = await supabase.auth.admin ? 
          { data:null, error:{message:'Use Auth dashboard to create users'} } :
          { data:null, error:{message:'Self-registration only via /register page'} }
        toast('To create new accounts, use the /register page or Supabase Auth dashboard.','info')
        setSaving(false); return
      }
      onSaved()
    } catch(e) { toast(e.message,'error') } finally { setSaving(false) }
  }

  return (
    <Modal open={true} onClose={onClose} title={user?`Edit: ${user.first_name} ${user.last_name}`:'New User'} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">First Name</label><input className="input" value={form.first_name} onChange={e=>set('first_name',e.target.value)} required/></div>
          <div><label className="label">Last Name</label><input className="input" value={form.last_name} onChange={e=>set('last_name',e.target.value)} required/></div>
          <div><label className="label">Role</label>
            <select className="input" value={form.role_id} onChange={e=>set('role_id',e.target.value)}>
              {ALL_ROLES.map(r=><option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          <div><label className="label">Status</label>
            <select className="input" value={form.status} onChange={e=>set('status',e.target.value)}>
              <option>Active</option><option>Inactive</option>
            </select>
          </div>
          <div><label className="label">Student ID</label><input className="input" value={form.student_id||''} onChange={e=>set('student_id',e.target.value)}/></div>
          <div><label className="label">Employee ID</label><input className="input" value={form.employee_id||''} onChange={e=>set('employee_id',e.target.value)}/></div>
          <div><label className="label">Department</label><input className="input" value={form.department||''} onChange={e=>set('department',e.target.value)}/></div>
          <div><label className="label">Contact</label><input className="input" value={form.contact_number||''} onChange={e=>set('contact_number',e.target.value)}/></div>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving?<Loader2 size={14} className="animate-spin"/>:'Save Changes'}</button>
        </div>
      </form>
    </Modal>
  )
}
