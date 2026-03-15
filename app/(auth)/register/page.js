'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Loader2, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const SELF_ROLES = [
  { value: 'student', label: 'Student' },
  { value: 'parent', label: 'Parent' },
  { value: 'teacher', label: 'Teacher' }
]

export default function RegisterPage() {
  const [form, setForm] = useState({ 
    first_name:'', last_name:'', email:'', password:'', 
    role: 'student', student_id: '', contact_number: '', department: '' 
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const updateForm = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.first_name,
            last_name: form.last_name,
            role: form.role
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // 2. Create User Profile in public.users table
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            auth_id: authData.user.id,
            email: form.email,
            username: form.email.split('@')[0], // Simple username generation
            first_name: form.first_name,
            last_name: form.last_name,
            role_id: form.role,
            password_hash: 'managed_by_supabase',
            student_id: form.role === 'student' ? form.student_id : null,
            contact_number: form.contact_number || null,
            department: form.role === 'teacher' ? form.department : null,
            status: 'Active'
          })

        if (profileError) {
          // If profile creation fails, we might want to cleanup auth user or show specific error
          console.error('Profile creation failed:', profileError)
          throw new Error('Failed to create user profile. ' + profileError.message)
        }

        setSuccess(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
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

        <div className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/50 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600">
            <CheckCircle size={40} />
          </div>
          <h2 className="font-display text-2xl text-hnu-dark font-bold mb-2">Account Created!</h2>
          <p className="text-slate-600 mb-8">
            Your account has been successfully created. You can now sign in to BookSmart.
          </p>
          <Link href="/login" className="btn-primary justify-center w-full py-3 text-base">
            Sign In Now
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden py-12">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/images/hnu-bg.jpg" 
          alt="Holy Name University" 
          className="w-full h-full object-cover brightness-[0.4]"
        />
        <div className="absolute inset-0 bg-hnu-dark/60 mix-blend-multiply" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 mb-4 shadow-lg">
             <img src="/images/booksmart-logo.png" alt="BookSmart" className="h-12 w-auto" />
          </div>
          <h1 className="font-display text-3xl text-white drop-shadow-md">Create Account</h1>
          <p className="text-white/80 text-sm mt-2 font-light tracking-wide">Join BookSmart today</p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-8 border border-white/50">
          {error && (
            <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700 flex items-start gap-2">
              <span className="font-bold">Error:</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">First Name</label>
                <input 
                  className="input" 
                  value={form.first_name} 
                  onChange={e => updateForm('first_name', e.target.value)} 
                  required 
                  placeholder="Juan"
                />
              </div>
              <div>
                <label className="label">Last Name</label>
                <input 
                  className="input" 
                  value={form.last_name} 
                  onChange={e => updateForm('last_name', e.target.value)} 
                  required 
                  placeholder="Dela Cruz"
                />
              </div>
            </div>

            <div>
              <label className="label">Email Address</label>
              <input 
                type="email" 
                className="input" 
                value={form.email} 
                onChange={e => updateForm('email', e.target.value)} 
                required 
                placeholder="you@hnu.edu.ph"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input 
                type="password" 
                className="input" 
                value={form.password} 
                onChange={e => updateForm('password', e.target.value)} 
                required 
                minLength={6}
                placeholder="••••••••"
              />
              <p className="text-[10px] text-slate-400 mt-1">Must be at least 6 characters</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">I am a...</label>
                <select 
                  className="input" 
                  value={form.role} 
                  onChange={e => updateForm('role', e.target.value)}
                >
                  {SELF_ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="label">Mobile Number</label>
                <input 
                  className="input" 
                  value={form.contact_number} 
                  onChange={e => updateForm('contact_number', e.target.value)} 
                  placeholder="0912 345 6789"
                />
              </div>
            </div>

            {/* Role Specific Fields */}
            {form.role === 'student' && (
              <div className="animate-fade-in">
                <label className="label">Student ID Number</label>
                <input 
                  className="input" 
                  value={form.student_id} 
                  onChange={e => updateForm('student_id', e.target.value)} 
                  placeholder="e.g. 2023-12345"
                  required
                />
              </div>
            )}

            {form.role === 'teacher' && (
              <div className="animate-fade-in">
                <label className="label">Department / College</label>
                <input 
                  className="input" 
                  value={form.department} 
                  onChange={e => updateForm('department', e.target.value)} 
                  placeholder="e.g. College of Nursing"
                  required
                />
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading} 
              className="btn-primary w-full justify-center py-3 text-base font-bold shadow-lg shadow-brand-500/20 mt-2"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating Account...
                </>
              ) : (
                <>
                  Create Account <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account? <Link href="/login" className="text-brand-600 font-bold hover:text-brand-700 hover:underline">Sign in</Link>
          </p>
        </div>
        
        <p className="text-center text-white/40 text-xs mt-8">
          © {new Date().getFullYear()} Holy Name University · BookSmart System
        </p>
      </div>
    </div>
  )
}
