# 🔄 Live Updates in MySQL Mode

In `caps-mysql`, updates are implemented with **polling** instead of Supabase Realtime.
Pages auto-refresh data at a short interval so users still see updated queue, orders,
payments, inventory, and notifications without manually reloading.

---

## How It Works

`lib/useRealtime.js` runs an interval timer and triggers each page's `onRefresh` callback.

```txt
setInterval()
  ↓
onRefresh()
  ↓
fetch latest rows from MySQL
  ↓
UI state updates
```

---

## Default Behavior

- Polling runs every few seconds while the page is active.
- Existing page-level refresh functions are reused.
- Queue sound alerts still work when "Now Serving" changes.

---

## Troubleshooting

**Data is not updating**
- Confirm MySQL is running in XAMPP.
- Confirm `.env.local` DB values match your XAMPP credentials.
- Check browser console/network for failed `/api/mysql/query` calls.

**Auth/session issues**
- Confirm `AUTH_JWT_SECRET` is set in `.env.local`.
- Clear cookies and sign in again if session is stale.

