import { AuthProvider } from '@/components/providers/AuthProvider'
import Sidebar from '@/components/layout/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }) {
  const supabase = await createClient()

  // getUser() is the secure server-side check — necessary here.
  // Middleware already blocked unauthenticated users so this is fast (session is warm).
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch only role_id — minimum data needed for redirect decision
  const { data: profile } = await supabase
    .from('users')
    .select('role_id')
    .eq('auth_id', user.id)
    .single()

  const shopRoles = ['student', 'parent', 'teacher']
  if (profile && shopRoles.includes(profile.role_id)) {
    redirect('/shop')
  }

  return (
    <AuthProvider>
      <div className="flex h-screen overflow-hidden bg-slate-50">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </AuthProvider>
  )
}