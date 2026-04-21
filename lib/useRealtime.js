'use client'
import { useEffect, useRef, useCallback } from 'react'

// Polling-based realtime for MySQL (replaces Supabase realtime)
export function useRealtime({ tables = [], onRefresh, enabled = true, interval = 10000 }) {
  const intervalRef = useRef(null)
  const isInitialRef = useRef(true)
  const onRefreshRef = useRef(onRefresh)

  // Keep ref updated with latest callback
  useEffect(() => {
    onRefreshRef.current = onRefresh
  }, [onRefresh])

  // Create a stable callback that calls the latest onRefresh
  const stableRefresh = useCallback((...args) => {
    onRefreshRef.current?.(...args)
  }, [])

  useEffect(() => {
    if (!enabled || !onRefreshRef.current) return

    // Initial fetch with loading state
    if (isInitialRef.current) {
      stableRefresh(false) // false = show loading
      isInitialRef.current = false
    }

    // Set up polling interval - increased to 10s to reduce flickering
    intervalRef.current = setInterval(() => {
      stableRefresh(true) // true = silent/background refresh
    }, interval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, interval, stableRefresh])
}

// Stub for presence (not used with MySQL)
export function usePresence(channelName, userId) {
  useEffect(() => {}, [channelName, userId])
  return { onlineCount: 1 }
}
