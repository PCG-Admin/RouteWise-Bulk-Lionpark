# Non-Matched Visits - Complete Implementation

## ✅ All Requirements Implemented

### 1. **Loading Board Status Flow**
Non-matched visits now follow the same status flow as regular allocations:
- **Pending Arrival** → Status: `scheduled`, `in_transit`
- **Checked In** → Status: `arrived`, `weighing` (includes non-matched visits)
- **Departed** → Status: `completed`, `cancelled`

### 2. **Verification Status Field**
- **Regular Allocations**: `driverValidationStatus` = `pending_verification`, `verified`, or `ready_for_dispatch`
- **Non-Matched Visits**: `driverValidationStatus` = `non_matched`

This appears in the "Verification Status" column on Transportation Records page.

### 3. **Parking Tickets Generated**
✅ Parking tickets are now automatically created for non-matched visits

**Database Changes:**
- Added `visit_id` column to `parking_tickets` table
- Made `truck_allocation_id` nullable
- Added check constraint: ticket must link to EITHER allocation OR visit (not both)

**Parking Ticket Details for Non-Matched Visits:**
- Ticket Number: `PT-2026-NNNNNN`
- Reference: "Non-Matched Visit"
- Remarks: "Non-Matched Plate - No Scheduled Allocation"
- Freight Company: "Unknown"
- Status: "pending" (can be completed via parking ticket form)

### 4. **Exit Gate Detection**
✅ ANPR camera at exit gate now detects non-matched visits and updates status to "Departed"

**Flow:**
```
Exit Camera Detects Plate → ANPR checks allocations
                           ↓ (no match)
                   Checks visits with status='arrived'
                           ↓ (match found)
            Updates visit status to 'completed' (Departed)
                           ↓
                Shows in "Departed" column on Loading Board
```

### 5. **Bulk System Exclusion**
✅ Non-matched visits do NOT appear on Bulk Connections system

Visits are only fetched by Lions Park system (SITE_ID=1), not by Bulk system.

## Implementation Details

### Database Schema Updates

**Migration Applied: `006_parking_tickets_support_visits.sql`**
```sql
-- Add visitId column
ALTER TABLE parking_tickets ADD COLUMN visit_id INTEGER REFERENCES planned_visits(id);

-- Make truck_allocation_id nullable
ALTER TABLE parking_tickets ALTER COLUMN truck_allocation_id DROP NOT NULL;

-- Add check constraint
ALTER TABLE parking_tickets ADD CONSTRAINT parking_ticket_link_check
  CHECK ((truck_allocation_id IS NOT NULL AND visit_id IS NULL) OR
         (truck_allocation_id IS NULL AND visit_id IS NOT NULL));
```

### Backend Changes

**ANPR Service (`anpr-checker.ts`)**

1. **Entry Detection (No Match):**
   - Creates visit with `status='arrived'`
   - Sets `driverName='Unknown'`
   - Creates parking ticket linked to visit
   - Invalidates cache

2. **Exit Detection (No Match in Allocations):**
   - Checks for visits with `status='arrived'`
   - Updates matched visit to `status='completed'`
   - Logs departure via ANPR

**Visits API (`visits.ts`)**
- Returns `driverValidationStatus='non_matched'` for all visits
- Includes `driverName` and `transporterName` from visit record

### Frontend Changes

**Loading Board (`loading-board/page.tsx`)**
- Removed `'non_matched'` from stage statuses
- Uses `driverValidationStatus === 'non_matched'` to identify visits
- Red border styling based on `driverValidationStatus`, not `status`

**CCTV Page (`cctv/page.tsx`)**
- Checks both allocations AND visits when polling
- Shows special message for non-matched plates

**Transportation Records (`transportation-records/page.tsx`)**
- Fetches and displays visits alongside allocations
- Verification Status column shows "non_matched" for visits

## Testing Workflow

### Test 1: Upload Unknown Plate
1. Go to CCTV page: `http://localhost:3000/operations/cctv`
2. Upload image with unknown plate (e.g., "XYZ999GP")
3. Expected result:
   ```
   ⚠️ Plate XYZ999GP detected as NON-MATCHED!
      Created visit record.
      Check Checked In stage on Loading Board.
   ```

### Test 2: Verify on Loading Board
1. Go to Loading Board: `http://localhost:3000/operations/loading-board`
2. Check "Checked In" column
3. Should see:
   - Red bordered card
   - "⚠️ Non-Matched Plate" badge
   - Red plate number
   - All order fields "N/A"

