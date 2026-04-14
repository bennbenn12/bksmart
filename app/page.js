import { createClient } from '@/lib/db/server'
import { redirect } from 'next/navigation'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role_type').eq('auth_id', user.id).single()
  const shopRoles = ['student','parent','teacher']
  if (profile && shopRoles.includes(profile.role_type)) redirect('/shop')
  redirect('/dashboard')
}
