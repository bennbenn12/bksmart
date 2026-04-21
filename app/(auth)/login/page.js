'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/db/client'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function LoginPage() {
  const [form, setForm] = useState({ email:'', password:'' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault(); setLoading(true); setError('')
    const { data: { user }, error: err } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password })
    
    if (err) { 
      setError(err.message); 
      setLoading(false)
      return
    }

    if (user) {
      // Check role
      const { data: profile } = await supabase
        .from('users')
        .select('role_type')
        .eq('auth_id', user.id)
        .single()
      
      if (profile?.role_type === 'student' || profile?.role_type === 'parent') {
        router.push('/shop')
      } else {
        router.push('/dashboard')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/hnu-bg.jpg" 
          alt="Holy Name University" 
          className="w-full h-full object-cover brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-hnu-dark/60 mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
             <img src="/images/booksmart-logo.png" alt="BookSmart" className="h-12 w-auto" />
          </div>
          <h1 className="font-display text-4xl text-white drop-shadow-md">BookSmart</h1>
          <p className="text-white/80 text-sm mt-2 font-light tracking-wide">Holy Name University </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/50">
          <h2 className="font-display text-xl text-hnu-dark mb-6 text-center font-bold">Sign in to your account</h2>

          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="you@hnu.edu.ph"
                value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} required />
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input type={showPw?'text':'password'} className="input pr-10" placeholder="••••••••"
                  value={form.password} onChange={e=>setForm(p=>({...p,password:e.target.value}))} required />
                <button type="button" onClick={()=>setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPw ? <EyeOff size={15}/> : <Eye size={15}/>}
                </button>
              </div>
            </div>
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-brand-600 hover:text-brand-700 font-semibold">Forgot password?</Link>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 text-base">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-slate-500">
            New user? <Link href="/register" className="text-brand-600 font-semibold hover:text-brand-700">Register here</Link>
          </p>
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          © {new Date().getFullYear()} Holy Name University · BookSmart System v1.0
        </p>
      </div>
    </div>
  )
}
