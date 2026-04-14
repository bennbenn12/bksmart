'use client'
import { useState } from 'react'
import { createClient } from '@/lib/db/client'
import { Modal, Alert } from '@/components/ui'
import { Loader2, Edit3 } from 'lucide-react'
import { useToast } from '@/components/providers/ToastProvider'

export default function EditProfileButton({ profile }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    contact_number: profile.contact_number || '',
    password: '',
    confirm_password: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const toast = useToast()
  const supabase = createClient()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSave(e) {
    e.preventDefault()
    setError('')
    
    if (form.password && form.password !== form.confirm_password) {
      return setError('Passwords do not match.')
    }

    setSaving(true)
    try {
      // Update profile info
      const updates = {
        first_name: form.first_name,
        last_name: form.last_name,
        contact_number: form.contact_number || null,
      }
      const { error: updateErr } = await supabase.from('users').update(updates).eq('id_number', profile.id_number)
      if (updateErr) throw updateErr

      // Update password if provided
      if (form.password) {
        const { error: pwErr } = await supabase.auth.updateUser({ password: form.password })
        if (pwErr) throw pwErr
      }

      toast('Profile updated successfully.', 'success')
      setOpen(false)
      window.location.reload()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-ghost gap-2 text-xs">
        <Edit3 size={14} /> Edit Profile
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Edit Profile" size="sm">
        {error && <Alert type="error" message={error} />}
        <form onSubmit={handleSave} className="space-y-4 mt-2">
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
                <input type="password" minLength={6} className="input" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Leave blank to keep current" />
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
            <button type="button" onClick={() => setOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  )
}
