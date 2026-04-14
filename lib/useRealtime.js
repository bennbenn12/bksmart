'use client'
import { useEffect, useRef } from 'react'

export function useRealtime({ tables = [], onRefresh, enabled = true }) {
  // Removed automatic polling to prevent flickering and excessive DB calls.
  // The app already has manual/auto refresh hooks where needed.
  useEffect(() => {
    // No-op
  }, [enabled, tables, onRefresh])
}

export function usePresence(channelName, userId) {
  useEffect(() => {}, [channelName, userId])
  return { onlineCount: 1 }
}
