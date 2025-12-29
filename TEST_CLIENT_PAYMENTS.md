# Client Payment Records Testing Guide

## 📋 Prerequisites

### 1. Database Setup
First, you need to run the database migration to create the `client_payments` table:

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Migration**
   - Copy the contents of `migrations/create_client_payments_table.sql`
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)

4. **Verify Table Creation**
   - Go to "Table Editor" in Supabase
   - You should see `client_payments` table in the list

### 2. Ensure You Have Test Data

You need at least one match in the `surrogate_matches` table to test payment records:

```sql
-- Check if you have matches
SELECT id, surrogate_id, parent_id, status 
FROM surrogate_matches 
WHERE status = 'active' 
LIMIT 5;
```

If you don't have matches, you can create one through the admin dashboard's "Matches" page.

---

## 🚀 Local Testing Steps

### Step 1: Start the Development Server

```bash
cd admin-dashboard
npm install  # If you haven't already
npm run dev
```

The server will start at: http://localhost:3000

### Step 2: Login to Admin Dashboard

1. Open http://localhost:3000
2. You should be redirected to `/login`
3. Enter your admin credentials
4. After login, you'll see the dashboard

### Step 3: Navigate to Payment Nodes

1. Click on **"Payment Nodes"** in the navigation bar
2. You should see two tabs:
   - **Payment Nodes** (default)
   - **Client Payment Records**

### Step 4: Test Client Payment Records Tab

1. **Click on "Client Payment Records" tab**
   - You should see an empty table or existing records
   - Filters for Match and Installment
   - Summary cards showing total records and total amount

2. **Add a Payment Record**
   - Click **"+ Add Payment Record"** button
   - Fill in the form:
     - **Match**: Select a match from dropdown
     - **Installment**: Choose Installment 1, 2, 3, or 4
     - **Amount**: Enter amount (e.g., 5000.00)
     - **Payment Date**: Select a date
     - **Payment Method**: (Optional) e.g., "Bank Transfer"
     - **Payment Reference**: (Optional) e.g., "TXN-12345"
     - **Notes**: (Optional) Any additional notes
   - Click **"Create"**
   - You should see a success message
   - The new record should appear in the table

3. **Test Filtering**
   - **Filter by Match**: Select a specific match from the dropdown
   - **Filter by Installment**: Select a specific installment (1, 2, 3, or 4)
   - The table should update to show only matching records

4. **Edit a Payment Record**
   - Click **"Edit"** on any payment record
   - Modify the fields (note: Match cannot be changed when editing)
   - Click **"Update"**
   - Verify the changes are saved

5. **Delete a Payment Record**
   - Click **"Delete"** on any payment record
   - Confirm the deletion
   - The record should be removed from the table

6. **Verify Summary Statistics**
   - Check that "Total Records" updates correctly
   - Check that "Total Amount" calculates correctly

---

## 🧪 Test Scenarios

### Scenario 1: Create All 4 Installments for One Match

1. Select a match
2. Create Installment 1 payment
3. Create Installment 2 payment
4. Create Installment 3 payment
5. Create Installment 4 payment
6. **Expected**: All 4 payments should appear in the table
7. **Filter by Match**: Should show all 4 payments
8. **Filter by Installment**: Should show only the selected installment

### Scenario 2: Test Different Payment Methods

Create payments with different payment methods:
- Bank Transfer
- Credit Card
- Check
- Wire Transfer

**Expected**: All should save and display correctly

### Scenario 3: Test Date Formatting

1. Create a payment with date: 2024-12-29
2. **Expected**: Should display as "Dec 29, 2024" (no timezone offset)

### Scenario 4: Test Amount Calculation

1. Create multiple payments with different amounts:
   - Installment 1: $5,000
   - Installment 2: $10,000
   - Installment 3: $7,500
   - Installment 4: $12,500
2. **Expected**: Total Amount should show $35,000.00

### Scenario 5: Test Color Coding

Verify that each installment has the correct color:
- Installment 1: Blue badge
- Installment 2: Green badge
- Installment 3: Yellow badge
- Installment 4: Purple badge

---

## 🔍 Verification Checklist

- [ ] Database table `client_payments` exists
- [ ] Can navigate to Payment Nodes page
- [ ] Can see "Client Payment Records" tab
- [ ] Can add a new payment record
- [ ] Can edit an existing payment record
- [ ] Can delete a payment record
- [ ] Filters work correctly (by Match and Installment)
- [ ] Summary statistics update correctly
- [ ] Payment dates display correctly (no timezone issues)
- [ ] Amounts format correctly as currency
- [ ] Installment badges show correct colors
- [ ] Match information displays correctly (surrogate and parent names)

---

## 🐛 Troubleshooting

### Issue: "Failed to load payment records"
**Solution**: 
- Check if `client_payments` table exists in Supabase
- Verify RLS policies are set correctly
- Check browser console for errors

### Issue: "No matches available" in dropdown
**Solution**:
- Go to "Matches" page
- Create a match first
- Then try adding payment records

### Issue: Payment record not saving
**Solution**:
- Check browser console for errors
- Verify all required fields are filled
- Check Supabase logs for database errors

### Issue: Dates showing wrong day (e.g., 12/29 showing as 12/28)
**Solution**:
- This should be fixed, but if it happens, check the date formatting logic
- Ensure dates are parsed without timezone conversion

---

## 📊 SQL Queries for Manual Verification

### Check all payment records:
```sql
SELECT 
  cp.*,
  sm.surrogate_id,
  sm.parent_id
FROM client_payments cp
JOIN surrogate_matches sm ON cp.match_id = sm.id
ORDER BY cp.payment_date DESC;
```

### Check payments by installment:
```sql
SELECT 
  payment_installment,
  COUNT(*) as count,
  SUM(amount) as total_amount
FROM client_payments
GROUP BY payment_installment
ORDER BY payment_installment;
```

### Check payments by match:
```sql
SELECT 
  cp.match_id,
  COUNT(*) as payment_count,
  SUM(cp.amount) as total_paid
FROM client_payments cp
GROUP BY cp.match_id;
```

---

## ✅ Success Criteria

The feature is working correctly if:
1. ✅ All CRUD operations work (Create, Read, Update, Delete)
2. ✅ Filters work correctly
3. ✅ Summary statistics are accurate
4. ✅ No console errors
5. ✅ UI is responsive and user-friendly
6. ✅ All text is in English (no Chinese characters)
7. ✅ Dates display correctly without timezone issues

---

## 🎯 Next Steps After Testing

Once testing is complete:
1. Document any issues found
2. Fix any bugs discovered
3. Deploy to production (Vercel)
4. Test again in production environment

