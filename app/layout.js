import './globals.css'
import './globals/print.css'
import { ToastProvider } from '@/components/providers/ToastProvider'

export const metadata = {
  title: 'BookSmart — HNU Bookstore',
  description: 'Web-Based Queuing, Tracking & Pre-Ordering System for Holy Name University',
  icons: {
    icon: '/images/booksmart-logo.png',
    shortcut: '/images/booksmart-logo.png',
    apple: '/images/booksmart-logo.png',
  }
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
