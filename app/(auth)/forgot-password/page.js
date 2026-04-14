'use client'
import { useState } from 'react'
import { createClient } from '@/lib/db/client'
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)
  const [error, setError]     = useState('')
  const supabase = createClient()

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/reset-password`,
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    setSent(true)
    setLoading(false)
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
          {sent ? (
            /* ── Success state ── */
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-green-600" />
              </div>
              <h2 className="font-display text-xl text-hnu-dark font-bold">Check your email</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                We sent a password reset link to{' '}
                <span className="font-semibold text-slate-700">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <p className="text-xs text-slate-400">
                Didn't receive it? Check your spam folder, or{' '}
                <button
                  onClick={() => setSent(false)}
                  className="text-brand-600 hover:text-brand-700 font-semibold underline"
                >
                  try again
                </button>.
              </p>
              <Link href="/login" className="btn-primary w-full justify-center mt-2">
                Back to Sign In
              </Link>
            </div>
          ) : (
            /* ── Form state ── */
            <>
              <div className="mb-6">
                <h2 className="font-display text-xl text-hnu-dark font-bold text-center">Forgot your password?</h2>
                <p className="text-sm text-slate-500 text-center mt-2">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="label">Email Address</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      className="input pl-9"
                      placeholder="you@hnu.edu.ph"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-2.5 text-base"
                >
                  {loading ? (
                    <><Loader2 size={16} className="animate-spin" /> Sending…</>
                  ) : (
                    'Send Reset Link'
                  )}
                </button>
              </form>

              <div className="mt-5 text-center">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium transition-colors"
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </Link>
              </div>
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