'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) { setUser(session.user); await fetchProfile(session.user.id) }
      else { setUser(null); setProfile(null) }
      setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(authId) {
    const { data } = await supabase.from('users').select('*').eq('auth_id', authId).single()
    setProfile(data)
  }

  async function signOut() { await supabase.auth.signOut(); router.push('/login') }

  return (
    <Ctx.Provider value={{ user, profile, loading, signOut, refreshProfile: () => fetchProfile(user?.id) }}>
      {children}
    </Ctx.Provider>
  )
}

export const useAuth = () => { const c = useContext(Ctx); if (!c) throw new Error('useAuth outside AuthProvider'); return c }
