# Camera Polling Setup - Navig8 Replacement

## Overview

This system replicates **exactly** how Navig8 fetches camera images - by polling IP cameras on the local network (192.168.10.x).

## How It Works

### Old System (via Navig8):
```
Physical Cameras (192.168.10.x) → Navig8 polls them → Navig8 database → Old weigh8 polls Navig8 API
```

### New System (Direct):
```
Physical Cameras (192.168.10.x) → YOUR system polls them directly → YOUR database → YOUR CCTV page displays
```

## Camera Configuration

The system is configured to poll 15 IP cameras:

**Internal Weighbridge 1:**
- http://192.168.10.17 (Back)
- http://192.168.10.18 (Top 1)
- http://192.168.10.19 (Top 2)
- http://192.168.10.20 (LPR)
- http://192.168.10.21 (Front)

**Outbound Weighbridge 2:**
- http://192.168.10.22 (Back)
- http://192.168.10.23 (Top 1)
- http://192.168.10.24 (Top 2)
- http://192.168.10.25 (LPR)
- http://192.168.10.26 (Front)

**Inbound Weighbridge 3:**
- http://192.168.10.27 (Back)
- http://192.168.10.28 (Top 1)
- http://192.168.10.12 (Top 2)
- http://192.168.10.29 (LPR)
- http://192.168.10.30 (Front)

## Setup Options

### Option 1: Manual Polling (Testing)

Visit this URL to manually poll all cameras once:
```
http://localhost:3000/api/cameras/poll
```

This will:
1. Fetch images from all 15 cameras
2. Convert to base64
3. Save to YOUR database
4. Return results

### Option 2: Automatic Polling (Production)

#### Using Vercel Cron (Recommended for Production)

1. Create `vercel.json` in project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/poll-cameras",
      "schedule": "*/30 * * * * *"
    }
  ]
}
```

This runs every 30 seconds (same as Navig8).

2. Set environment variable in Vercel:
```
CRON_SECRET=your-secret-key-here
```

3. Deploy to Vercel - cron will run automatically

#### Using Local Cron (Development)

For local testing, you can use a simple interval script.

Create `scripts/poll-cameras.js`:

```javascript
const POLL_INTERVAL = 30000; // 30 seconds

async function pollCameras() {
  try {
    const response = await fetch('http://localhost:3000/api/cron/poll-cameras');
    const result = await response.json();
    console.log(`[${new Date().toISOString()}]`, result);
  } catch (error) {
    console.error('Poll failed:', error);
  }
}

// Poll immediately on start
pollCameras();

// Then poll every 30 seconds
setInterval(pollCameras, POLL_INTERVAL);

console.log('Camera polling service started (30s interval)');
```

Run with:
```bash
node scripts/poll-cameras.js
```

#### Using Browser Auto-Refresh (Quick Test)

The CCTV page already auto-refreshes every 10 seconds. To test:

1. Manually poll once: `http://localhost:3000/api/cameras/poll`
2. Visit CCTV page: `http://localhost:3000/operations/cctv`
3. Images will appear!

## Network Requirements

**CRITICAL:** Your server must be on the **same network** as the cameras (192.168.10.x).

If running locally:
- ✅ Connect your computer to the same network as the cameras
- ✅ Ensure you can ping 192.168.10.17, etc.

If deploying to cloud (Vercel, AWS, etc.):
- ❌ Won't work - cameras are on local network
- ✅ Solution: Deploy on a server within the local network OR use a VPN

## Testing

1. **Test camera connectivity:**
```bash
ping 192.168.10.17
ping 192.168.10.18
# etc.
```

2. **Test single camera fetch:**
```bash
curl http://192.168.10.17/doc/page/preview.asp --output test.jpg
```

3. **Test polling endpoint:**
```bash
curl http://localhost:3000/api/cameras/poll
```

4. **View results on CCTV page:**
```
http://localhost:3000/operations/cctv
```

## Troubleshooting

### "Failed to fetch camera" errors
- Check network connectivity to 192.168.10.x
- Verify camera URLs are accessible
- Check firewall settings

### "Database save failed" errors
- Ensure Prisma database is running (`npx prisma dev`)
- Check database connection string in `.env`

### No images showing on CCTV page
- Poll cameras first: `http://localhost:3000/api/cameras/poll`
- Check browser console for errors
- Verify database has records: `npx prisma studio`

## Differences from Navig8

| Feature | Navig8 | Your System |
|---------|--------|-------------|
| **Camera Polling** | ✅ Every 30s | ✅ Every 30s (configurable) |
| **Image Storage** | ❌ External DB | ✅ YOUR Database |
| **API Dependency** | ❌ app.navig8.co.za | ✅ None - Direct |
| **Network Access** | ✅ Local network | ✅ Local network required |
| **Image Format** | Base64 JPEG | Base64 JPEG (same) |
| **Display Refresh** | Polling | ✅ Auto 10s refresh |

## Result

You now have **complete control** over camera feeds:
- ✅ No Navig8 dependency
- ✅ Direct camera polling
- ✅ Your own database
- ✅ Same images as Navig8
- ✅ Real-time CCTV display

The system works **exactly** like Navig8 does, but runs entirely under your control!
