'use client'
import { useEffect, useState, useCallback } from 'react'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Badge, Pagination } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { formatCurrency, CATEGORIES, SHOPS, shopLabel, cn } from '@/lib/utils'
import { Package, Plus, Search, Edit2, TrendingUp, AlertTriangle, Loader2, RefreshCw } from 'lucide-react'

export default function InventoryPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [shopFilter, setShop]   = useState('')
  const [catFilter, setCat]     = useState('')
  const [lowOnly, setLowOnly]   = useState(false)
  const [page, setPage]         = useState(1)
  const [total, setTotal]       = useState(0)
  const [showCreate, setCreate] = useState(false)
  const [editItem, setEdit]     = useState(null)
  const [restockItem, setRestock] = useState(null)
  const PAGE = 12
  const supabase = createClient()
  const isManager = ['bookstore_manager','bookstore_staff','working_student'].includes(profile?.role_id)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    let q = supabase.from('bookstore_items').select('*',{count:'exact'}).eq('is_active',true).order('name').range((page-1)*PAGE,page*PAGE-1)
    if (search) q = q.ilike('name',`%${search}%`)
    if (shopFilter) q = q.eq('shop',shopFilter)
    if (catFilter) q = q.eq('category',catFilter)
    if (lowOnly) q = q.lte('stock_quantity', 10)
    const { data, count } = await q
    setItems(data||[]); setTotal(count||0); setLoading(false)
  }, [search, shopFilter, catFilter, lowOnly, page])

  useRealtime({ tables:['bookstore_items','inventory_logs'], onRefresh:fetchItems, enabled:!!profile })
  useEffect(() => { fetchItems() }, [search, shopFilter, catFilter, lowOnly, page])

  async function saveItem(form, isEdit) {
    try {
      if (isEdit) {
        await supabase.from('bookstore_items').update(form).eq('item_id', form.item_id)
        toast('Item updated.','success')
      } else {
        await supabase.from('bookstore_items').insert({ ...form, created_by:profile.user_id })
        toast('Item created.','success')
      }
      setCreate(false); setEdit(null)
    } catch(e) { toast(e.message,'error') }
  }

  async function doRestock(item, qty, notes) {
    try {
      const newQty = item.stock_quantity + parseInt(qty)
      await supabase.from('bookstore_items').update({ stock_quantity:newQty }).eq('item_id', item.item_id)
      await supabase.from('inventory_logs').insert({ item_id:item.item_id, changed_by:profile.user_id, change_type:'Restock', quantity_before:item.stock_quantity, quantity_after:newQty, delta:parseInt(qty), notes:notes||null })
      toast(`Restocked ${item.name} (+${qty})`, 'success')
      setRestock(null)
    } catch(e) { toast(e.message,'error') }
  }

  const lowCount = items.filter(i=>i.stock_quantity<=i.reorder_level).length

  return (
    <div className="page-enter">
      <Header title="Inventory" />
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot"/> Live — updates automatically
        </div>

        {lowCount > 0 && <Alert type="warning" message={`${lowCount} item${lowCount>1?'s':''} at or below reorder level. Consider restocking.`}/>}

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="input pl-9" placeholder="Search items..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div>
          <select className="input w-32" value={shopFilter} onChange={e=>{setShop(e.target.value);setPage(1)}}><option value="">All Shops</option>{SHOPS.map(s=><option key={s} value={s}>{shopLabel(s)}</option>)}</select>
          <select className="input w-32" value={catFilter} onChange={e=>{setCat(e.target.value);setPage(1)}}><option value="">All Categories</option>{CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer"><input type="checkbox" checked={lowOnly} onChange={e=>setLowOnly(e.target.checked)} className="rounded text-brand-600"/> Low Stock Only</label>
          <button onClick={fetchItems} className="btn-ghost gap-1 text-xs"><RefreshCw size={12}/> Refresh</button>
          {isManager && <button onClick={()=>setCreate(true)} className="btn-primary ml-auto"><Plus size={14}/> Add Item</button>}
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr><th className="th">Item</th><th className="th">SKU</th><th className="th">Category</th><th className="th">Shop</th><th className="th text-right">Price</th><th className="th text-right">Stock</th><th className="th text-right">Reserved</th><th className="th text-right">Available</th><th className="th text-right">Actions</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? <tr><td colSpan={9} className="py-12"><LoadingSpinner/></td></tr>
                : items.length === 0 ? <tr><td colSpan={9}><EmptyState icon={Package} title="No items found" description="Try adjusting your filters."/></td></tr>
                : items.map(item => {
                  const avail = item.stock_quantity - item.reserved_quantity
                  const isLow = item.stock_quantity <= item.reorder_level
                  return (
                    <tr key={item.item_id} className={cn('hover:bg-slate-50 transition-colors', isLow && 'bg-red-50/40')}>
                      <td className="td"><div className="font-medium text-slate-800">{item.name}</div>{isLow && <span className="text-[10px] text-red-600 font-bold flex items-center gap-1 mt-0.5"><AlertTriangle size={10}/>Low stock</span>}</td>
                      <td className="td font-mono text-xs text-slate-400">{item.sku}</td>
                      <td className="td"><span className="badge bg-slate-100 text-slate-600">{item.category}</span></td>
                      <td className="td text-xs text-slate-500">{shopLabel(item.shop)}</td>
                      <td className="td text-right font-bold text-slate-700">{formatCurrency(item.price)}</td>
                      <td className={cn('td text-right font-bold', isLow?'text-red-600':'text-slate-700')}>{item.stock_quantity}</td>
                      <td className="td text-right text-orange-600 font-medium">{item.reserved_quantity}</td>
                      <td className={cn('td text-right font-bold', avail<=0?'text-red-600':avail<=5?'text-orange-600':'text-green-600')}>{avail}</td>
                      <td className="td text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isManager && <button onClick={()=>setRestock(item)} className="btn-primary py-1 px-2 text-xs"><TrendingUp size={11}/>Restock</button>}
                          {isManager && <button onClick={()=>setEdit(item)} className="btn-ghost p-1.5"><Edit2 size={12}/></button>}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} total={total} pageSize={PAGE} onPageChange={setPage}/>
        </div>
      </div>

      {(showCreate || editItem) && <ItemModal item={editItem} onClose={()=>{setCreate(false);setEdit(null)}} onSave={saveItem}/>}
      {restockItem && <RestockModal item={restockItem} onClose={()=>setRestock(null)} onRestock={doRestock}/>}
    </div>
  )
}

function ItemModal({ item, onClose, onSave }) {
  const EMPTY = { name:'',description:'',price:'',stock_quantity:'0',reserved_quantity:'0',sku:'',category:'Supply',shop:'Bookstore',reorder_level:'10',unit:'pc',is_active:true }
  const [form, setForm] = useState(item ? {...item, price:String(item.price), stock_quantity:String(item.stock_quantity), reorder_level:String(item.reorder_level)} : EMPTY)
  const [saving, setSaving] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  async function submit(e) {
    e.preventDefault(); setSaving(true)
    await onSave({ ...form, price:parseFloat(form.price), stock_quantity:parseInt(form.stock_quantity), reserved_quantity:parseInt(form.reserved_quantity||'0'), reorder_level:parseInt(form.reorder_level) }, !!item)
    setSaving(false)
  }

  return (
    <Modal open={true} onClose={onClose} title={item?'Edit Item':'Add Item'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Item Name</label><input className="input" required value={form.name} onChange={e=>set('name',e.target.value)}/></div>
          <div><label className="label">SKU</label><input className="input" required value={form.sku} onChange={e=>set('sku',e.target.value)}/></div>
          <div><label className="label">Unit (pc, set…)</label><input className="input" value={form.unit} onChange={e=>set('unit',e.target.value)}/></div>
          <div><label className="label">Category</label><select className="input" value={form.category} onChange={e=>set('category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          <div><label className="label">Shop</label><select className="input" value={form.shop} onChange={e=>set('shop',e.target.value)}>{SHOPS.map(s=><option key={s} value={s}>{shopLabel(s)}</option>)}</select></div>
          <div><label className="label">Price (₱)</label><input className="input" type="number" step="0.01" required value={form.price} onChange={e=>set('price',e.target.value)}/></div>
          <div><label className="label">Initial Stock</label><input className="input" type="number" value={form.stock_quantity} onChange={e=>set('stock_quantity',e.target.value)}/></div>
          <div><label className="label">Reorder Level</label><input className="input" type="number" value={form.reorder_level} onChange={e=>set('reorder_level',e.target.value)}/></div>
          <div className="col-span-2"><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>
        </div>
        <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={saving} className="btn-primary">{saving?<Loader2 size={14} className="animate-spin"/>:'Save Item'}</button></div>
      </form>
    </Modal>
  )
}

function RestockModal({ item, onClose, onRestock }) {
  const [qty, setQty]     = useState('10')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!qty || parseInt(qty)<=0) return
    setSaving(true)
    await onRestock(item, qty, notes)
    setSaving(false)
  }

  return (
    <Modal open={true} onClose={onClose} title={`Restock: ${item.name}`} size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm">
          <span className="text-slate-500">Current stock</span><span className="font-bold text-slate-700">{item.stock_quantity} {item.unit}</span>
        </div>
        <div><label className="label">Add Quantity</label><input className="input" type="number" min="1" value={qty} onChange={e=>setQty(e.target.value)}/></div>
        <div className="flex items-center justify-between p-3 bg-brand-50 rounded-xl text-sm border border-brand-100">
          <span className="text-brand-600">New stock after restock</span><span className="font-bold text-brand-700">{(item.stock_quantity+(parseInt(qty)||0))} {item.unit}</span>
        </div>
        <div><label className="label">Notes</label><input className="input" placeholder="Reason for restock..." value={notes} onChange={e=>setNotes(e.target.value)}/></div>
        <div className="flex justify-end gap-2"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={submit} disabled={saving} className="btn-primary">{saving?<Loader2 size={14} className="animate-spin"/>:'Confirm Restock'}</button></div>
      </div>
    </Modal>
  )
}
