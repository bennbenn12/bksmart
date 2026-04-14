# BookSmart Streamlined Workflow Guide

## Complete User Journey - SHOP (Students/Parents)

### 1. Browse & Order
**Shop Page** → Add items to cart → Checkout → Order Created

**Improvements:**
- [ ] Add "Quick Order" button for common items (uniforms, books)
- [ ] Show stock availability clearly
- [ ] Estimated ready time displayed

### 2. Order Status Tracking
**Orders Page** → Clear status timeline

**Statuses:**
- 🟡 **Pending** - Order received, preparing items
- 🟢 **Ready** - Items ready for pickup
- 🟢 **Released** - Items claimed
- 🔴 **Cancelled** - Order cancelled

**Actions by Status:**
- Pending → Can cancel order
- Ready → Join Queue OR Book Appointment
- Released → Give Feedback

### 3. Pickup Options (When Ready)

#### Option A: Join Queue (Walk-in)
1. Click "Join Queue for Pickup" from orders
2. Order pre-selected
3. Get queue number
4. Wait for number to be called
5. Present ID at counter

#### Option B: Book Appointment (Scheduled)
1. Click "Book Pickup Appointment" from orders
2. Order pre-selected
3. Choose available time slot
4. Get confirmation
5. Arrive at scheduled time

### 4. Complete Workflow
```
Browse Shop → Add to Cart → Checkout → Order Pending → 
Order Ready → Join Queue/Appointment → Pickup → 
Order Released → Give Feedback
```

---

## Complete Staff Journey - DASHBOARD

### 1. Daily Dashboard Overview
**Dashboard Home** shows:
- Today's queue status
- Today's appointments
- Pending orders count
- Unverified payments
- Low stock alerts

### 2. Order Management Workflow

#### New Orders → Ready
```
Dashboard/Orders → Filter: Pending → View Order → 
Mark Ready → Item prepared → Ready for pickup
```

#### Ready Orders → Released (2 paths)

**Path A: With Queue**
```
Dashboard/Queue → Call Next → Order Modal Opens → 
Verify Items → Release Order → Complete Queue → Call Next
```

**Path B: With Payment**
```
Orders Page → Click "Record Payment" → 
Payments Page (pre-selected) → Record Payment → 
Auto-redirect to Orders → Release Order
```

### 3. Appointment Management
```
Dashboard/Appointments → View Today's List → 
See linked orders with items → Confirm/Complete appointments
```

### 4. Payment Recording
```
Orders (Ready & Unpaid) → Record Payment Button → 
Payments Page (auto-filled) → Record → 
Back to Orders → Release Order
```

---

## Key Automated Connections

### Order Status Changes
1. **Pending → Ready**: Staff marks ready
   - Customer gets notification
   - Can now join queue or book appointment

2. **Ready → Released**: Staff releases order
   - Linked appointments auto-completed
   - Linked queue entry auto-completed
   - Customer gets notification

3. **Order Released → Appointment Completed**
   - Auto-completes linked appointments
   - Shows "Item already claimed" message
   - Customer can reschedule if needed

### Queue System
1. **Call Next → Order Modal**
   - If queue entry has linked order → Auto-show order details
   - Staff can: View Order / Release & Done / Just Complete

2. **Complete → Next Prompt**
   - Shows success message
   - Displays waiting count
   - One-click to call next number

### Payment Flow
1. **Record Payment → Auto-redirect**
   - Goes to orders page
   - Highlights the order
   - Shows "Ready to Release" banner
   - One-click release

---

## UI/UX Standards

### Status Colors (Consistent)
- 🟡 Yellow: Pending, Waiting
- 🔵 Blue: Processing, Confirmed
- 🟢 Green: Ready, Completed, Released, Paid
- 🔴 Red: Cancelled, Unpaid, Alert
- 🟣 Purple: Appointments
- 🟠 Orange: Teller payments

### Button Patterns
- **Primary (Blue)**: Main actions (Record, Save, Submit)
- **Secondary (White/Gray)**: Cancel, Back, Close
- **Success (Green)**: Release, Complete, Verify
- **Warning (Orange)**: Record Payment, Reschedule
- **Danger (Red)**: Cancel, Delete, Remove

### Navigation
- **Breadcrumbs**: Shop > Orders > Order Details
- **Back Buttons**: Always on sub-pages
- **Quick Links**: Related actions easily accessible

### Feedback Messages
- Success: Green toast with checkmark
- Error: Red toast with alert
- Info: Blue toast with info icon
- Warning: Yellow toast with warning icon

---

## Page-Specific Improvements

### SHOP SIDE

#### Shop/Home Page
- [ ] Featured/quick order items
- [ ] Search with filters
- [ ] Category navigation
- [ ] Active orders preview

