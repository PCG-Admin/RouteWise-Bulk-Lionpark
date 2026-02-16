import { db } from '../db';
import { truckAllocations, parkingTickets, orders, clients, transporters, plannedVisits, allocationSiteJourney } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { invalidateCache } from '../utils/cache';

interface ANPRPlateDetection {
  id: number;
  plateNumber: string;
  detectedAt: string;
  cameraType: string;
  direction: 'entry' | 'exit';
}

interface ANPRApiResponse {
  success: boolean;
  count: number;
  data: ANPRPlateDetection[];
}

class ANPRCheckerService {
  private pollingInterval: NodeJS.Timeout | null = null;
  private processedPlateIds: Set<number> = new Set();
  private lastCheckedId: number = 0;
  private isRunning: boolean = false;
  private mockMode: boolean = false;

  private ANPR_API_URL: string = process.env.ANPR_API_URL || 'http://localhost:3001/api/anpr-mock/last-50';
  private POLLING_INTERVAL_MS: number = parseInt(process.env.ANPR_POLLING_INTERVAL_MS || '30000');

  /**
   * Start the ANPR polling service
   */
  async start(mockMode: boolean = true) {
    if (this.isRunning) {
      console.log('⚠️  ANPR checker is already running');
      return;
    }

    this.mockMode = mockMode;
    console.log('\n🚀 Starting ANPR plate checker service...');
    console.log(`   Mode: ${mockMode ? '🧪 MOCK (Testing)' : '🔴 LIVE (Production)'}`);
    console.log(`   API URL: ${this.ANPR_API_URL}`);
    console.log(`   Polling interval: ${this.POLLING_INTERVAL_MS / 1000} seconds`);

    this.isRunning = true;

    // Start polling
    this.pollingInterval = setInterval(() => {
      this.checkPlates().catch(error => {
        console.error('❌ Error in ANPR polling:', error.message);
      });
    }, this.POLLING_INTERVAL_MS);

    console.log('✅ ANPR checker started successfully\n');
  }

