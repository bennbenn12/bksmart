'use client'

import { createClient } from '@/lib/db/client'
import Link from 'next/link'
import { useState } from 'react'
import { useAuth } from '@/components/providers/AuthProvider'
import { useToast } from '@/components/providers/ToastProvider'
import { sendEmailClient, EmailTemplates } from '@/lib/emailClient'

export default function RisoForm() {
  const { profile } = useAuth()
  const toast = useToast()
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  
  const [form, setForm] = useState({
    department_account: '',
    cost_center: '',
    exam_type: '',
    charge_to: '',
    description: ''
  })
  
  const [risoItems, setRisoItems] = useState([{
    subject: '',
    num_masters: 1,
    print_type: '1_side',
    copies_per_master: 1
  }])

  const EXAM_TYPES = ['Prelim', 'Midterm', 'Pre-Final', 'Final', 'Elem. Test', 'HS Test']
  const DEPTS = ['CAS', 'CITE', 'CBA', 'COE', 'CON', 'COECS', 'Graduate School']

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const addItem = () => {
    setRisoItems([...risoItems, { subject: '', num_masters: 1, print_type: '1_side', copies_per_master: 1 }])
  }

  const updateItem = (index, field, value) => {
    const newItems = [...risoItems]
    newItems[index][field] = value
    setRisoItems(newItems)
  }

  const removeItem = (index) => {
    if (risoItems.length > 1) {
      setRisoItems(risoItems.filter((_, i) => i !== index))
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    
    if (!form.department_account.trim()) {
      toast('Department Account is required', 'warning')
      return
    }
    if (risoItems.some(item => !item.subject.trim())) {
      toast('All subjects must have a name', 'warning')
      return
    }

    setSaving(true)
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('job_orders')
        .insert({
          requester_id: profile.id_number,
          department_account: form.department_account,
          cost_center: form.cost_center || null,
          exam_type: form.exam_type || null,
          charge_to: form.charge_to || null,
          description: form.description || 'RISO Printing Request',
          job_type: 'RISO',
          status: 'Draft'
        })
        .select('job_id')
        .single()

      if (jobError) throw jobError

      const itemsToInsert = risoItems.map(item => ({
        job_id: jobData.job_id,
        subject: item.subject,
        num_masters: parseInt(item.num_masters) || 1,
        print_type: item.print_type,
        copies_per_master: parseInt(item.copies_per_master) || 1
      }))

      const { error: itemsError } = await supabase
        .from('riso_job_items')
        .insert(itemsToInsert)

      if (itemsError) throw itemsError

      await supabase
        .from('job_orders')
        .update({ status: 'Pending_Audit' })
        .eq('job_id', jobData.job_id)

      // Send notification to teacher (in-app)
      await supabase.from('notifications').insert({
        user_id: profile.id_number,
        title: 'RISO Job Order Submitted - Bring Documents',
        message: `Your RISO Job Order ${jobData.job_id.slice(0,8)} has been submitted. Please bring your original documents to the Bookstore for printing.`,
        type: 'info',
        reference_type: 'job_order',
        reference_id: jobData.job_id
      })

      // Send confirmation email
      try {
        const { data: jobWithItems } = await supabase
          .from('job_orders')
          .select('*, riso_items:riso_job_items(*)')
          .eq('job_id', jobData.job_id)
          .single()
        
        if (profile.email) {
          await sendEmailClient({
            to: profile.email,
            ...EmailTemplates.risoJobSubmitted(
              jobWithItems,
              { first_name: profile.first_name, last_name: profile.last_name, email: profile.email },
              jobWithItems?.riso_items
            )
          })
        }
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr)
      }

      setSubmitted(true)
      toast('RISO Job Order submitted!', 'success')
    } catch (e) {
      toast(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">✅</span>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">RISO Job Order Submitted!</h2>
        
        {/* Important: Bring Documents Notice */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 max-w-md mx-auto">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📄</span>
            <div className="text-left">
              <p className="font-semibold text-yellow-800 mb-1">Next Step: Bring Your Documents</p>
              <p className="text-sm text-yellow-700">
                Please bring your <strong>original documents</strong> to the Bookstore for printing. 
                Staff will verify and start the printing process.
              </p>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-400 mb-6">
          Track your RISO job in <strong>My Orders</strong>. You'll get a notification when it's ready for pickup.
        </p>
        
        <div className="flex gap-3 justify-center">
          <Link href="/shop" className="btn-secondary">Back to Shop</Link>
          <Link href="/shop/orders" className="btn-primary gap-2">
            <span>Track My RISO Jobs</span>
            <span>→</span>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
      
      <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🖨️</span>
          <div>
            <p className="font-semibold text-purple-900">RISO Printing Services</p>
            <p className="text-xs text-purple-700">For examination papers and bulk printing</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Department Account <span className="text-red-500">*</span></label>
          <input 
            className="input" 
            value={form.department_account}
            onChange={e => set('department_account', e.target.value)}
            placeholder="e.g. CITE, CAS..."
            list="depts"
            required
          />
          <datalist id="depts">{DEPTS.map(d => <option key={d} value={d}/>)}</datalist>
        </div>
        <div>
          <label className="label">Cost Center</label>
          <input 
            className="input" 
            value={form.cost_center}
            onChange={e => set('cost_center', e.target.value)}
            placeholder="e.g. CAS..."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Exam Type</label>
          <select className="input" value={form.exam_type} onChange={e => set('exam_type', e.target.value)}>
            <option value="">Select...</option>
            {EXAM_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Charge To</label>
          <input 
            className="input" 
            value={form.charge_to}
            onChange={e => set('charge_to', e.target.value)}
            placeholder="Account..."
          />
        </div>
      </div>

      <div className="border border-slate-200 rounded-xl overflow-hidden">
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
          <p className="font-medium text-sm text-slate-700">SUBJECTS</p>
        </div>
        <div className="p-4 space-y-3">
          {risoItems.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <label className="text-xs text-slate-500">Subject</label>
                <input 
                  className="input text-sm" 
                  value={item.subject}
                  onChange={e => updateItem(index, 'subject', e.target.value)}
                  placeholder="Subject..."
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500">Masters</label>
                <input 
                  type="number" min="1" className="input text-sm" 
                  value={item.num_masters}
                  onChange={e => updateItem(index, 'num_masters', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500">Type</label>
                <select className="input text-sm" value={item.print_type} onChange={e => updateItem(index, 'print_type', e.target.value)}>
                  <option value="1_side">1 Side</option>
                  <option value="B_to_B">B to B</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs text-slate-500">Copies</label>
                <input 
                  type="number" min="1" className="input text-sm" 
                  value={item.copies_per_master}
                  onChange={e => updateItem(index, 'copies_per_master', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <button 
                  type="button" onClick={() => removeItem(index)}
                  className="btn-ghost text-red-500 text-xs"
                  disabled={risoItems.length === 1}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addItem} className="btn-ghost text-xs gap-1 w-full justify-center">
            + Add Subject
          </button>
        </div>
      </div>

      <div>
        <label className="label">Additional Notes</label>
        <textarea 
          className="input resize-none" rows={2}
          value={form.description}
          onChange={e => set('description', e.target.value)}
          placeholder="Special instructions..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Link href="/shop" className="btn-secondary flex-1">Cancel</Link>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? 'Submitting...' : 'Submit RISO Request'}
        </button>
      </div>
    </form>
  )
}
