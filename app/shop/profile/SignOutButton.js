'use client'
import { createClient } from '@/lib/db/client'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'

export default function SignOutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <button 
      onClick={handleSignOut}
      className="w-full flex items-center justify-center gap-2 p-3 text-red-500 hover:bg-red-50 rounded-lg transition-colors font-bold text-sm"
    >
      <LogOut size={18} />
      Sign Out
    </button>
  )
}
