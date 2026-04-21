'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Badge, Pagination } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { formatCurrency, CATEGORIES, SHOPS, shopLabel, cn, CLOTHING_SIZES } from '@/lib/utils'
import { Package, Plus, Search, Edit2, TrendingUp, AlertTriangle, Loader2, RefreshCw, ImagePlus, X, PlusCircle, Upload } from 'lucide-react'

export default function InventoryPage() {
  const { profile } = useAuth()
  const toast = useToast()
  const router = useRouter()
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
  const [dbCategories, setDbCategories] = useState([])
  const PAGE = 12
  const supabase = createClient()
  const isManager = ['bookstore_manager','bookstore_staff','working_student'].includes(profile?.role_type)
  const allCategories = [...new Set([...CATEGORIES, ...dbCategories])]

  const fetchCategories = useCallback(async () => {
    const { data } = await supabase.from('categories').select('name').eq('is_active', 1)
    setDbCategories((data || []).map(c => c.name))
  }, [])

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
  useEffect(() => { fetchCategories() }, [])
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
      await fetchItems() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch(e) { toast(e.message,'error') }
  }

  async function doRestock(item, qty, notes) {
    try {
      const newQty = item.stock_quantity + parseInt(qty)
      await supabase.from('bookstore_items').update({ stock_quantity:newQty }).eq('item_id', item.item_id)
      await supabase.from('inventory_logs').insert({ item_id:item.item_id, changed_by:profile.user_id, change_type:'Restock', quantity_before:item.stock_quantity, quantity_after:newQty, delta:parseInt(qty), notes:notes||null })
      toast(`Restocked ${item.name} (+${qty})`, 'success')
      setRestock(null)
      await fetchItems() // Immediate client-side refresh
      router.refresh() // Server-side refresh
    } catch(e) { toast(e.message,'error') }
  }

  const lowCount = items.filter(i=>i.stock_quantity<=i.reorder_level).length

  return (
    <div className="page-enter">
      <Header title="Inventory" />
      <div className="p-6 space-y-5">
        {lowCount > 0 && <Alert type="warning" message={`${lowCount} item${lowCount>1?'s':''} at or below reorder level. Consider restocking.`}/>}

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[160px]"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input className="input pl-9" placeholder="Search items..." value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}}/></div>
          <select className="input w-32" value={shopFilter} onChange={e=>{setShop(e.target.value);setPage(1)}}><option value="">All Shops</option>{SHOPS.map(s=><option key={s} value={s}>{shopLabel(s)}</option>)}</select>
          <select className="input w-32" value={catFilter} onChange={e=>{setCat(e.target.value);setPage(1)}}><option value="">All Categories</option>{allCategories.map(c=><option key={c} value={c}>{c}</option>)}</select>
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

      {(showCreate || editItem) && <ItemModal item={editItem} onClose={()=>{setCreate(false);setEdit(null)}} onSave={saveItem} categories={allCategories} onCategoryAdded={fetchCategories}/>}
      {restockItem && <RestockModal item={restockItem} onClose={()=>setRestock(null)} onRestock={doRestock}/>}
    </div>
  )
}

