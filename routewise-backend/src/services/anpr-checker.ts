import { db } from '../db';
import { truckAllocations, parkingTickets, orders, clients, transporters } from '../db/schema';
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

      // Find matching truck allocation
      const allocations = await db
        .select()
        .from(truckAllocations)
        .where(eq(truckAllocations.tenantId, tenantId));

      // Match based on direction
      let matchedAllocation;

      if (detection.direction === 'entry') {
        // Entry: Look for scheduled trucks
        matchedAllocation = allocations.find(a =>
          this.normalizePlateNumber(a.vehicleReg) === plateNumber &&
          a.status === 'scheduled'
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

        // Determine target status based on detection direction and current status
        let targetStatus: string;

        if (detection.direction === 'entry') {
          // Entry detection: scheduled → arrived
          if (matchedAllocation.status === 'scheduled') {
            targetStatus = 'arrived';
          } else {
            console.log(`   Already checked in, skipping`);
            return false;
          }
        } else {
          // Exit detection: driverValidationStatus ready_for_dispatch → completed
          if (matchedAllocation.driverValidationStatus === 'ready_for_dispatch') {
            targetStatus = 'completed';
          } else {
            console.log(`   Not ready for dispatch, skipping`);
            return false;
          }
        }

        // Update allocation status
        const updateData: any = {
          status: targetStatus,
          updatedAt: new Date(),
        };

        if (targetStatus === 'arrived') {
          updateData.actualArrival = new Date(detection.detectedAt);
        }

        if (targetStatus === 'completed') {
          updateData.departureTime = new Date(detection.detectedAt);
        }

        await db
          .update(truckAllocations)
          .set(updateData)
          .where(eq(truckAllocations.id, matchedAllocation.id));

        // Invalidate cache after ANPR auto check-in/departure
        await invalidateCache('truck-allocations:*');

        console.log(`🚚 Vehicle ${matchedAllocation.vehicleReg} (ID: ${matchedAllocation.id}) → ${targetStatus}`);
        console.log(`   ${detection.direction === 'entry' ? 'CHECK-IN' : 'DEPARTURE'} via ANPR at ${detection.detectedAt}`);

        // Auto-create parking ticket on check-in (entry)
        if (detection.direction === 'entry' && targetStatus === 'arrived') {
          await this.createParkingTicket(matchedAllocation.id, tenantId, new Date(detection.detectedAt));
        }

        return true;
      } else {
        console.log(`⚠️  No match found for plate ${plateNumber}`);
        console.log(`   Checked against ${allocations.length} allocations`);
        return false;
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
}

export const anprCheckerService = new ANPRCheckerService();
