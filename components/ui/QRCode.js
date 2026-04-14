'use client'

import { useEffect, useRef } from 'react'

// Simple QR Code generator using canvas
export default function QRCode({ value, size = 128, level = 'M' }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, size, size)
    
    // Draw border
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.strokeRect(0, 0, size, size)
    
    // Generate a simple pattern based on the value
    // This is a visual placeholder - in production, use a library like qrcode.js
    const seed = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    const cellSize = Math.floor(size / 21)
    const padding = (size - cellSize * 21) / 2
    
    ctx.fillStyle = 'black'
    
    // Position detection patterns (corners)
    const drawPositionPattern = (x, y) => {
      // Outer square
      ctx.fillRect(padding + x * cellSize, padding + y * cellSize, 7 * cellSize, 7 * cellSize)
      // Inner white square
      ctx.fillStyle = 'white'
      ctx.fillRect(padding + (x + 1) * cellSize, padding + (y + 1) * cellSize, 5 * cellSize, 5 * cellSize)
      // Inner black square
      ctx.fillStyle = 'black'
      ctx.fillRect(padding + (x + 2) * cellSize, padding + (y + 2) * cellSize, 3 * cellSize, 3 * cellSize)
    }
    
    drawPositionPattern(0, 0)
    drawPositionPattern(14, 0)
    drawPositionPattern(0, 14)
    
    // Data pattern (randomized based on seed for visual effect)
    const random = (n) => {
      let x = Math.sin(seed + n) * 10000
      return x - Math.floor(x)
    }
    
    for (let row = 0; row < 21; row++) {
      for (let col = 0; col < 21; col++) {
        // Skip position patterns
        if ((row < 7 && col < 7) || (row < 7 && col >= 14) || (row >= 14 && col < 7)) continue
        
        if (random(row * 21 + col) > 0.5) {
          ctx.fillRect(padding + col * cellSize, padding + row * cellSize, cellSize, cellSize)
        }
      }
    }
    
    // Add text label below
    ctx.font = '10px sans-serif'
    ctx.fillStyle = '#64748b'
    ctx.textAlign = 'center'
    ctx.fillText('Scan for details', size / 2, size - 5)
    
  }, [value, size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size + 15}
      className="rounded-lg"
      title={`QR Code for: ${value}`}
    />
  )
}

// Barcode component for order numbers
export function Barcode({ value, height = 60, width = 200 }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!canvasRef.current || !value) return
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    // Clear canvas
    ctx.fillStyle = 'white'
    ctx.fillRect(0, 0, width, height)
    
    // Draw barcode-like pattern
    ctx.fillStyle = 'black'
    const seed = value.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    let x = 10
    
    while (x < width - 10) {
      const barWidth = (Math.sin(seed + x) * 10000 % 3) + 1
      const gap = (Math.cos(seed + x) * 10000 % 2) + 1
      
      if (x + barWidth < width - 10) {
        ctx.fillRect(x, 10, barWidth, height - 30)
      }
      x += barWidth + gap
    }
    
    // Add text
    ctx.font = 'bold 14px monospace'
    ctx.fillStyle = 'black'
    ctx.textAlign = 'center'
    ctx.fillText(value, width / 2, height - 5)
    
  }, [value, height, width])

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded border"
    />
  )
}
