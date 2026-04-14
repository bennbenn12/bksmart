# RISOGRAPHER Integration — BookSmart v2.0

## Overview
This document outlines the integration of the **Risographer** role and RISO job order management system based on the physical HNU Risograph Job Order form.

---

## 1. Database Changes (mysql/add_risographer.sql)

### New Role Added
- `risographer` — Added to `users.role_id` ENUM

### Job Orders Table Updated
New fields added to support RISO workflow:
- `job_type` (ENUM: 'General', 'RISO') — Distinguishes RISO from regular job orders
- `risographer_id` — Tracks which risographer processed the job
- `processing_at` — Timestamp when processing started
- `paper_used`, `ink_used`, `masters_used` — Material consumption tracking
- `cost_center` — Departmental cost center
- `exam_type` — Prelim, Midterm, Pre-Final, Final, Elem. Test, HS Test
- `charge_to` — Account to charge
- `computed_by`, `computed_at` — Who calculated costs
- `noted_by`, `noted_at` — Cost centre head approval
- `verified_by`, `verified_at` — Internal audit verification
- `final_approved_by`, `final_approved_at` — VP Finance approval
- `pickup_notified_at` — When teacher was notified

### New Table: riso_job_items
Stores individual subject items for RISO jobs:
- `job_id` — FK to job_orders
- `subject` — Subject name
- `num_masters` — Number of master copies
- `print_type` — '1_side' or 'B_to_B' (back-to-back)
- `copies_per_master` — Copies per master
- `total_paper_used` — Calculated total paper

### New Table: riso_queue
Manages the printing queue:
- `job_id` — FK to job_orders
- `risographer_id` — Assigned risographer
- `queue_position` — Position in queue
- `status` — Pending, Processing, Completed, Cancelled
- `started_at`, `completed_at` — Timestamps

---

## 2. System Changes

### lib/utils.js
**Added:**
- `risographer` to `ROLE_LABELS` and `ROLE_COLORS`
- `risographer` to navigation (Job Orders, RISO Queue, Inventory)
- New navigation item: `/riso-queue` with Printer icon

### components/layout/Sidebar.js
**Added:**
- `Printer` icon import for RISO Queue navigation

### app/(dashboard)/job-orders/page.js
**Major Updates:**
- New state management for RISO items, compute modal
- New functions: `notifyPickup()`, `addRisoItem()`, `computeCosts()`, `approveFinal()`, `deductInventory()`
- **CreateJOModal** — Now supports both General and RISO job orders
  - Toggle between General and RISO job types
  - RISO-specific fields: Cost Center, Exam Type, Charge To
  - Dynamic RISO items table (add/remove subjects)
  - Auto-calculation of total paper usage
- **ComputeCostsModal** — New modal for calculating material costs
- Status workflow updated: Draft → Pending_Audit → Approved → **Processing** → Completed

### app/(dashboard)/riso-queue/page.js (NEW)
**New page for Risographers and Staff:**
- Stats cards: Pending, Processing, Completed Today
- RISO job queue table with:
  - Job details and requester info
  - Exam type badges
  - Item count and paper usage
  - Status and priority indicators
- **Actions:**
  - View job details
  - Start Processing (moves to Processing status)
  - Complete Job (opens cost computation modal)
- **ViewJobModal** — Shows full RISO job details with items table
- **ComputeCostsModal** — Enter actual material usage and costs
- Automatic inventory deduction on completion
- Automatic pickup notification to teacher

---

## 3. RISO Workflow

