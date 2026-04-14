'use client'
import { createContext, useContext, useEffect, useState } from 'react'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [isOpen, setIsOpen] = useState(false)

  // Load cart from local storage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('booksmart-cart')
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Failed to parse cart', e)
      }
    }
  }, [])

  // Save cart to local storage whenever it changes
  useEffect(() => {
    localStorage.setItem('booksmart-cart', JSON.stringify(cart))
  }, [cart])

  const cartKey = (item) => item.selectedSize ? `${item.item_id}_${item.selectedSize}` : item.item_id

  const addToCart = (product, quantity = 1) => {
    setCart(prev => {
      const key = cartKey(product)
      const existing = prev.find(item => cartKey(item) === key)
      if (existing) {
        return prev.map(item => 
          cartKey(item) === key
            ? { ...item, quantity: item.quantity + quantity }
            : item
        )
      }
      return [...prev, { ...product, quantity }]
    })
  }

  const removeFromCart = (key) => {
    setCart(prev => prev.filter(item => cartKey(item) !== key))
  }

  const updateQuantity = (key, quantity) => {
    if (quantity < 1) return
    setCart(prev => prev.map(item => 
      cartKey(item) === key ? { ...item, quantity } : item
    ))
  }

  const clearCart = () => setCart([])

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0)
  const cartTotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0)

  return (
    <CartContext.Provider value={{ 
      cart, 
      cartKey,
      addToCart, 
      removeFromCart, 
      updateQuantity, 
      clearCart, 
      cartCount,
      cartTotal,
      isOpen,
      setIsOpen
    }}>
      {children}
    </CartContext.Provider>
  )
}

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}
