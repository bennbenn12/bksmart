'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Eye, EyeOff, CheckCircle2, ShieldCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const [error, setError]         = useState('')
  const [sessionReady, setReady]  = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Supabase sends the user here with a token in the URL hash.
  // onAuthStateChange picks it up automatically and creates a session.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // Strength check
  const strength = (() => {
    if (!password) return null
    let score = 0
    if (password.length >= 8)                          score++
    if (/[A-Z]/.test(password))                        score++
    if (/[0-9]/.test(password))                        score++
    if (/[^A-Za-z0-9]/.test(password))                score++
    return score
  })()

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength] ?? ''
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'][strength] ?? ''
  const strengthText  = ['', 'text-red-500', 'text-yellow-600', 'text-blue-600', 'text-green-600'][strength] ?? ''

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)

    // Redirect after 2.5 s
    setTimeout(() => router.push('/login'), 2500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src="/images/hnu-bg.jpg"
          alt="Holy Name University"
          className="w-full h-full object-cover brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-hnu-dark/60 mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
            <img src="/images/booksmart-logo.png" alt="BookSmart" className="h-12 w-auto" />
          </div>
          <h1 className="font-display text-4xl text-white drop-shadow-md">BookSmart</h1>
          <p className="text-white/80 text-sm mt-2 font-light tracking-wide">Holy Name University · Finance Office</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/50">

          {success ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl text-hnu-dark font-bold">Password updated!</h2>
              <p className="text-sm text-slate-500">Your password has been changed successfully. Redirecting you to sign in…</p>
              <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
            </div>

          ) : !sessionReady ? (
            /* ── Waiting for Supabase PASSWORD_RECOVERY event ── */
            <div className="text-center space-y-4">
              <div className="w-14 h-14 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
                <ShieldCheck size={28} className="text-brand-600" />
              </div>
              <h2 className="font-display text-xl text-hnu-dark font-bold">Reset your password</h2>
              <p className="text-sm text-slate-500">
                Verifying your reset link… If this page doesn't load in a few seconds,{' '}
                <Link href="/forgot-password" className="text-brand-600 font-semibold underline">
                  request a new link
                </Link>.
              </p>
              <div className="w-6 h-6 border-2 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto" />
            </div>

          ) : (
            /* ── New password form ── */
            <>
              <div className="mb-6 text-center">
                <div className="w-12 h-12 bg-brand-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck size={22} className="text-brand-600" />
                </div>
                <h2 className="font-display text-xl text-hnu-dark font-bold">Set a new password</h2>
                <p className="text-sm text-slate-500 mt-1">Choose a strong password for your account.</p>
              </div>

              {error && (
                <div className="mb-4 flex items-start gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* New password */}
                <div>
                  <label className="label">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      className="input pr-10"
                      placeholder="Minimum 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {password && (
                    <div className="mt-2 space-y-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map(i => (
                          <div
                            key={i}
                            className={`h-1.5 flex-1 rounded-full transition-all ${
                              i <= strength ? strengthColor : 'bg-slate-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className={`text-xs font-semibold ${strengthText}`}>{strengthLabel}</p>
                    </div>
                  )}
                </div>

                {/* Confirm password */}
                <div>
                  <label className="label">Confirm New Password</label>
                  <div className="relative">
                    <input
                      type={showCf ? 'text' : 'password'}
                      className={`input pr-10 ${
                        confirm && confirm !== password
                          ? 'border-red-300 focus:border-red-400 focus:ring-red-100'
                          : confirm && confirm === password
                          ? 'border-green-300 focus:border-green-400 focus:ring-green-100'
                          : ''
                      }`}
                      placeholder="Re-enter your password"
                      value={confirm}
                      onChange={e => setConfirm(e.target.value)}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCf(s => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 mt-1">Passwords don't match.</p>
                  )}
                  {confirm && confirm === password && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      <CheckCircle2 size={11} /> Passwords match
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !password || !confirm}
                  className="btn-primary w-full justify-center py-2.5 text-base mt-2"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Updating…</>
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/60 text-xs mt-6">
          © {new Date().getFullYear()} Holy Name University · BookSmart System v2.0
        </p>
      </div>
    </div>
  )
}