### Teacher Workflow
1. Navigate to Job Orders
2. Click "New Job Order"
3. Select "RISO Job Order" toggle
4. Fill in:
   - Department Account & Cost Center
   - Exam Type (Prelim, Midterm, etc.)
   - Charge To account
   - RISO Items (Subject, # of Masters, Print Type, Copies/Master)
   - Description/Notes
5. Save as Draft
6. Submit for Audit

### Staff/Manager Audit
1. Review RISO job order
2. Approve or Reject with notes
3. Approved jobs appear in RISO Queue

### Risographer Workflow
1. Access RISO Queue page
2. View Pending (Approved) jobs
3. Click "Start" to begin processing
4. Print materials
5. Click "Complete" to enter actual usage:
   - Paper used (sheets)
   - Ink used (ml)
   - Masters used
   - Associated costs
6. System automatically:
   - Deducts materials from inventory
   - Marks job as Completed
   - Sends pickup notification to teacher

---

## 4. Inventory Integration

### RISO Materials SKUs (to be added to bookstore_items)
- `RISO-PAPER` — RISO printing paper
- `RISO-INK` — RISO ink
- `RISO-MASTER` — RISO master rolls

### Automatic Deduction
When a RISO job is completed:
- Paper stock reduced by `paper_used`
- Ink stock reduced by `ink_used`
- Master stock reduced by `masters_used`
- Inventory logs created for audit trail

---

## 5. Setup Instructions

### Step 1: Run Database Migration
```sql
SOURCE mysql/add_risographer.sql;
```

### Step 2: Add RISO Inventory Items
Insert these items into `bookstore_items`:
- RISO Paper (SKU: RISO-PAPER)
- RISO Ink (SKU: RISO-INK)
- RISO Master (SKU: RISO-MASTER)

### Step 3: Create Risographer Account
- Register new user with role: `risographer`
- Or update existing user: `UPDATE users SET role_id = 'risographer' WHERE id_number = '...';`

### Step 4: Restart Development Server
```bash
npm run dev
```

---

## 6. Role Permissions Summary

| Feature | Manager | Staff | Risographer | Teacher |
|---------|---------|-------|-------------|---------|
| Create General Job Orders | ✅ | ✅ | ❌ | ✅ |
| Create RISO Job Orders | ✅ | ✅ | ❌ | ✅ |
| Audit/Approve RISO Jobs | ✅ | ✅ | ❌ | ❌ |
| Manage RISO Queue | ✅ | ✅ | ✅ | ❌ |
| Process RISO Printing | ✅ | ✅ | ✅ | ❌ |
| Deduct Inventory | ✅ | ✅ | ✅ | ❌ |
| View Job Orders | ✅ | ✅ | ✅ | Own only |

---

## 7. Physical Form Mapping

### HNU RISOGRAPH JOB ORDER Form → Digital Fields

| Physical Form Field | Database Field |
|---------------------|----------------|
| Name | requester (users table) |
| Date | created_at |
| Prelim/Midterm/etc. | exam_type |
| Subjects | riso_job_items.subject |
| # of Master | riso_job_items.num_masters |
| 1 side/B to B | riso_job_items.print_type |
| Copies/Master | riso_job_items.copies_per_master |
| TOTAL Paper Used | riso_job_items.total_paper_used |
| Charge to | charge_to |
| Cost Center | cost_center |
| Master (cost) | total_amount calculation |
| Paper Used (cost) | paper_used + cost |
| Ink (cost) | ink_used + cost |
| Noted by (Cost Centre Head) | noted_by, noted_at |
| Computed by (Supply Personnel) | computed_by, computed_at |
| Verified by (Internal Audit) | verified_by, verified_at |
| Approved by (VP for Finance) | final_approved_by, final_approved_at |

---

## 8. Files Modified/Created

### Modified
- `lib/utils.js` — Added risographer role
- `components/layout/Sidebar.js` — Added Printer icon
- `app/(dashboard)/job-orders/page.js` — RISO support

### Created
- `mysql/add_risographer.sql` — Database migration
- `app/(dashboard)/riso-queue/page.js` — RISO queue management

---

## 9. Testing Checklist

- [ ] Create risographer account
- [ ] Create RISO job order as teacher
- [ ] Submit for audit
- [ ] Approve as staff/manager
- [ ] View in RISO Queue as risographer
- [ ] Start processing
- [ ] Complete with cost entry
- [ ] Verify inventory deduction
- [ ] Check teacher notification
- [ ] Test rejection workflow
- [ ] Test cost computation

---

## Questions or Issues?

Contact: [Your Name]  
Date: April 11, 2026
