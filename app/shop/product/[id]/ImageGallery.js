'use client'
import { useState } from 'react'

export default function ImageGallery({ images, name }) {
  const [active, setActive] = useState(0)

  if (!images || images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-slate-300 w-full h-full min-h-[300px]">
        <span className="text-6xl mb-4">📖</span>
        <span className="text-sm uppercase tracking-widest">No Image Available</span>
      </div>
    )
  }

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="relative w-full aspect-square bg-slate-50 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-100">
        <img 
          src={images[active]} 
          alt={name} 
          className="max-w-full max-h-full object-contain mix-blend-multiply transition-opacity duration-300"
        />
      </div>
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, idx) => (
            <button 
              key={idx} 
              onClick={() => setActive(idx)}
              className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${active === idx ? 'border-brand-500 shadow-md' : 'border-slate-200 opacity-60 hover:opacity-100'}`}
            >
              <img src={img} className="w-full h-full object-cover mix-blend-multiply bg-slate-50" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
