# Non-Matched Plates - Fixes Applied

## Issues Fixed

### 1. ✅ Non-matched visits now appear in "Checked In" stage
**Before:** Configured to show in "Pending Arrival"
**After:** Shows in "Checked In" stage for immediate review

**Changed:** `loading-board/page.tsx` line 20
```typescript
{ id: "checked_in", title: "Checked In", statuses: ['arrived', 'weighing', 'non_matched'] }
```

### 2. ✅ CCTV page now detects non-matched visits
**Before:** Only checked for allocations
**After:** Checks both allocations AND visits

**Changed:** `operations/cctv/page.tsx` lines 102-146
- Now fetches from both `/api/truck-allocations` and `/api/visits`
- Shows special message for non-matched plates:
  `⚠️ Plate ABC123 detected as NON-MATCHED! Created visit record.`

### 3. ✅ Visits API supports plate number filtering
**Before:** Could only filter by site and status
**After:** Can filter by `plateNumber` parameter

**Changed:** `routewise-backend/src/routes/visits.ts`
```typescript
// New query parameter
const { siteId, status, plateNumber, page, limit } = req.query;

// Filter by plate number if provided
if (plateNumber) {
  conditions.push(eq(visits.plateNumber, String(plateNumber)));
}
```

### 4. ✅ Transportation Records shows non-matched visits
**Before:** Only showed truck allocations
**After:** Shows both allocations and visits

**Changed:** `operations/transportation-records/page.tsx` lines 83-120
- Fetches from both endpoints in parallel
- Combines results into single list
- Non-matched visits appear with red border

## How It Works Now

```
┌─────────────────────────────────────────────────────────┐
│  User uploads truck image on CCTV page                  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  Gemini Vision AI extracts plate number (e.g., ABC123)  │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│  ANPR Service checks for matching allocation            │
└─────────┬──────────────────────────────┬────────────────┘
          │                              │
     MATCH FOUND                    NO MATCH FOUND
          │                              │
          ▼                              ▼
┌──────────────────────┐     ┌────────────────────────────┐
│ Check in normally    │     │ Create visit record        │
│ Status: 'arrived'    │     │ Status: 'non_matched'      │
└──────────────────────┘     └─────────────┬──────────────┘
                                           │
                                           ▼
                             ┌──────────────────────────────┐
                             │ Appears on:                  │
                             │ • Loading Board (Checked In) │
                             │ • Transportation Records     │
                             │ • With RED BORDER            │
                             └──────────────────────────────┘
```

## Testing Steps

### Test on CCTV Page

1. **Navigate to CCTV page**
   ```
   http://localhost:3000/operations/cctv
   ```

2. **Upload truck image with unknown plate**
   - Click "Upload Image" button
   - Select image of truck
   - Set direction to "Entry"
   - Click "Process Image"

3. **Expected result:**
   ```
   ✓ Gemini extracts plate number
   ✓ ANPR checks for match
   ✗ No match found
   ✓ Creates visit record

   Message: "⚠️ Plate ABC123 detected as NON-MATCHED!
            Created visit record. Check Checked In stage on Loading Board."
   ```

### Verify on Loading Board

1. **Navigate to Loading Board**
   ```
   http://localhost:3000/operations/loading-board
   ```

2. **Check "Checked In" column**
   - Should see new card with RED BORDER
   - Status badge: "⚠️ Non-Matched Plate"
   - Red plate number badge
   - All fields show "N/A" (no order linked)

### Verify on Transportation Records

1. **Navigate to Transportation Records**
   ```
   http://localhost:3000/operations/transportation-records
   ```

2. **Verify in table**
   - Non-matched visit appears in list
   - Red border around row
   - Status column shows "non_matched"
   - Click "View" to see details modal

## API Endpoints Updated

| Endpoint | Method | Changes |
|----------|--------|---------|
| `/api/visits` | GET | Added `plateNumber` query parameter |
| `/api/anpr-mock/manual-upload` | POST | Already triggers ANPR check |

## Frontend Pages Updated

| Page | File | Changes |
|------|------|---------|
| Loading Board | `loading-board/page.tsx` | Non-matched in "Checked In" stage, fetches visits |
| CCTV | `cctv/page.tsx` | Checks visits API, shows non-matched message |
| Transportation Records | `transportation-records/page.tsx` | Fetches and displays visits |

## Database

No schema changes needed! The `visits` table already supports:
- `orderId` nullable ✓
- `plateNumber` field ✓
- `status` field (can be 'non_matched') ✓
- `siteId` field ✓

## Next Steps for User

1. **Test the upload flow:**
   ```bash
   # Make sure systems are running
   docker ps

   # Should see:
   # - routewise-backend (port 3001)
   # - mindrift-lionspark (port 3000)
   ```

2. **Upload a test image:**
   - Go to http://localhost:3000/operations/cctv
   - Upload image of truck with unknown plate
   - Verify the message shows non-matched detection

3. **Check Loading Board:**
   - Go to http://localhost:3000/operations/loading-board
   - Look in "Checked In" column
   - Should see red-bordered card

4. **Check Transportation Records:**
   - Go to http://localhost:3000/operations/transportation-records
   - Non-matched visit should appear in table

## Troubleshooting

### Visit not created?
Check backend logs:
```bash
docker logs routewise-backend --tail 100 | grep -i "non-matched"
```

Expected logs:
```
⚠️  No match found for plate ABC123
   Creating non-matched allocation record...
⚠️  Non-matched visit created (ID: 123)
   Plate: ABC123 | Status: non_matched
✅ Cache INVALIDATED: visits:* (1 keys)
```

### Can't see on frontend?
1. Clear browser cache (Ctrl+Shift+R)
2. Check browser console for errors
3. Verify API returns data:
   ```bash
   curl http://localhost:3001/api/visits?status=non_matched
   ```

### Image upload fails?
1. Check Gemini API key is valid
2. Check image format (JPEG, PNG, WebP only)
3. Check file size (< 10MB)
4. Look for errors in backend logs

## Files Modified

### Backend
- ✅ `routewise-backend/src/routes/visits.ts` - Added plateNumber filter
- ✅ `routewise-backend/src/services/anpr-checker.ts` - Already creates visits
- ✅ `routewise-backend/src/index.ts` - Already registered visits route

### Frontend
- ✅ `mindrift-Lionspark-weigh8/src/app/(dashboard)/operations/loading-board/page.tsx`
- ✅ `mindrift-Lionspark-weigh8/src/app/(dashboard)/operations/cctv/page.tsx`
- ✅ `mindrift-Lionspark-weigh8/src/app/(dashboard)/operations/transportation-records/page.tsx`