  /**
   * Stop the ANPR polling service
   */
  stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.isRunning = false;
      console.log('🛑 ANPR checker stopped');
    }
  }

  /**
   * Main function to check ANPR plates and match with allocations
   */
  private async checkPlates(): Promise<void> {
    try {
      // Fetch latest plate detections from ANPR API
      const detections = await this.fetchANPRPlates();

      if (!detections || detections.length === 0) {
        return;
      }

      console.log(`📷 Fetched ${detections.length} plate detections from ANPR API`);

      // Filter out already processed detections
      const newDetections = detections.filter(
        detection => !this.processedPlateIds.has(detection.id) && detection.id > this.lastCheckedId
      );

      if (newDetections.length === 0) {
        return;
      }

      console.log(`🆕 Processing ${newDetections.length} new plate detections`);

      let processedCount = 0;
      for (const detection of newDetections) {
        const wasProcessed = await this.processPlateDetection(detection);
        if (wasProcessed) {
          processedCount++;
        }

        // Mark as processed
        this.processedPlateIds.add(detection.id);
        if (detection.id > this.lastCheckedId) {
          this.lastCheckedId = detection.id;
        }
      }

      // Cleanup old processed IDs (keep only last 1000)
      if (this.processedPlateIds.size > 1000) {
        const sortedIds = Array.from(this.processedPlateIds).sort((a, b) => b - a);
        this.processedPlateIds = new Set(sortedIds.slice(0, 1000));
      }

      if (processedCount > 0) {
        console.log(`✅ ANPR check complete: ${processedCount} vehicles processed automatically\n`);
      }

    } catch (error: any) {
      console.error('❌ Error in ANPR plate checking:', error.message);
    }
  }

  /**
   * Fetch plate detections from the ANPR API
   */
  private async fetchANPRPlates(): Promise<ANPRPlateDetection[]> {
    try {
      const response = await fetch(this.ANPR_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`ANPR API returned status ${response.status}`);
      }

      const data = await response.json() as ANPRApiResponse;

      if (!data.success || !Array.isArray(data.data)) {
        console.log('⚠️  ANPR API response indicates failure or invalid data format');
        return [];
      }

      return data.data;

    } catch (error: any) {
      if (error?.name === 'AbortError') {
        console.error('⏱️  ANPR API request timed out');
      } else if (error?.code === 'ECONNREFUSED') {
        // Silent fail for connection refused (API not running)
      } else {
        console.error(`❌ Failed to fetch ANPR plates: ${error?.message || 'Unknown error'}`);
      }
      return [];
    }
  }

  /**
   * Process a single plate detection
   * Returns true if a vehicle was processed (checked in or departed)
   */
  private async processPlateDetection(detection: ANPRPlateDetection): Promise<boolean> {
    try {
      const plateNumber = this.normalizePlateNumber(detection.plateNumber);
      const tenantId = '1'; // Default tenant

      console.log(`🔍 Checking plate ${detection.plateNumber} (normalized: ${plateNumber})`);
      console.log(`   Direction: ${detection.direction}, Camera: ${detection.cameraType}`);

      // Find matching truck allocation (don't filter by site - trucks visit multiple sites)
      const allocations = await db
        .select()
        .from(truckAllocations)
        .where(eq(truckAllocations.tenantId, tenantId));

      // Match based on direction
      let matchedAllocation;

      if (detection.direction === 'entry') {
        // Entry: Look for scheduled or in-transit trucks
        matchedAllocation = allocations.find(a =>
          this.normalizePlateNumber(a.vehicleReg) === plateNumber &&
          (a.status === 'scheduled' || a.status === 'in_transit')
        );
      } else {
        // Exit: Look for trucks with ready_for_dispatch driver validation status
        matchedAllocation = allocations.find(a =>
          this.normalizePlateNumber(a.vehicleReg) === plateNumber &&
          a.driverValidationStatus === 'ready_for_dispatch'
        );
      }

      if (matchedAllocation) {
        console.log(`✅ MATCH FOUND! Allocation ID: ${matchedAllocation.id}, Order: ${matchedAllocation.orderId}`);
        console.log(`   Current status: ${matchedAllocation.status}`);

        // Get site ID from detection (manual upload) or environment variable
        const siteId = (detection as any).siteId || parseInt(process.env.SITE_ID || '1');
        const eventType = detection.direction === 'entry' ? 'arrival' : 'departure';
        const journeyStatus = detection.direction === 'entry' ? 'arrived' : 'departed';

        console.log(`   Site: ${siteId}, Direction: ${detection.direction}, Event: ${eventType}`);

        // MODIFIED OPTION 2: Journey-based status logic
        // - Entry anywhere: Only create journey entry, don't update allocation.status
        // - Exit from Lions (site 1): Update allocation.status = 'in_transit'
        // - Exit from Bulk (site 2): Update allocation.status = 'completed'

        let shouldUpdateAllocationStatus = false;
        let allocationStatusUpdate: any = null;

        if (detection.direction === 'entry') {
          // Entry detection: Just create journey entry, don't update allocation status
          console.log(`   Entry detected - creating journey entry only (no allocation status update)`);
          shouldUpdateAllocationStatus = false;
        } else {
          // Exit detection: Check driver validation and update allocation status based on site
          if (matchedAllocation.driverValidationStatus !== 'ready_for_dispatch') {
            console.log(`   Not ready for dispatch (status: ${matchedAllocation.driverValidationStatus}), skipping`);
            return false;
          }

          if (siteId === 1) {
            // Exit from Lions → in_transit (truck traveling to Bulk)
            allocationStatusUpdate = {
              status: 'in_transit',
              departureTime: new Date(detection.detectedAt),
              updatedAt: new Date(),
            };
            shouldUpdateAllocationStatus = true;
            console.log(`   Exit from Lions (site 1) - setting allocation status to 'in_transit'`);
          } else if (siteId === 2) {
            // Exit from Bulk → completed (final delivery)
            allocationStatusUpdate = {
              status: 'completed',
              departureTime: new Date(detection.detectedAt),
              updatedAt: new Date(),
            };
            shouldUpdateAllocationStatus = true;
            console.log(`   Exit from Bulk (site 2) - setting allocation status to 'completed'`);
          }
        }

        // Update allocation status only if needed (exits only)
        if (shouldUpdateAllocationStatus && allocationStatusUpdate) {
          await db
            .update(truckAllocations)
            .set(allocationStatusUpdate)
            .where(eq(truckAllocations.id, matchedAllocation.id));

          await invalidateCache('truck-allocations:*');
          console.log(`✓ Updated allocation ${matchedAllocation.id} status to '${allocationStatusUpdate.status}'`);
        }

        // Create journey entry for site-aware tracking (non-blocking)
        try {
          await db.insert(allocationSiteJourney).values({
            tenantId,
            allocationId: matchedAllocation.id,
            orderId: matchedAllocation.orderId,
            siteId,
            vehicleReg: matchedAllocation.vehicleReg,
            driverName: matchedAllocation.driverName,
            eventType,
            status: journeyStatus,
            detectionMethod: 'anpr_auto',
            detectionSource: `ANPR Camera ${plateNumber}`,
            timestamp: new Date(detection.detectedAt),
          });

          await invalidateCache(`journey:allocation:${matchedAllocation.id}`);
          await invalidateCache(`journey:site:${siteId}`);
          console.log(`✓ Created journey entry: ${eventType} at site ${siteId} for allocation ${matchedAllocation.id}`);
        } catch (journeyError) {
          console.warn(`⚠️ Failed to create journey entry (non-critical):`, journeyError);
          // Don't fail the whole check-in process if journey tracking fails
        }

        console.log(`🚚 Vehicle ${matchedAllocation.vehicleReg} (ID: ${matchedAllocation.id})`);
        console.log(`   ${detection.direction === 'entry' ? 'CHECK-IN' : 'DEPARTURE'} via ANPR at ${detection.detectedAt}`);

        // Auto-create parking ticket on check-in at Lions (site 1 entry only)
        if (detection.direction === 'entry' && siteId === 1) {
          await this.createParkingTicket(matchedAllocation.id, tenantId, new Date(detection.detectedAt));
          console.log(`   🎫 Parking ticket creation triggered for Lions Park check-in`);
        }

        return true;
      } else {
        // No match found in allocations - check plannedVisits for exit, or create new visit for entry
        console.log(`⚠️  No match found in allocations for plate ${plateNumber}`);
        console.log(`   Checked against ${allocations.length} allocations`);

        if (detection.direction === 'entry') {
          // Entry: Create non-matched visit
          console.log(`   Creating non-matched visit record...`);
          await this.createNonMatchedAllocation(detection, tenantId);
          return true;
        } else {
          // Exit: Check if there's a non-matched visit that needs to depart
          console.log(`   Checking for non-matched plannedVisits...`);

          // Find ALL plannedVisits with status='arrived' for this tenant
          const matchedVisits = await db
            .select()
            .from(plannedVisits)
            .where(and(
              eq(plannedVisits.tenantId, tenantId),
              eq(plannedVisits.status, 'arrived')
            ));

          // Filter by plate and sort by arrival time (most recent first)
          const matchingPlateVisits = matchedVisits
            .filter(v => this.normalizePlateNumber(v.plateNumber) === plateNumber)
            .sort((a, b) => {
              const aTime = a.actualArrival ? new Date(a.actualArrival).getTime() : 0;
              const bTime = b.actualArrival ? new Date(b.actualArrival).getTime() : 0;
              return bTime - aTime; // Most recent first
            });

          const matchedVisit = matchingPlateVisits[0]; // Get the most recent one

          if (matchedVisit) {
            console.log(`✅ VISIT MATCH FOUND! Visit ID: ${matchedVisit.id}, Plate: ${matchedVisit.plateNumber}`);

            try {
              console.log(`   Step 1: Preparing to update visit ${matchedVisit.id}...`);

              // Update visit to departed status with departure timestamp
              await db
                .update(plannedVisits)
                .set({
                  status: 'completed',
                  departureTime: new Date(detection.detectedAt),
                  updatedAt: new Date(),
                })
                .where(eq(plannedVisits.id, matchedVisit.id));

              console.log(`   Step 2: Visit updated successfully in database`);

              // Invalidate cache
              console.log(`   Step 3: Invalidating cache...`);
              await invalidateCache('visits:*');
              await invalidateCache('truck-allocations:*');

              console.log(`   Step 4: Cache invalidated successfully`);
              console.log(`🚚 Non-matched visit ${matchedVisit.plateNumber} (ID: ${matchedVisit.id}) → completed (departed)`);
              console.log(`   DEPARTURE via ANPR at ${detection.detectedAt}`);

              return true;
            } catch (updateError: any) {
              console.error(`❌ ERROR in visit update process:`, updateError.message);
              console.error(`   Full error:`, updateError);
              throw updateError; // Re-throw to be caught by outer catch
            }
          }

          console.log(`   No matching visit found for exit`);
          return false;
        }
      }

    } catch (error: any) {
      console.error(`❌ Error processing plate detection ${detection.id}:`, error.message);
      return false;
    }
  }

  /**
   * Normalize plate numbers for consistent matching
   * Removes spaces, dashes, underscores and converts to uppercase
   */
  private normalizePlateNumber(plateNumber: string): string {
    return plateNumber
      .toUpperCase()
      .replace(/[\s\-_]/g, '') // Remove spaces, dashes, underscores
      .trim();
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      mockMode: this.mockMode,
      apiUrl: this.ANPR_API_URL,
      pollingIntervalSeconds: this.POLLING_INTERVAL_MS / 1000,
      processedPlatesCount: this.processedPlateIds.size,
      lastCheckedId: this.lastCheckedId,
      workflow: {
        onEntry: 'Match plate → scheduled → arrived (auto check-in)',
        onExit: 'Match plate → driverValidationStatus: ready_for_dispatch → completed (auto departure)',
      }
    };
  }

  /**
   * Reset the processed plates cache (useful for testing)
   */
  resetCache() {
    this.processedPlateIds.clear();
    this.lastCheckedId = 0;
    console.log('🔄 ANPR checker cache reset');
  }

  /**
   * Manually inject a test plate detection (for testing)
   */
  async injectTestPlate(plateNumber: string, direction: 'entry' | 'exit' = 'entry'): Promise<boolean> {
    console.log(`\n🧪 TEST INJECTION: ${plateNumber} (${direction})`);

    const testDetection: ANPRPlateDetection = {
      id: Date.now(),
      plateNumber,
      detectedAt: new Date().toISOString(),
      cameraType: 'test_camera',
      direction
    };

    return await this.processPlateDetection(testDetection);
  }

  /**
   * Trigger an immediate check (useful after manual uploads)
   */
  async checkNow(): Promise<void> {
    console.log('🔄 Immediate ANPR check triggered');
    await this.checkPlates();
  }

  /**
   * Create parking ticket for checked-in truck
   */
  private async createParkingTicket(allocationId: number, tenantId: string, arrivalTime: Date): Promise<void> {
    try {
      // Check if parking ticket already exists
      const existingTicket = await db
        .select()
        .from(parkingTickets)
        .where(and(
          eq(parkingTickets.truckAllocationId, allocationId),
          eq(parkingTickets.tenantId, tenantId)
        ))
        .limit(1);

      if (existingTicket.length > 0) {
        console.log(`   ⚠️  Parking ticket already exists for allocation ${allocationId}`);
        return;
      }

      // Generate ticket number
      const year = new Date().getFullYear();
      const prefix = `PT-${year}-`;

      const latestTickets = await db
        .select({ ticketNumber: parkingTickets.ticketNumber })
        .from(parkingTickets)
        .where(eq(parkingTickets.tenantId, tenantId))
        .orderBy(desc(parkingTickets.ticketNumber))
        .limit(1);

      let sequence = 1;
      if (latestTickets.length > 0 && latestTickets[0].ticketNumber.startsWith(prefix)) {
        const lastNumber = latestTickets[0].ticketNumber.replace(prefix, '');
        sequence = parseInt(lastNumber) + 1;
      }

      const ticketNumber = `${prefix}${sequence.toString().padStart(6, '0')}`;

      // Get allocation details with order and client info
      const allocationData = await db
        .select({
          allocation: truckAllocations,
          order: orders,
          client: clients,
        })
        .from(truckAllocations)
        .leftJoin(orders, eq(truckAllocations.orderId, orders.id))
        .leftJoin(clients, eq(orders.clientId, clients.id))
        .where(and(
          eq(truckAllocations.id, allocationId),
          eq(truckAllocations.tenantId, tenantId)
        ))
        .limit(1);

      if (allocationData.length === 0) {
        console.log(`   ⚠️  Allocation ${allocationId} not found for parking ticket creation`);
        return;
      }

      const { allocation, order, client } = allocationData[0];

      // Get transporter details if available
      let transporterData = null;
      if (allocation.transporter) {
        const transporterResults = await db
          .select()
          .from(transporters)
          .where(and(
            eq(transporters.name, allocation.transporter),
            eq(transporters.tenantId, tenantId)
          ))
          .limit(1);

        if (transporterResults.length > 0) {
          transporterData = transporterResults[0];
        }
      }

      // Create parking ticket
      await db.insert(parkingTickets).values({
        tenantId,
        truckAllocationId: allocationId,
        ticketNumber,
        arrivalDatetime: arrivalTime,
        personOnDuty: 'ANPR System',
        terminalNumber: '1',
        vehicleReg: allocation.vehicleReg,
        status: 'pending',
        reference: order?.orderNumber || '',
        remarks: order ? 'Booked - ANPR Auto Check-In' : 'Not Booked - ANPR Auto Check-In',
        deliveryAddress: order?.destinationAddress || '',
        customerNumber: client?.code || '',
        customerName: client?.name || '',
        customerPhone: client?.phone || '',
        transporterNumber: transporterData?.code || '',
        transporterName: allocation.transporter || '',
        transporterPhone: transporterData?.phone || '',
        driverName: allocation.driverName || '',
        driverContactNumber: allocation.driverPhone || '',
        freightCompanyName: 'Bulk Connections',
      });

      console.log(`   🎫 Parking ticket ${ticketNumber} created automatically for allocation ${allocationId}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to create parking ticket for allocation ${allocationId}:`, error.message);
    }
  }

  /**
   * Create a non-matched visit record for plates detected without scheduled allocation
   */
  private async createNonMatchedAllocation(detection: ANPRPlateDetection, tenantId: string): Promise<void> {
    try {
      const siteId = parseInt(process.env.SITE_ID || '1');

      // Create non-matched visit with 'arrived' status (Checked In on loading board)
      // The verification status will be 'non_matched' to indicate it's an unplanned visit
      const [newVisit] = await db.insert(plannedVisits).values({
        tenantId,
        orderId: null, // No order linked
        siteId,
        plateNumber: detection.plateNumber,
        driverName: 'Unknown', // Required field - unknown for non-matched plates
        status: 'arrived', // Checked In status for loading board
        actualArrival: new Date(detection.detectedAt),
        scheduledArrival: new Date(detection.detectedAt),
        specialInstructions: `ANPR detected plate without scheduled allocation. Detected at ${detection.detectedAt} via ${detection.cameraType}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      console.log(`   ⚠️  Non-matched visit created (ID: ${newVisit.id})`);
      console.log(`   Plate: ${detection.plateNumber} | Status: arrived (Non-Matched)`);

      // Create parking ticket for non-matched visit
      await this.createParkingTicketForVisit(newVisit.id, tenantId, new Date(detection.detectedAt), detection.plateNumber);

      // Invalidate cache after creating non-matched visit
      await invalidateCache('truck-allocations:*');
      await invalidateCache('visits:*');

    } catch (error: any) {
      console.error(`   ❌ Failed to create non-matched visit for plate ${detection.plateNumber}:`, error.message);
    }
  }

  /**
   * Create parking ticket for non-matched visit
   */
  private async createParkingTicketForVisit(visitId: number, tenantId: string, arrivalTime: Date, plateNumber: string): Promise<void> {
    try {
      // Check if parking ticket already exists for this visit
      const existingTicket = await db
        .select()
        .from(parkingTickets)
        .where(and(
          eq(parkingTickets.visitId, visitId),
          eq(parkingTickets.tenantId, tenantId)
        ))
        .limit(1);

      if (existingTicket.length > 0) {
        console.log(`   ⚠️  Parking ticket already exists for visit ${visitId}`);
        return;
      }

      // Generate ticket number
      const year = new Date().getFullYear();
      const prefix = `PT-${year}-`;

      const latestTickets = await db
        .select({ ticketNumber: parkingTickets.ticketNumber })
        .from(parkingTickets)
        .where(eq(parkingTickets.tenantId, tenantId))
        .orderBy(desc(parkingTickets.ticketNumber))
        .limit(1);

      let sequence = 1;
      if (latestTickets.length > 0 && latestTickets[0].ticketNumber.startsWith(prefix)) {
        const lastNumber = latestTickets[0].ticketNumber.replace(prefix, '');
        sequence = parseInt(lastNumber) + 1;
      }

      const ticketNumber = `${prefix}${sequence.toString().padStart(6, '0')}`;

      // Create parking ticket for visit
      await db.insert(parkingTickets).values({
        tenantId,
        visitId: visitId, // Link to visit instead of allocation
        ticketNumber,
        arrivalDatetime: arrivalTime,
        personOnDuty: 'ANPR System',
        terminalNumber: '1',
        vehicleReg: plateNumber,
        status: 'pending',
        reference: 'Non-Matched Visit',
        remarks: 'Non-Matched Plate - No Scheduled Allocation',
        freightCompanyName: 'Unknown',
      });

      console.log(`   🎫 Parking ticket ${ticketNumber} created for non-matched visit ${visitId}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to create parking ticket for visit ${visitId}:`, error.message);
    }
  }
}

export const anprCheckerService = new ANPRCheckerService();
