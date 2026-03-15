# 🔴 How to Enable Realtime Updates in BookSmart

BookSmart uses **Supabase Realtime** so every page — queue board, 
orders, payments, inventory — updates **live** without users 
ever needing to refresh the browser.

---

## Step 1 — Run the SQL script

In your Supabase Dashboard:
1. Go to **SQL Editor**
2. Open `supabase/enable_realtime.sql` from this project
3. Click **Run**

This adds all BookSmart tables to Supabase's realtime publication.

---

## Step 2 — Verify in Supabase Dashboard

1. Go to **Database → Replication**
2. Click on **supabase_realtime** 
3. Under "Source", confirm you see:
   - `queues`
   - `orders`
   - `order_items`
   - `payments`
   - `appointments`
   - `notifications`
   - `bookstore_items`
   - `job_orders`
   - `feedback`

---

## Step 3 — That's it! ✅

No code changes needed. The app already uses `useRealtime()` 
everywhere. As soon as the tables are published, all pages 
auto-update.

---

## How it works (Technical)

```
lib/useRealtime.js
  ↓
  supabase.channel('...').on('postgres_changes', ...)
  ↓
  Every INSERT / UPDATE / DELETE on watched tables
  ↓
  Calls onRefresh() to re-fetch latest data
  ↓
  React state updates → UI re-renders
  ↓
  User sees changes instantly ✨
```

### What each page listens to:

| Page | Tables Watched |
|------|---------------|
| Queue (staff & shop) | `queues` |
| Dashboard | `orders`, `queues`, `appointments`, `payments`, `job_orders` |
| Orders | `orders`, `order_items` |
| Payments | `payments`, `orders` |
| Appointments | `appointments`, `appointment_slots` |
| Inventory | `bookstore_items`, `inventory_logs` |
| Notifications | `notifications` |

### Sound alerts
The Queue page plays a chime using the Web Audio API whenever 
the "Now Serving" number changes. Staff can toggle this with 
the 🔊 button.

---

## Troubleshooting

**Changes not showing in real-time?**
- Check that `enable_realtime.sql` was run successfully
- In Supabase → Database → Replication, verify the tables are listed
- Check browser console for Supabase channel subscription errors
- Make sure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct

**"Could not subscribe to channel" error?**
- Your Supabase project may have the Realtime service paused
- Go to Supabase Dashboard → Settings → Realtime and ensure it's enabled

