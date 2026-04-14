# Database and Data Display Fixes Summary

## Issues Found and Fixed

### 1. Missing Database Tables and Columns ⭐ CRITICAL
The database schema was missing essential tables and columns that the application code expects:

**Missing Tables:**
- `riso_job_items` - Stores RISO printing job items (subjects, masters, copies)
- `riso_queue` - Manages RISO printing queue

**Missing Columns in `job_orders`:**
- `job_type` (ENUM: 'General', 'RISO')
- `cost_center`, `exam_type`, `charge_to`
- `paper_used`, `ink_used`, `masters_used`
- `risographer_id`, `processing_at`, `pickup_notified_at`
- `computed_by`, `computed_at`, `final_approved_by`, `final_approved_at`

**Missing ENUM values:**
- `risographer` role in `users.role_type`
- `Processing` status in `job_orders.status`

### 2. Foreign Key Resolution Bug ⭐ CRITICAL
The Supabase compatibility layer had a bug when resolving nested relations like:
```javascript
.from('orders')
.select('*, order_items(quantity,bookstore_items(name,category))')
```

**The Problem:** When resolving `bookstore_items` inside `order_items`, the code looked for a column named `bookstore_items` in the `order_items` table. But the actual foreign key column is `item_id`.

**The Fix:** Modified `lib/mysql/supabaseCompat.js` to:
- First try to find FK by column name (backward compatibility)
- If not found, search for ANY FK in the source table that references the target table
- Use the actual FK column name for value extraction

### 3. Missing Error Logging
Added comprehensive error logging to help diagnose issues:
- `lib/mysql/db.js` - Logs SQL errors with query details
- `app/api/mysql/query/route.js` - Logs API errors with table/action info
- `lib/mysql/supabaseCompat.js` - Warns when relations can't be resolved

## Files Modified

1. **`lib/mysql/supabaseCompat.js`**
   - Fixed forward FK lookup logic (lines 109-131)
   - Fixed value extraction to use correct column name
   - Added debug warning for unresolved relations

2. **`lib/mysql/db.js`**
   - Added try-catch and error logging to dbQuery function

3. **`app/api/mysql/query/route.js`**
   - Added detailed error logging in catch block

4. **`mysql/fix_missing_schema.sql`** (NEW FILE)
   - Complete SQL migration to add all missing tables and columns

## Steps to Apply Fixes

### Step 1: Run the Database Migration
```bash
# Using MySQL CLI
mysql -u root -p booksmart < mysql/fix_missing_schema.sql

# Or using phpMyAdmin, Adminer, or any MySQL client
# Copy and paste the contents of mysql/fix_missing_schema.sql and execute
```

### Step 2: Restart the Next.js Application
```bash
npm run dev
```

### Step 3: Check Browser Console and Server Logs
- Open browser DevTools (F12) → Console tab
- Check for any `[resolveRelations]` warnings
- Check server terminal for `[dbQuery Error]` or `[API Query Error]` messages

## Testing the Fixes

### Test 1: Shop Orders Page
1. Log in as a teacher or student
2. Go to "My Orders" (`/shop/orders`)
3. Check if orders display with item details

### Test 2: Dashboard Orders
1. Log in as staff
2. Go to Dashboard
3. Verify orders show with customer names

### Test 3: RISO Queue
1. Log in as risographer
2. Go to RISO Queue (`/riso-queue`)
3. Verify RISO jobs display with items

### Test 4: Appointments
1. Log in as staff  
2. Go to Appointments
3. Verify appointment details and linked orders display

## Common Issues After Fix

### Issue: "Cannot read property 'X' of null"
**Cause:** Some relations still not resolving
**Solution:** Check browser console for `[resolveRelations]` warnings, verify foreign keys exist in database

### Issue: "Table 'X' doesn't exist"
**Cause:** Migration didn't run successfully
**Solution:** Re-run the SQL migration file

### Issue: "Column 'X' doesn't exist"
**Cause:** Partial migration or wrong column name
**Solution:** Check `mysql/fix_missing_schema.sql` and verify column exists

## Support

If issues persist after applying these fixes:
1. Check browser console for specific error messages
2. Check server logs for database errors
3. Verify database connection in `.env.local`
4. Ensure MySQL is running and accessible
