import './globals.css'
import { ToastProvider } from '@/components/providers/ToastProvider'

export const metadata = {
  title: 'BookSmart — HNU Finance Office',
  description: 'Web-Based Queuing, Tracking & Pre-Ordering System for Holy Name University'
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
