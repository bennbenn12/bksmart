# 📧 Email Notifications Setup Guide

## ✅ What's Been Implemented

### 1. **Email Service** (`lib/email.js`)
- Nodemailer integration
- Gmail SMTP support
- Ethereal Email for development testing
- HTML and text email templates

### 2. **Email Templates Created**

#### Customer Emails:
1. **Order Created** - Confirmation after placing order
2. **Order Ready** - Items ready for pickup with queue/appointment links
3. **Order Released** - Order completed, thank you + feedback link
4. **Payment Verified** - Payment confirmation
5. **Queue Called** - "It's your turn!" notification
6. **Appointment Reminder** - Reminder for tomorrow's appointment

#### Staff Emails:
- Can be added for: New orders, low stock alerts, etc.

### 3. **Email Triggers** (Where emails are sent)

| Event | Email Sent | Location |
|-------|-----------|----------|
| Order marked Ready | ORDER_READY | Orders page |
| Order Released | ORDER_RELEASED | Orders page |
| Order Cancelled | ORDER_CANCELLED | Orders page |
| Payment Recorded | PAYMENT_VERIFIED | Payments page |
| Queue Number Called | QUEUE_CALLED | Queue page |

---

## 🔧 Setup Instructions

### Step 1: Configure Environment Variables

Add these to your `.env.local` file:

```env
# Email Configuration (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-app-password

# App URL for email links
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Step 2: Gmail App Password Setup

**Option A: Gmail (Recommended for production)**
1. Go to Google Account → Security
2. Enable 2-Factor Authentication
3. Go to "App passwords"
4. Generate app password for "Mail"
5. Copy the 16-character password
6. Paste into `EMAIL_PASSWORD`

**Option B: Ethereal Email (For development)**
```javascript
// For testing without real email
// The system will auto-use ethereal if EMAIL_USER is not set
```

### Step 3: Test Email Configuration

Create a simple test route or add to a page:

```javascript
import { verifyEmailConfig, sendTestEmail } from '@/lib/email'

// Test connection
const isWorking = await verifyEmailConfig()
console.log('Email service:', isWorking ? '✅ Ready' : '❌ Not configured')
```

---

## 📧 Email Template Examples

### 1. Order Ready Email
```
Subject: 🎉 Order #123 Ready for Pickup!

Hi [Name],

Your order is ready for pickup!

Order #: 123
Total: ₱500.00

Pickup Options:
- Join the queue at the Bookstore
- Book a pickup appointment

[Join Queue Button] [Book Appointment Button]
```

### 2. Payment Verified Email
```
Subject: 💳 Payment Verified - Order #123

Hi [Name],

Your payment has been verified and we're preparing your order.

Order #: 123
Amount Paid: ₱500.00
Status: Processing

We'll notify you when your order is ready for pickup.
```

### 3. Queue Called Email
```
Subject: 🎉 It's Your Turn! Queue #042

Hi [Name],

Please proceed to the Bookstore counter now!

Your Queue Number: #042

Don't forget to bring your ID!
```

---

## 🎨 Email Features

### Visual Design
- **Responsive HTML emails** - Look good on mobile and desktop
- **Brand colors** - Uses BookSmart branding
- **Clear CTAs** - Buttons for actions
- **Order details** - Shows order number, amount, status

### Fallback Text
- Plain text version included for email clients that don't support HTML
- Same information, just simpler formatting

---

## 🔍 Troubleshooting

### Common Issues:

**1. Emails not sending**
- Check `.env.local` has correct credentials
- Verify `verifyEmailConfig()` returns true
- Check server logs for errors

**2. Gmail blocking emails**
- Use App Password (not regular password)
- Enable "Less secure app access" (not recommended) OR use App Password
- Check spam folder

**3. Links in emails not working**
- Make sure `NEXT_PUBLIC_APP_URL` is set correctly
- Use full URLs (https://domain.com/page)

### Testing:

**Development Mode:**
```bash
# For testing without real email
# The system uses Ethereal Email automatically
# Check console for preview URL
```

**Production Mode:**
- Set real email credentials
- Test with real email addresses
- Monitor email delivery

---

## 📊 Email Events Log

Emails are sent for these events:

### Customer Notifications:
- ✅ Order placed → Email confirmation
- ✅ Order ready → Ready for pickup
- ✅ Order released → Completed
- ✅ Payment verified → Receipt
- ✅ Queue called → It's your turn
- ⏰ Appointment reminder → Tomorrow (can be scheduled)

### Staff Notifications:
- 📝 New order received (to be implemented if needed)
- 📝 Low stock alert (to be implemented if needed)

---

## 🚀 Next Steps

1. **Configure email credentials** in `.env.local`
2. **Test each email type** by triggering the events
3. **Monitor email delivery** in production
4. **Optional**: Add more templates as needed

---

## 📱 Queue Display Screen

### Concept Overview

The Queue Display Screen is a **TV/Monitor display** for the Bookstore waiting area that shows:

#### What It Shows:
1. **NOW SERVING** - Large 3-digit number (200px+ font)
2. **WAITING LIST** - Next 5-8 queue numbers
3. **RECENTLY SERVED** - Last 2-3 completed numbers
4. **Time & Stats** - Current time, customers served today

#### Key Features:
- ✅ **Real-time updates** - Changes instantly when staff calls next number
- ✅ **High contrast** - Visible from across the room
- ✅ **Voice announcements** - "Now serving queue number 042"
- ✅ **Auto-rotation** - Shows promotions/stats periodically
- ✅ **QR Code** - Customers can scan to join queue or check status

#### Technical Details:
- **Route**: `/display/queue`
- **Hardware**: Any TV + Mini PC (Raspberry Pi works)
- **Browser**: Chrome in kiosk mode
- **Updates**: Supabase Realtime (instant)

#### Benefits:
- Reduces counter congestion
- No more "Is it my turn?" questions
- Professional, modern appearance
- Customers can wait comfortably

#### Document:
See `QUEUE_DISPLAY_SCREEN.md` for full concept, design mockups, and implementation plan.

---

## Summary

✅ **Email notifications** - Fully implemented with Nodemailer
✅ **6 email templates** - Order, Payment, Queue, Appointments
✅ **Auto-triggers** - Sent automatically on status changes
📺 **Queue Display** - Concept documented, ready for implementation

---

## Need Help?

1. Check environment variables are set
2. Verify email credentials work
3. Test with Ethereal Email first (development)
4. Check server logs for errors
