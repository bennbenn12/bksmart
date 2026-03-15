# 📚 BookSmart v2.0
### Web-Based Queuing, Tracking & Pre-Ordering System
**Holy Name University — Finance Office**

> Built from Chapter III Methodology — aligned with all File Structure tables, Activity Diagrams, and Program Hierarchy.

---

## 🚀 Setup

### 1. Install
```bash
npm install
```

### 2. Create Supabase Project
1. Go to [supabase.com](https://supabase.com) → New Project
2. SQL Editor → paste **entire** `supabase/schema.sql` → Run

### 3. Configure
```bash
cp .env.local.example .env.local
```
Fill in from Supabase Settings → API:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 4. Run
```bash
npm run dev   # http://localhost:3000
```

---

## 👤 Roles & Access (Chapter III — 3.2.3 Program Hierarchy)

| Role | Level | Key Access |
|------|-------|-----------|
| `bookstore_manager` | Administrator | ALL modules including Accounts & Reports |
| `bookstore_staff` | Staff | Orders, Payments, Inventory, Queue, Job Orders (audit) |
| `working_student` | Limited Staff | Queue, Inventory (view/restock), Orders |
| `teacher` | Teacher | Job Orders (create own), Feedback |
| `student` | Student | Orders (own), Appointments, Queue, Feedback |
| `parent` | Parent | Orders (own), Appointments, Queue, Feedback |

---

## 📦 Modules (Chapter III — 3.1 Analysis)

### 1. Dashboard `/dashboard`
- Role-aware stats cards
- Live queue board display
- Quick action shortcuts
- Recent orders table

### 2. Manage Accounts `/accounts`
*(Bookstore Manager only)*
- CRUD on Users table (Table 1)
- Fields: user_id, role_id, username, first_name, last_name, email, contact_number, status
- Toggle Active/Inactive per user

### 3. Manage Queue `/queue` ✨ NEW
*(Table 7: Queues — queue_id, user_id, queue_number, status: Waiting/Processing/Completed)*
- Real-time queue board with live number display
- "Now Serving" large display panel
- Call Next / Complete actions for staff
- Students can join queue, link to orders
- Auto-assigned queue numbers per day via trigger
- Supabase Realtime updates

### 4. Manage Appointments `/appointments`
*(Table 6: Appointments — Confirmed/Completed/Rescheduled)*
- Book slots with time picker
- Reschedule to new slot
- Staff marks Completed
- Slot capacity management
- OR number + order linking

### 5. Manage Bookstore Orders `/orders`
*(Table 3: Orders — Pending→Ready→Released→Cancelled)*
*(Table 10: Order_Items — bridge table)*
- Digital Order Slip builder (browse bookstore_items)
- ISO flow: Pending → Ready → Released
- Transaction ID field for physical OR verification
- Below ₱100 note / ₱100+ teller reminder

### 6. Manage Job Orders `/job-orders`
*(Table 5: Job_Orders — department_account, Pending_Audit→Approved→Completed)*
- Teachers submit job orders to dept. accounts
- Staff audits → Approves → Processes
- Full audit trail with timestamps

### 7. Manage Payments `/payments`
*(Table 4: Payments — payment_source: Bookstore/Teller, or_number)*
- **Bookstore** source: below ₱100 (direct)
- **Teller** source: ₱100+ requires OR number
- OR verification flow → marks order Ready
- Payment rule banner on page

### 8. Manage Inventory `/inventory`
*(Table 2: Bookstore_Items — name, description, price, stock_quantity, reserved_quantity)*
- Real-time stock for Bookstore, Souvenir_Shop, Riso
- stock_quantity & reserved_quantity tracking (Table 2 exact fields)
- Restock modal with inventory_logs audit trail
- Low stock alerts with visual progress bars

### 9. Feedback `/feedback` ✨ NEW
*(Table 9: Feedback — user_id, order_id, content)*
- 5-star rating system
- Link to Released orders
- Manager view with aggregate rating chart
- All users can submit

### 10. Reports `/reports`
*(Manager only)*
- Daily revenue line chart
- Orders by status pie chart
- Stock by shop bar chart
- Job orders by department
- Payment source Bookstore vs Teller pie
- Low stock alert table

---

## 🗄️ Database Tables (Chapter III — 3.2.2 File Structure)

| # | Table | Key Fields |
|---|-------|-----------|
| 1 | `users` | user_id, role_id, username, first_name, last_name, email, contact_number, status |
| 2 | `bookstore_items` | item_id, name, description, price, stock_quantity, reserved_quantity |
| 3 | `orders` | order_id, user_id, transaction_id, total_amount, status (Pending/Ready/Released/Cancelled) |
| 4 | `payments` | payment_id, order_id, amount, payment_source (Bookstore/Teller), or_number, date_paid |
| 5 | `job_orders` | job_id, order_id, requester_id, department_account, description |
| 6 | `appointments` | appointment_id, user_id, schedule_date, time_slot, status (Confirmed/Completed/Rescheduled) |
| 7 | `queues` | queue_id, user_id, queue_number, status (Waiting/Processing/Completed) |
| 8 | `notifications` | notification_id, user_id, message, status (Read/Unread) |
| 9 | `feedback` | feedback_id, user_id, order_id, content |
| 10 | `order_items` | order_item_id, order_id, item_id, quantity |

---

## 📁 Project Structure

```
booksmart/
├── app/
│   ├── (auth)/            # Login, Register
│   ├── (dashboard)/       # Protected pages
│   │   ├── dashboard/
│   │   ├── accounts/      # Manager only
│   │   ├── queue/         # NEW - Table 7
│   │   ├── appointments/  # Table 6
│   │   ├── orders/        # Table 3 + 10
│   │   ├── job-orders/    # Table 5
│   │   ├── payments/      # Table 4
│   │   ├── inventory/     # Table 2
│   │   ├── feedback/      # NEW - Table 9
│   │   └── reports/       # Manager only
├── components/
│   ├── layout/            # Sidebar, Header
│   ├── providers/         # AuthProvider
│   └── ui/                # Shared components
├── lib/
│   ├── supabase/          # client.js, server.js
│   └── utils.js           # Roles, colors, formatters
├── middleware.js           # Auth protection
└── supabase/
    └── schema.sql          # All 10 tables + RLS
```

---

## 🛠 Tech Stack
- **Next.js 14** (App Router)
- **Supabase** (PostgreSQL, Auth, Realtime, RLS)  
- **Tailwind CSS v3**
- **Recharts** (charts)
- **Lucide React** (icons)
- **Playfair Display + Plus Jakarta Sans** (fonts)
