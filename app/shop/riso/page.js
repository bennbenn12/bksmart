import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'
import RisoForm from './RisoForm'

export default async function RisoPage() {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }
  
  // Check role - TEACHER ONLY
  const { data: profile } = await supabase
    .from('users')
    .select('role_type, first_name, last_name')
    .eq('auth_id', user.id)
    .single()
  
  const isTeacher = profile?.role_type === 'teacher'
  
  // Non-teachers see access denied
  if (!isTeacher) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-4xl">🔒</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Access Restricted</h1>
        <p className="text-slate-500 mb-6">
          RISO Printing Services are available for <strong>HNU Faculty and Staff only</strong>.
        </p>
        <a href="/shop" className="btn-secondary inline-block">
          Back to Shop
        </a>
      </div>
    )
  }
  
  // Teachers see the RISO form
  return (
    <div className="max-w-3xl mx-auto py-6">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-display font-bold text-hnu-dark mb-1">RISOGRAPH JOB ORDER</h1>
        <p className="text-slate-500 text-sm">Fill in the digital form below</p>
      </div>
      
      <RisoForm />
    </div>
  )
}