#### Shop/Cart
- [ ] Clear item list with images
- [ ] Quantity adjusters
- [ ] Price breakdown
- [ ] Checkout button prominent

#### Shop/Orders
- [ ] Status timeline view
- [ ] Quick action buttons per order
- [ ] Estimated ready time
- [ ] Direct links to queue/appointments

#### Shop/Queue
- [ ] Current position display
- [ ] Estimated wait time
- [ ] Order pre-selection when joining
- [ ] Notification when called

#### Shop/Appointments
- [ ] Calendar view of slots
- [ ] Order pre-selection
- [ ] Reschedule/Cancel options
- [ ] Reminder notifications

#### Shop/Profile
- [ ] Summary of all activity
- [ ] Quick links to orders/queue/appointments
- [ ] Notification history
- [ ] Account settings

#### Shop/Feedback
- [ ] Average rating display
- [ ] Recent feedback list
- [ ] Star rating input
- [ ] Order selection for feedback

### DASHBOARD SIDE

#### Dashboard/Home
- [ ] Live queue widget
- [ ] Today's appointments widget
- [ ] Quick action grid
- [ ] Alert cards (low stock, pending items)
- [ ] Stats overview

#### Dashboard/Orders
- [ ] Filter tabs: All | Pending | Ready | Released | Cancelled
- [ ] Highlight active order (from payment/queue)
- [ ] Quick actions: Mark Ready | Record Payment | Release
- [ ] Order details modal with all info
- [ ] Linked queue/appointment info

#### Dashboard/Queue
- [ ] Large "Now Serving" display
- [ ] Call Next button
- [ ] Waiting list with order info
- [ ] Auto-show order modal when calling
- [ ] One-click release from modal
- [ ] Next prompt after completion

#### Dashboard/Appointments
- [ ] Today's list with order details
- [ ] Student info with ID
- [ ] Purpose/Items column
- [ ] Confirm/Complete/Reschedule actions
- [ ] Auto-complete when order released

#### Dashboard/Payments
- [ ] Pre-select order from URL param
- [ ] Auto-fill amount and payment source
- [ ] Recent payments list
- [ ] Unverified payments filter
- [ ] Auto-redirect to orders after recording

#### Dashboard/Inventory
- [ ] Stock levels with alerts
- [ ] Low stock warnings on dashboard
- [ ] Quick restock actions
- [ ] Item categories

#### Dashboard/Feedback
- [ ] Average rating card
- [ ] Filter by rating
- [ ] Student info on feedback
- [ ] Related order info

---

## Notification System

### Customer Notifications
1. **Order Ready**: "Your order #123 is ready for pickup!"
2. **Payment Verified**: "Payment confirmed. Staff will prepare your order."
3. **Queue Called**: "It's your turn! Please proceed to the counter."
4. **Appointment Confirmed**: "Your appointment on [date] at [time] is confirmed."
5. **Appointment Reminder**: "Reminder: You have an appointment tomorrow at [time]."
6. **Order Released**: "Your order has been released. Thank you for shopping!"
7. **Order Cancelled**: "Your order was cancelled. Reason: [reason]"

### Staff Notifications
1. **New Order**: "New order #123 received"
2. **New Queue Entry**: "New queue entry #045"
3. **New Appointment**: "New appointment booking from [student]"
4. **Low Stock**: "[Item name] is below reorder level"

---

## Error Handling & Edge Cases

### Common Scenarios
1. **Student tries to release unpaid order** → Show "Record Payment" button
2. **Staff calls queue without linked order** → Show "Just Complete" option
3. **Order cancelled after payment** → Refund workflow (manual)
4. **No available slots for appointments** → Show "Join Queue" suggestion
5. **Item out of stock after order** → Cancel order with reason

### Validation Messages
- "Please select an order"
- "Enter a valid amount"
- "OR number required for Teller payments"
- "Cannot release - no verified payment found"
- "Please select a time slot"

---

## Implementation Checklist

### Critical Path (Must Have)
- [x] Order → Payment pre-selection
- [x] Payment → Orders auto-redirect
- [x] Queue → Order modal auto-show
- [x] Order release → Appointment auto-complete
- [x] Feedback on shop side only
- [x] Order details in appointments list
- [x] Order pre-selection for queue/appointments

### High Priority
- [ ] Dashboard widgets live updates
- [ ] Notification system for all events
- [ ] Mobile-responsive improvements
- [ ] Print-friendly order slips
- [ ] Order search/filter on shop
- [ ] Staff quick actions on dashboard

### Medium Priority
- [ ] Analytics/reports on dashboard
- [ ] Bulk operations (bulk mark ready, bulk release)
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Queue display screen (for TV/monitor)

### Nice to Have
- [ ] Dark mode
- [ ] Keyboard shortcuts
- [ ] Voice notifications for queue
- [ ] Barcode scanning for items
- [ ] QR codes for orders
