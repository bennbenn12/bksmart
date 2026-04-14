'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/layout/Header'
import { Modal, Alert, LoadingSpinner, EmptyState, Badge } from '@/components/ui'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { useRealtime } from '@/lib/useRealtime'
import { useToast } from '@/components/providers/ToastProvider'
import { QUEUE_STATUS_COLORS, formatDateTime, formatCurrency, cn } from '@/lib/utils'
import { ListOrdered, CheckCircle, Loader2, Volume2, VolumeX, Users, SkipForward, RefreshCw, XCircle, Package, Eye, PlayCircle, ArrowRight } from 'lucide-react'
import { sendQueueEmail } from '@/app/actions/email'

const today = () => new Date().toISOString().split('T')[0]

export default function QueuePage() {
  const { profile } = useAuth()
  const toast = useToast()
  const router = useRouter()
  const [queue, setQueue]     = useState([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing]   = useState(false)
  const [soundOn, setSoundOn] = useState(true)
  const [processingOrder, setProcessingOrder] = useState(null)
  const [showOrderModal, setShowOrderModal] = useState(false)
  const [showNextPrompt, setShowNextPrompt] = useState(false)
  const prevProcessingRef     = useRef(null)
  const supabase              = createClient()
  const isStaff = ['bookstore_manager','bookstore_staff','working_student'].includes(profile?.role_type)

  const fetchQueue = useCallback(async () => {
    let q = supabase.from('queues')
      .select('*, user:user_id(first_name,last_name,id_number,email), order:order_id(order_id,order_number,status,total_amount,user_id)')
      .eq('queue_date', today()).order('queue_number')
    if (!isStaff) q = q.eq('user_id', profile.id_number)
    const { data } = await q
    const list = data || []
    const nowProcessing = list.find(q => q.status === 'Processing')
    if (soundOn && nowProcessing && prevProcessingRef.current !== nowProcessing.queue_id) {
      playChime(); prevProcessingRef.current = nowProcessing.queue_id
      // Auto-show order modal if linked order exists
      if (nowProcessing.order && isStaff) {
        setProcessingOrder(nowProcessing.order)
        setShowOrderModal(true)
      }
    }
    setQueue(list); setLoading(false)
  }, [profile, isStaff, soundOn])

  useRealtime({ tables:[{ table:'queues', filter:`queue_date=eq.${today()}` }], onRefresh:fetchQueue, enabled:!!profile })
  useEffect(() => { if (profile) fetchQueue() }, [profile])

  function playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator(); const gain = ctx.createGain()
      osc.connect(gain); gain.connect(ctx.destination)
      osc.frequency.setValueAtTime(880, ctx.currentTime)
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1)
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.2)
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6)
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6)
    } catch {}
  }

  // Voice notification for queue numbers
  function announceQueueNumber(queueNumber, name) {
    try {
      if (!('speechSynthesis' in window)) return
      
      const utterance = new SpeechSynthesisUtterance(
        `Now serving queue number ${String(queueNumber).split('').join(' ')}${name ? `, ${name}` : ''}. Please proceed to the counter.`
      )
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      
      // Try to use a good English voice
      const voices = window.speechSynthesis.getVoices()
      const englishVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Female')) ||
                          voices.find(v => v.lang.includes('en')) ||
                          voices[0]
      if (englishVoice) utterance.voice = englishVoice
      
      window.speechSynthesis.speak(utterance)
    } catch {}
  }

  async function callNext() {
    const waiting = queue.filter(q=>q.status==='Waiting').sort((a,b)=>a.queue_number-b.queue_number)
    if (!waiting.length) { toast('No one is waiting.', 'info'); return }
    setActing(true)
    try {
      const processing = queue.find(q=>q.status==='Processing')
      if (processing) await supabase.from('queues').update({ status:'Completed', completed_at:new Date().toISOString() }).eq('queue_id',processing.queue_id)
      await supabase.from('queues').update({ status:'Processing', called_at:new Date().toISOString() }).eq('queue_id',waiting[0].queue_id)
      
      // Play chime and announce
      if (soundOn) {
        playChime()
        setTimeout(() => {
          announceQueueNumber(waiting[0].queue_number, waiting[0].user?.first_name)
        }, 800)
      }
      
      // Send email notification to customer
      if (waiting[0].user?.email) {
        try {
          await sendQueueEmail({
            type: 'QUEUE_CALLED',
            user: waiting[0].user,
            queueEntry: waiting[0]
          })
        } catch (emailError) {
          console.error('Failed to send queue notification email:', emailError)
        }
      }
      
      toast(`Now calling #${String(waiting[0].queue_number).padStart(3,'0')}`, 'success')
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  async function completeCurrent() {
    const processing = queue.find(q=>q.status==='Processing')
    if (!processing) return
    setActing(true)
    try {
      await supabase.from('queues').update({ status:'Completed', completed_at:new Date().toISOString() }).eq('queue_id',processing.queue_id)
      setProcessingOrder(null)
      setShowOrderModal(false)
      // Show next prompt if there are more waiting
      const waiting = queue.filter(q=>q.status==='Waiting').sort((a,b)=>a.queue_number-b.queue_number)
      if (waiting.length > 0) {
        setShowNextPrompt(true)
      }
      toast('Marked as served.','success')
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  async function releaseOrderAndComplete(orderId) {
    setActing(true)
    try {
      // Release the order
      await supabase.from('orders').update({ 
        status: 'Released', 
        released_at: new Date().toISOString(),
        processed_by: profile.id_number 
      }).eq('order_id', orderId)
      // Complete current queue entry
      const processing = queue.find(q=>q.status==='Processing')
      if (processing) {
        await supabase.from('queues').update({ 
          status: 'Completed', 
          completed_at: new Date().toISOString(),
          notes: 'Order released'
        }).eq('queue_id', processing.queue_id)
      }
      setProcessingOrder(null)
      setShowOrderModal(false)
      toast('Order released and customer served!','success')
      // Show next prompt
      const waiting = queue.filter(q=>q.status==='Waiting').sort((a,b)=>a.queue_number-b.queue_number)
      if (waiting.length > 0) {
        setShowNextPrompt(true)
      }
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  function viewOrderDetails(orderId) {
    router.push(`/orders?highlight=${orderId}`)
  }

  function handleCallNextFromPrompt() {
    setShowNextPrompt(false)
    callNext()
  }

  async function removeEntry(queueId) {
    setActing(true)
    try {
      await supabase.from('queues').update({ status:'Completed', notes:'Removed by staff' }).eq('queue_id',queueId)
      toast('Removed from queue.','info')
    } catch(e) { toast(e.message,'error') } finally { setActing(false) }
  }

  const processing = queue.find(q=>q.status==='Processing')
  const waiting    = queue.filter(q=>q.status==='Waiting').sort((a,b)=>a.queue_number-b.queue_number).slice(0, 50)
  const completed  = queue.filter(q=>q.status==='Completed').slice(0, 20)
  const myEntry    = !isStaff ? queue.find(q=>q.user_id===profile.id_number) : null
  const myPos      = myEntry ? waiting.findIndex(q=>q.queue_id===myEntry.queue_id)+1 : 0

  if (loading) return <LoadingSpinner />

  return (
    <div className="page-enter">
      <Header title="Queue Management" />
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-2 text-xs text-green-600 font-semibold">
          <span className="live-dot" /> Live — updates automatically
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-brand-950 rounded-2xl p-8 text-white text-center relative overflow-hidden shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-800/30 to-transparent pointer-events-none" />
            <p className="text-xs uppercase tracking-[0.25em] text-brand-300 font-bold mb-3">Now Serving</p>
            {processing ? (
              <div className="num-flip" key={processing.queue_number}>
                <span className="font-display text-8xl font-black text-white drop-shadow-lg">{String(processing.queue_number).padStart(3,'0')}</span>
                {processing.user && <p className="text-brand-300 text-sm mt-2">{processing.user.first_name} {processing.user.last_name}{processing.user.id_number && <span className="ml-2 opacity-60">· {processing.user.id_number}</span>}</p>}
              </div>
            ) : (<p className="font-display text-6xl text-brand-600 py-4">— — —</p>)}
            {isStaff && (
              <div className="flex gap-3 justify-center mt-6 flex-wrap">
                <button onClick={callNext} disabled={acting||!waiting.length} className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm shadow-lg">
                  {acting ? <Loader2 size={16} className="animate-spin" /> : <SkipForward size={16} />}
                  Call Next {waiting.length > 0 && `(#${String(waiting[0].queue_number).padStart(3,'0')})`}
                </button>
                {processing && <button onClick={completeCurrent} disabled={acting} className="flex items-center gap-2 px-5 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-bold rounded-xl transition-all text-sm"><CheckCircle size={16}/> Done</button>}
                <button onClick={()=>setSoundOn(s=>!s)} className="p-3 rounded-xl bg-brand-800 hover:bg-brand-700 text-white" title="Toggle sound">
                  {soundOn ? <Volume2 size={16}/> : <VolumeX size={16}/>}
                </button>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {[{label:'Waiting',value:waiting.length,color:'text-yellow-600',bg:'bg-yellow-50 border-yellow-100'},{label:'Served Today',value:completed.length,color:'text-green-600',bg:'bg-green-50 border-green-100'},{label:'Est. Wait',value:waiting.length?`~${waiting.length*5} min`:'—',color:'text-brand-600',bg:'bg-brand-50 border-brand-100'}].map(s=>(
              <div key={s.label} className={cn('rounded-xl border p-5 card',s.bg)}>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className={cn('font-display text-3xl font-bold mt-1',s.color)}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {!isStaff && myEntry && (
          <div className={cn('rounded-2xl p-5 border-2 text-center', myEntry.status==='Processing'?'border-green-400 bg-green-50':'border-brand-300 bg-brand-50')}>
            {myEntry.status==='Processing'
              ? <p className="text-green-700 font-black text-xl">🎉 It's your turn! Please proceed to the counter.</p>
              : <><p className="text-brand-700 font-bold text-lg">Your number: #{String(myEntry.queue_number).padStart(3,'0')}</p><p className="text-slate-500 text-sm mt-1">{myPos===1?'🎯 You are next!':`${myPos-1} person${myPos>2?'s':''} ahead`}</p></>}
          </div>
        )}

        {isStaff && (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="section-title flex items-center gap-2"><Users size={16} className="text-brand-600"/> Waiting ({waiting.length})</h3>
              <button onClick={fetchQueue} className="btn-ghost text-xs gap-1"><RefreshCw size={12}/> Refresh</button>
            </div>
            {waiting.length === 0 ? <EmptyState icon={CheckCircle} title="Queue is empty" description="All customers have been served."/> : (
              <div className="divide-y divide-slate-50">
                {waiting.map((q,i)=>(
                  <div key={q.queue_id} className={cn('flex items-center gap-4 px-6 py-4 hover:bg-slate-50',i===0&&'bg-yellow-50/50')}>
                    <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center font-display text-xl font-black shrink-0',i===0?'bg-yellow-100 text-yellow-700':'bg-slate-100 text-slate-600')}>
                      {String(q.queue_number).padStart(3,'0')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-800 text-sm">{q.user?.first_name} {q.user?.last_name}{i===0&&<span className="ml-2 text-[10px] text-yellow-600 font-bold bg-yellow-100 px-1.5 py-0.5 rounded">NEXT</span>}</p>
                      {q.user?.id_number && <p className="text-xs font-mono font-bold text-brand-600">{q.user.id_number}</p>}
                      {q.order && (
                        <p className="text-xs text-brand-600 flex items-center gap-1">
                          <Package size={10}/> {q.order.order_number} · {formatCurrency(q.order.total_amount)}
                        </p>
                      )}
                      {q.notes && <p className="text-xs text-slate-400 italic">{q.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {q.order && (
                        <button 
                          onClick={()=>viewOrderDetails(q.order.order_id)} 
                          className="p-1.5 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg"
                          title="View Order"
                        >
                          <Eye size={14}/>
                        </button>
                      )}
                      <span className="text-xs text-slate-400">{q.created_at?new Date(q.created_at).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'}):''}</span>
                      <button onClick={()=>removeEntry(q.queue_id)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><XCircle size={14}/></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100"><h3 className="section-title">Today's Queue Board</h3></div>
          <div className="p-4 grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
            {queue.map(q=>(
              <div key={q.queue_id} className={cn('aspect-square rounded-xl flex items-center justify-center font-display text-lg font-bold border-2 transition-all',
                q.status==='Processing'?'bg-brand-600 text-white border-brand-500 scale-110 shadow-lg':q.status==='Completed'?'bg-slate-100 text-slate-300 border-slate-100':q.user_id===profile.id_number?'bg-yellow-100 text-yellow-700 border-yellow-300':'bg-white text-slate-500 border-slate-100')} title={q.status}>
                {String(q.queue_number).padStart(3,'0')}
              </div>
            ))}
            {queue.length===0 && <p className="col-span-full text-center text-slate-400 text-sm py-8">No queue entries today.</p>}
          </div>
        </div>

        {/* Order Details Modal - Shows when processing queue entry with linked order */}
        {showOrderModal && processingOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowOrderModal(false)}/>
            <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="bg-brand-600 text-white px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg"><Package size={20}/></div>
                  <div>
                    <h3 className="font-bold text-lg">Serving Customer</h3>
                    <p className="text-brand-100 text-sm">Queue #{String(processing?.queue_number || 0).padStart(3,'0')}</p>
                  </div>
                </div>
                <button onClick={()=>setShowOrderModal(false)} className="text-white/80 hover:text-white">✕</button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono font-bold text-brand-700">{processingOrder.order_number}</span>
                    <span className={cn('badge', processingOrder.status==='Ready'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700')}>{processingOrder.status}</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-800">{formatCurrency(processingOrder.total_amount)}</div>
                  <p className="text-sm text-slate-500 mt-1">Customer: {processing?.user?.first_name} {processing?.user?.last_name}</p>
                </div>
                <div className="text-sm text-slate-600">
                  <p className="mb-2">What would you like to do?</p>
                  <ul className="space-y-2 text-xs text-slate-500">
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500"/> View order details to verify items</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500"/> Release order if items are claimed</li>
                    <li className="flex items-center gap-2"><CheckCircle size={12} className="text-green-500"/> Complete without releasing (for inquiries)</li>
                  </ul>
                </div>
              </div>
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                <button onClick={()=>viewOrderDetails(processingOrder.order_id)} className="btn-secondary flex-1 gap-1">
                  <Eye size={14}/> View Order
                </button>
                {processingOrder.status === 'Ready' && (
                  <button 
                    onClick={()=>releaseOrderAndComplete(processingOrder.order_id)} 
                    disabled={acting}
                    className="btn-primary flex-1 gap-1 bg-green-600 hover:bg-green-700"
                  >
                    {acting?<Loader2 size={14} className="animate-spin"/>:<CheckCircle size={14}/>}
                    Release & Done
                  </button>
                )}
                <button 
                  onClick={completeCurrent} 
                  disabled={acting}
                  className="btn-primary flex-1 gap-1"
                >
                  {acting?<Loader2 size={14} className="animate-spin"/>:<CheckCircle size={14}/>}
                  Just Complete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Next Prompt Modal - Shows after completing a queue entry */}
        {showNextPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={()=>setShowNextPrompt(false)}/>
            <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600"/>
              </div>
              <h3 className="font-bold text-xl text-slate-800 mb-2">Customer Served!</h3>
              <p className="text-slate-500 mb-6">
                {waiting.length > 0 
                  ? `There ${waiting.length === 1 ? 'is' : 'are'} ${waiting.length} more customer${waiting.length === 1 ? '' : 's'} waiting.`
                  : 'No more customers in queue.'
                }
              </p>
              <div className="flex gap-3">
                <button onClick={()=>setShowNextPrompt(false)} className="btn-secondary flex-1">
                  Stay Here
                </button>
                {waiting.length > 0 && (
                  <button 
                    onClick={handleCallNextFromPrompt} 
                    disabled={acting}
                    className="btn-primary flex-1 gap-1"
                  >
                    {acting?<Loader2 size={14} className="animate-spin"/>:<PlayCircle size={14}/>}
                    Call Next #{String(waiting[0]?.queue_number || 0).padStart(3,'0')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
