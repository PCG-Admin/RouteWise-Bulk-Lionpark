# Non-Matched Plates Implementation

## Overview
ANPR-detected plates without scheduled allocations are now captured in the system as "visits" and displayed on the Loading Board with a red border.

## What Was Changed

### 1. Backend Changes

#### **New API Route: `/api/visits`**
- File: `routewise-backend/src/routes/visits.ts`
- Fetches all visits including non-matched plates
- Supports filtering by site and status
- Returns data in same format as truck allocations for easy frontend integration

#### **Updated ANPR Service**
- File: `routewise-backend/src/services/anpr-checker.ts`
- When ANPR detects a plate without matching allocation:
  - Creates a new record in the `visits` table
  - Sets status to `'non_matched'`
  - Records detection time, plate number, and site
  - Invalidates relevant caches

#### **Route Registration**
- File: `routewise-backend/src/index.ts`
- Added visits route: `app.use('/api/visits', visitsRoutes)`

### 2. Frontend Changes

#### **Loading Board Updates**
- File: `mindrift-Lionspark-weigh8/src/app/(dashboard)/operations/loading-board/page.tsx`

**Data Fetching:**
- Now fetches both truck allocations AND non-matched visits in parallel
- Combines them into a single list for display

**Stage Configuration:**
- Added `'non_matched'` to Pending Arrival stage statuses
- Non-matched visits appear in the "Pending Arrival" column

**Card Styling:**
- Non-matched plates have:
  - **Red border** (border-2 border-red-500)
  - **Red plate number badge** (red background, red text)
  - **Status badge** showing "Non-Matched Plate" with alert icon
  - All other allocations keep standard blue/slate styling

## How It Works

### Workflow
```
1. ANPR Camera detects plate (e.g., "ABC 123 MP")
2. ANPR Service checks if plate matches any scheduled allocation
   ├─ MATCH FOUND → Check in normally
   └─ NO MATCH → Create visit with status 'non_matched'
3. Loading Board displays visit in "Pending Arrival" with red border
4. Staff can manually review and:
   - Link to existing order
   - Create new order
   - Turn away vehicle
   - Update visit status
```

### Visual Indicators on Loading Board

**Non-Matched Plate Card:**
```
┌─────────────────────────────────┐
│ 🔴 ABC 123 MP     ⚠️ Non-Matched│  ← Red border, red badge
│                                  │
│ Driver: N/A                      │
│ Transporter: N/A                 │
│ Customer: N/A                    │
│                                  │
│ Order: N/A                       │
│ Product: N/A                     │
└─────────────────────────────────┘
```

**Normal Scheduled Allocation:**
```
┌─────────────────────────────────┐
│ XYZ 456 MP              🔵       │  ← Normal border, blue dot
│                                  │
│ Driver: John Doe                 │
│ Transporter: ABC Transport       │
│ Customer: Chrome Inc             │
│                                  │
│ Order: ORD-123                   │
│ Product: Chrome Ore              │
└─────────────────────────────────┘
```

## Database Schema

### Visits Table (Already Existed)
The `visits` table was already in the schema and supports:
- `orderId` - Nullable (can be null for non-matched plates)
- `plateNumber` - Vehicle plate
- `status` - Including 'non_matched'
- `actualArrival` - When detected
- `siteId` - Which site detected it

## Deployment Steps

### On Production Server:

1. **Restart Backend:**
   ```bash
   docker restart routewise-backend
   ```

2. **Verify Backend:**
   ```bash
   # Check logs
   docker logs routewise-backend --tail 50

   # Should see: "✅ ANPR checker started successfully"
   ```

3. **Test API:**
   ```bash
   # Fetch non-matched visits
   curl http://localhost:3001/api/visits?status=non_matched
   ```

4. **Restart Frontend (Lions Park):**
   ```bash
   docker restart weigh8-lions
   ```

5. **Test ANPR Detection:**
   - Trigger ANPR with unknown plate
   - Check logs: "⚠️ Non-matched visit created"
   - Verify appears on Loading Board with red border

## Files Modified

### Backend:
- ✅ `routewise-backend/src/services/anpr-checker.ts` - Creates visits for non-matched plates
- ✅ `routewise-backend/src/routes/visits.ts` - NEW: Visits API endpoint
- ✅ `routewise-backend/src/index.ts` - Registered visits route
- ✅ `routewise-backend/src/db/schema.ts` - Reverted (kept orderId as required in truck_allocations)

### Frontend:
- ✅ `mindrift-Lionspark-weigh8/src/app/(dashboard)/operations/loading-board/page.tsx` - Fetches visits, displays with red border

## Testing

### Manual Test:
1. Access ANPR mock API: `http://localhost:3001/api/anpr-mock/inject`
2. Inject a plate that doesn't exist in allocations
3. Wait 30 seconds for ANPR polling
4. Check Loading Board - should see red-bordered card in Pending Arrival
5. Click card - should show visit details

### Expected Logs:
```
🔍 Checking plate ABC123MP (normalized: ABC123MP)
   Direction: entry, Camera: mock_camera
⚠️  No match found for plate ABC123MP
   Checked against 33 allocations
   Creating non-matched allocation record...
⚠️  Non-matched visit created (ID: 123)
   Plate: ABC123MP | Status: non_matched
✅ Cache INVALIDATED: visits:* (1 keys)
```

## Future Enhancements

1. **Manual Linking UI:**
   - Add button to link non-matched visit to existing order
   - Create new order from non-matched visit

2. **Notifications:**
   - Alert security/ops team when non-matched plate detected
   - SMS/email notifications

3. **Historical Tracking:**
   - Track repeat non-matched plates
   - Blacklist/whitelist functionality

4. **Automated Actions:**
   - Auto-create order for known customers
   - Auto-approve for whitelisted plates

## Notes

- Non-matched visits do NOT have parking tickets automatically created
- They remain in "Pending Arrival" until manually processed
- The visits table is separate from truck_allocations (cleaner architecture)
- Cache invalidation ensures real-time updates on Loading Board