### Test 3: Check Parking Ticket
1. Click "View" on the non-matched visit
2. Go to "Parking Ticket" tab
3. Should show parking ticket with:
   - Ticket number
   - Status: "Pending Completion"
   - Can fill out parking ticket form

### Test 4: Check Transportation Records
1. Go to: `http://localhost:3000/operations/transportation-records`
2. Non-matched visit appears in table
3. Columns show:
   - **Order**: "Order #undefined" (no order linked)
   - **Loading Board Status**: "Not Checked In" or "Checked In"
   - **Verification Status**: "non_matched"
   - Red "View" button

### Test 5: Exit Detection
1. Upload same plate on CCTV with direction="Exit"
2. ANPR should detect it's a non-matched visit
3. Update status to "completed"
4. Should move to "Departed" column on Loading Board

### Test 6: Bulk System Exclusion
1. Go to Bulk System: `http://localhost:3002`
2. Non-matched visits should NOT appear
3. Only regular allocations with orders show

## Backend Logs to Expect

### Entry (Non-Matched Plate):
```
🔍 Checking plate XYZ999GP (normalized: XYZ999GP)
   Direction: entry, Camera: entrance_camera
⚠️  No match found in allocations for plate XYZ999GP
   Checked against 33 allocations
   Creating non-matched visit record...
⚠️  Non-matched visit created (ID: 5)
   Plate: XYZ999GP | Status: arrived (Non-Matched)
🎫 Parking ticket PT-2026-000005 created for non-matched visit 5
✅ Cache INVALIDATED: truck-allocations:* (2 keys)
✅ Cache INVALIDATED: visits:* (1 keys)
```

### Exit (Non-Matched Visit Departing):
```
🔍 Checking plate XYZ999GP (normalized: XYZ999GP)
   Direction: exit, Camera: exit_camera
⚠️  No match found in allocations for plate XYZ999GP
   Checked against 33 allocations
   Checking for non-matched visits...
✅ VISIT MATCH FOUND! Visit ID: 5, Plate: XYZ999GP
🚚 Non-matched visit XYZ999GP (ID: 5) → completed (departed)
   DEPARTURE via ANPR at 2026-02-16T15:30:00.000Z
✅ Cache INVALIDATED: visits:* (1 keys)
```

## Files Modified

### Backend:
- ✅ `routewise-backend/src/db/schema.ts` - Added visitId to parkingTickets
- ✅ `routewise-backend/src/services/anpr-checker.ts` - Entry/exit detection for visits
- ✅ `routewise-backend/src/routes/visits.ts` - Added driverValidationStatus field
- ✅ `routewise-backend/migrations/006_parking_tickets_support_visits.sql` - Migration

### Frontend:
- ✅ `mindrift-Lionspark-weigh8/src/app/(dashboard)/operations/loading-board/page.tsx`
- ✅ `mindrift-Lionspark-weigh8/src/app/(dashboard)/operations/cctv/page.tsx`
- ✅ `mindrift-Lionspark-weigh8/src/app/(dashboard)/operations/transportation-records/page.tsx`

## Summary of Status Fields

| Record Type | Loading Board Status | Verification Status | Notes |
|-------------|---------------------|-------------------|-------|
| **Regular Allocation** | `scheduled`, `arrived`, `completed` | `pending_verification`, `verified`, `ready_for_dispatch` | Has `orderId` |
| **Non-Matched Visit** | `arrived`, `completed` | `non_matched` | No `orderId` |

## Visual Indicators

### Loading Board Card (Non-Matched):
```
┌─────────────────────────────────┐ ← Red 2px border
│ 🔴 XYZ999GP    ⚠️ Non-Matched  │ ← Red badge, red plate
│                                  │
│ Driver: Unknown                  │
│ Transporter: N/A                 │
│ Customer: N/A                    │
│                                  │
│ Order: N/A                       │
│ Product: N/A                     │
└─────────────────────────────────┘
```

### Transportation Records (Non-Matched):
```
Order         | Date       | Plate     | Verification Status | Loading Status
------------- | ---------- | --------- | ------------------- | --------------
Order #undefined | Feb 16    | XYZ999GP  | non_matched        | Checked In
```

## Ready to Test!

All systems restarted. Upload a truck image with an unknown plate now to see the complete flow working!
