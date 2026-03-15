'use client'
import { useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

/**
 * useRealtime — Subscribe to one or more Supabase table changes and
 * call onRefresh when any event fires.
 *
 * Usage:
 *   useRealtime({ tables: ['queues', 'orders'], onRefresh: fetchData })
 *   useRealtime({ tables: [{ table:'queues', filter:`queue_date=eq.${today}` }], onRefresh: fetch })
 */
export function useRealtime({ tables = [], onRefresh, enabled = true }) {
  const supabase = createClient()
  const refreshRef = useRef(onRefresh)
  refreshRef.current = onRefresh

  useEffect(() => {
    if (!enabled || tables.length === 0) return

    const channel = supabase.channel(`realtime_${tables.map(t => typeof t === 'string' ? t : t.table).join('_')}_${Math.random().toString(36).slice(2, 7)}`)

    tables.forEach(entry => {
      const table  = typeof entry === 'string' ? entry : entry.table
      const filter = typeof entry === 'string' ? undefined : entry.filter
      const event  = typeof entry === 'string' ? '*' : (entry.event || '*')

      const config = { event, schema: 'public', table }
      if (filter) config.filter = filter

      channel.on('postgres_changes', config, () => {
        refreshRef.current?.()
      })
    })

    channel.subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [enabled, JSON.stringify(tables)])
}

/**
 * usePresence — Show who is online on a given page/channel.
 * Returns { onlineCount }
 */
export function usePresence(channelName, userId) {
  const supabase = createClient()

  useEffect(() => {
    if (!userId) return
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userId } }
    })
    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ user_id: userId, online_at: new Date().toISOString() })
      }
    })
    return () => { supabase.removeChannel(channel) }
  }, [channelName, userId])
}
