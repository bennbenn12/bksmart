'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/db/client'
import { useAuth } from '@/components/providers/AuthProvider'
import { Star, Send, User, Loader2 } from 'lucide-react'
import { formatDateTime, cn } from '@/lib/utils'

export default function ProductReviews({ itemId }) {
  const { profile } = useAuth()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchReviews()
  }, [itemId])

  async function fetchReviews() {
    const { data } = await supabase
      .from('feedback')
      .select('*, user:user_id(first_name, last_name, role_type)')
      .eq('item_id', itemId)
      .order('created_at', { ascending: false })
      .limit(50)
    
    setReviews(data || [])
    setLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!profile || !rating) return

    setSubmitting(true)
    const { error } = await supabase.from('feedback').insert({
      item_id: itemId,
      user_id: profile.id_number,
      rating,
      content: comment,
      // order_id is optional here, we're reviewing the item directly
    })

    if (!error) {
      setComment('')
      setRating(0)
      fetchReviews()
    }
    setSubmitting(false)
  }

  const averageRating = reviews.length 
    ? (reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1) 
    : 0

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mt-8">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">Reviews & Comments</h2>
      
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="flex-1">
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-bold text-slate-900">{averageRating}</span>
            <span className="text-slate-500">out of 5</span>
          </div>
          <div className="flex text-yellow-400 mb-2">
            {[1,2,3,4,5].map(s => (
              <Star key={s} size={20} fill={s <= Math.round(averageRating) ? "currentColor" : "none"} />
            ))}
          </div>
          <p className="text-sm text-slate-500">{reviews.length} reviews</p>
        </div>

        {profile && (
          <div className="flex-[2] bg-slate-50 p-4 rounded-xl">
            <h3 className="font-medium text-slate-800 mb-2">Write a Review</h3>
            <form onSubmit={handleSubmit}>
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <button 
                    key={s} 
                    type="button"
                    onClick={() => setRating(s)}
                    className={cn("transition-colors", rating >= s ? "text-yellow-400" : "text-slate-300")}
                  >
                    <Star size={24} fill="currentColor" />
                  </button>
                ))}
              </div>
              <textarea 
                className="w-full p-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-hnu-gold/50 text-sm mb-2"
                rows={3}
                placeholder="Share your thoughts about this product..."
                value={comment}
                onChange={e => setComment(e.target.value)}
                required
              />
              <button 
                type="submit" 
                disabled={submitting || !rating}
                className="btn-primary text-xs px-4 py-2 flex items-center gap-2 ml-auto"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Post Review
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="space-y-6 divide-y divide-slate-50">
        {loading ? (
          <div className="text-center py-8 text-slate-400">Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No reviews yet. Be the first to review!</div>
        ) : (
          reviews.map(review => (
            <div key={review.feedback_id} className="pt-6 first:pt-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center font-bold text-xs">
                    {review.user?.first_name?.[0] || <User size={14} />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {review.user?.first_name} {review.user?.last_name}
                      <span className="text-xs font-normal text-slate-400 ml-2 capitalize">
                        ({review.user?.role_type?.replace('_', ' ')})
                      </span>
                    </p>
                    <div className="flex text-yellow-400">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} size={12} fill={s <= review.rating ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>
                </div>
                <span className="text-xs text-slate-400">{formatDateTime(review.created_at)}</span>
              </div>
              <p className="text-slate-600 text-sm leading-relaxed pl-10">{review.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