function ItemModal({ item, onClose, onSave, categories = CATEGORIES, onCategoryAdded }) {
  const toast = useToast()
  const supabase = createClient()
  const EMPTY = { name:'',description:'',price:'',stock_quantity:'0',reserved_quantity:'0',sku:'',category:'Supply',shop:'Bookstore',reorder_level:'10',unit:'pc',sizes:'',is_active:true,image_url:'' }
  const [form, setForm] = useState(item ? {...item, price:String(item.price), stock_quantity:String(item.stock_quantity), reorder_level:String(item.reorder_level)} : EMPTY)
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState(() => {
    const urls = (item?.image_url || '').split(',').map(s => s.trim()).filter(Boolean)
    return urls.length ? urls : []
  })
  const [newCat, setNewCat] = useState('')
  const [showNewCat, setShowNewCat] = useState(false)
  const [uploading, setUploading] = useState(false)
  const set = (k,v) => setForm(f=>({...f,[k]:v}))

  function addImageField() { setImages(prev => [...prev, '']) }
  function removeImage(idx) { setImages(prev => prev.filter((_, i) => i !== idx)) }
  function updateImage(idx, val) { setImages(prev => prev.map((v, i) => i === idx ? val : v)) }

  async function handleFileUpload(e, idx) {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Upload failed')
      
      updateImage(idx, result.url)
      toast('Image uploaded successfully', 'success')
    } catch (err) {
      toast(err.message || 'Failed to upload image', 'error')
    } finally {
      setUploading(false)
    }
  }

  async function addCategory() {
    const name = newCat.trim()
    if (!name) return
    try {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      const { error } = await supabase.from('categories').insert({ name, slug, is_active: 1 })
      if (error) throw new Error(error.message || 'Failed to add category')
      toast(`Category "${name}" added.`, 'success')
      set('category', name)
      setNewCat('')
      setShowNewCat(false)
      if (onCategoryAdded) onCategoryAdded()
    } catch (e) { toast(e.message || 'Category may already exist.', 'error') }
  }

  async function submit(e) {
    e.preventDefault(); setSaving(true)
    const imageUrl = images.filter(u => u.trim()).join(', ')
    await onSave({ ...form, image_url: imageUrl, price:parseFloat(form.price), stock_quantity:parseInt(form.stock_quantity), reserved_quantity:parseInt(form.reserved_quantity||'0'), reorder_level:parseInt(form.reorder_level) }, !!item)
    setSaving(false)
  }

  return (
    <Modal open={true} onClose={onClose} title={item?'Edit Item':'Add Item'} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Item Name</label><input className="input" required value={form.name} onChange={e=>set('name',e.target.value)}/></div>
          <div><label className="label">SKU</label><input className="input" required value={form.sku} onChange={e=>set('sku',e.target.value)}/></div>
          <div><label className="label">Unit (pc, set…)</label><input className="input" value={form.unit} onChange={e=>set('unit',e.target.value)}/></div>
          <div>
            <label className="label">Category</label>
            {showNewCat ? (
              <div className="flex gap-2">
                <input className="input flex-1" placeholder="New category name" value={newCat} onChange={e=>setNewCat(e.target.value)} autoFocus />
                <button type="button" onClick={addCategory} className="btn-primary py-1 px-2 text-xs"><PlusCircle size={12}/></button>
                <button type="button" onClick={()=>setShowNewCat(false)} className="btn-ghost py-1 px-2 text-xs"><X size={12}/></button>
              </div>
            ) : (
              <div className="flex gap-2">
                <select className="input flex-1" value={form.category} onChange={e=>set('category',e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select>
                <button type="button" onClick={()=>setShowNewCat(true)} className="btn-ghost py-1 px-2 text-xs" title="Add new category"><PlusCircle size={14}/></button>
              </div>
            )}
          </div>
          <div><label className="label">Shop</label><select className="input" value={form.shop} onChange={e=>set('shop',e.target.value)}>{SHOPS.map(s=><option key={s} value={s}>{shopLabel(s)}</option>)}</select></div>
          <div><label className="label">Price (₱)</label><input className="input" type="number" step="0.01" required value={form.price} onChange={e=>set('price',e.target.value)}/></div>
          <div><label className="label">Initial Stock</label><input className="input" type="number" value={form.stock_quantity} onChange={e=>set('stock_quantity',e.target.value)}/></div>
          <div><label className="label">Reorder Level</label><input className="input" type="number" value={form.reorder_level} onChange={e=>set('reorder_level',e.target.value)}/></div>
          {form.category === 'Uniform' && (
            <div className="col-span-2">
              <label className="label">Available Sizes</label>
              <div className="flex flex-wrap gap-2">
                {CLOTHING_SIZES.map(size => {
                  const active = (form.sizes||'').split(',').map(s=>s.trim()).filter(Boolean).includes(size)
                  return (
                    <button key={size} type="button" onClick={() => {
                      const current = (form.sizes||'').split(',').map(s=>s.trim()).filter(Boolean)
                      const next = active ? current.filter(s=>s!==size) : [...current, size]
                      set('sizes', next.join(','))
                    }} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all', active ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400')}>
                      {size}
                    </button>
                  )
                })}
              </div>
              {(form.sizes||'').trim() && <p className="text-xs text-slate-400 mt-1">Selected: {form.sizes}</p>}
            </div>
          )}
          <div className="col-span-2"><label className="label">Description</label><textarea className="input resize-none" rows={2} value={form.description||''} onChange={e=>set('description',e.target.value)}/></div>
        </div>

        {/* Multiple Images - File Upload */}
        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Item Images</label>
            <button type="button" onClick={addImageField} className="btn-ghost text-xs gap-1" disabled={uploading}><ImagePlus size={12}/> Add Image</button>
          </div>
          <div className="space-y-3">
            {images.length === 0 && (
              <div className="text-sm text-slate-400 p-4 bg-slate-50 rounded-lg text-center">
                No images added. Click "Add Image" to upload.
              </div>
            )}
            {images.map((url, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                {/* Preview or Upload Button */}
                <div className="shrink-0">
                  {url ? (
                    <div className="w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-white">
                      <img src={url} className="w-full h-full object-cover" alt={`Preview ${idx+1}`}/>
                    </div>
                  ) : (
                    <label className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors bg-white">
                      <Upload size={20} className="text-slate-400"/>
                      <span className="text-[10px] text-slate-400 mt-1">Upload</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={e => handleFileUpload(e, idx)}
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>
                
                {/* URL input (for editing) or upload button */}
                <div className="flex-1 min-w-0">
                  {url ? (
                    <div className="space-y-2">
                      <input 
                        className="input text-xs" 
                        value={url} 
                        readOnly
                        title="Uploaded image path"
                      />
                      <div className="flex gap-2">
                        <label className="btn-ghost text-xs cursor-pointer">
                          <Upload size={12} className="inline mr-1"/>
                          Replace
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={e => handleFileUpload(e, idx)}
                            disabled={uploading}
                          />
                        </label>
                        <button type="button" onClick={()=>removeImage(idx)} className="btn-ghost text-xs text-red-500"><X size={12}/> Remove</button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500">
                      {uploading ? 'Uploading...' : 'Click "Upload" or drag a file to add an image'}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mt-2">Upload images from your device (JPEG, PNG, GIF, WebP - max 5MB). The first image will be the primary display image.</p>
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
