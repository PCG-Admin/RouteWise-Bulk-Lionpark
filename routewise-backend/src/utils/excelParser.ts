import * as XLSX from 'xlsx';

/**
 * Smart Excel Parser - Handles multiple file formats
 * 1. Dispatch Format: Order info at top (rows 2-4), trucks below (row 13+)
 * 2. Standard Format: Just truck rows with headers
 */

export interface ParsedOrder {
  orderNumber: string;
  product: string;
  clientName: string;
  supplierName?: string;
  originAddress: string;
  destinationAddress: string;
  totalQuantity: number;
  unit: string;
}

export interface ParsedTruckAllocation {
  vehicleReg: string;
  ticketNo?: string;
  driverName?: string;
  driverPhone?: string;
  driverId?: string;
  transporter?: string;
  grossWeight?: string;
  tareWeight?: string;
  netWeight?: string;
  scheduledDate?: Date;
  productDescription?: string;
}

export interface ParsedExcelData {
  format: 'dispatch' | 'entity' | 'standard';
  order: ParsedOrder;
  allocations: ParsedTruckAllocation[];
}

/**
 * Detect file format by checking for dispatch-style or entity-style header
 */
function detectFormat(sheet: XLSX.WorkSheet): 'dispatch' | 'entity' | 'standard' {
  // Check for Entity format (has "Order Detail Report" in A2)
  const cellA2 = sheet['A2'];
  if (cellA2 && cellA2.v && typeof cellA2.v === 'string') {
    const valueA2 = cellA2.v.toUpperCase();

    // Entity format check
    if (valueA2.includes('ORDER DETAIL REPORT')) {
      return 'entity';
    }

    // Dispatch format check
    if (valueA2.includes('NAME OF SITE') || valueA2.includes('SITE:') || valueA2.includes('MINE')) {
      return 'dispatch';
    }
  }

  return 'standard';
}

/**
 * Extract value from a cell that might contain "LABEL: Value" format
 */
function extractLabelValue(cellValue: any): string {
  if (!cellValue) return '';
  const str = String(cellValue);
  const colonIndex = str.indexOf(':');
  if (colonIndex !== -1) {
    return str.substring(colonIndex + 1).trim();
  }
  return str.trim();
}

/**
 * Parse Dispatch format (DISPATCH TO DURBAN, Entity files)
 */
function parseDispatchFormat(sheet: XLSX.WorkSheet, filename: string): ParsedExcelData {
  console.log('🔍 Parsing DISPATCH format file:', filename);

  // Extract order info from specific cells (rows 2-4)
  const siteName = extractLabelValue(sheet['A2']?.v);
  const customerName = extractLabelValue(sheet['A3']?.v);
  const destination = extractLabelValue(sheet['A4']?.v);

  // Find where truck data starts (look for column headers)
  let headerRow = 12; // Default row 12
  let truckDataStartRow = 13; // Default row 13

  // Try to find the header row by looking for "Registration" or "Vehicle" column
  for (let row = 5; row <= 20; row++) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rowData = [];
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      if (cell && cell.v) {
        rowData.push(String(cell.v).toLowerCase());
      }
    }

    // Check if this row contains truck data headers
    if (rowData.some(val =>
      val.includes('registration') ||
      val.includes('vehicle') ||
      val.includes('ticket') ||
      val.includes('gross')
    )) {
      headerRow = row;
      truckDataStartRow = row + 1;
      console.log(`✓ Found header row at: ${headerRow}`);
      break;
    }
  }

  // Parse truck data starting from detected row
  const truckData: any[] = XLSX.utils.sheet_to_json(sheet, {
    range: headerRow,
    defval: null
  });

  console.log(`✓ Extracted ${truckData.length} truck records`);

  // Extract allocations
  const allocations: ParsedTruckAllocation[] = truckData
    .filter(row => row['Registration'] || row['Vehicle'] || row['Reg No'])
    .map(row => {
      const allocation: ParsedTruckAllocation = {
        vehicleReg: row['Registration'] || row['Vehicle'] || row['Reg No'] || row['Vehicle Reg'] || '',
        ticketNo: row['Ticket'] || row['Ticket No'] || row['Ticket Number'],
        transporter: row['Haulier'] || row['Transporter'] || row['Carrier'],
        grossWeight: String(row['Gross'] || row['Gross Weight'] || ''),
        tareWeight: String(row['Tare'] || row['Tare Weight'] || ''),
        netWeight: String(row['Nett'] || row['Net'] || row['Net Weight'] || ''),
        productDescription: row['Product'] || row['Description'],
      };

      // Parse date
      const dateValue = row['Date'] || row['Load Date'] || row['Dispatch Date'];
      if (dateValue) {
        if (dateValue instanceof Date) {
          allocation.scheduledDate = dateValue;
        } else if (typeof dateValue === 'number') {
          // Excel serial date
          const excelEpoch = new Date(1899, 11, 30);
          allocation.scheduledDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        } else if (typeof dateValue === 'string') {
          allocation.scheduledDate = new Date(dateValue);
        }
      }

      return allocation;
    })
    .filter(a => a.vehicleReg); // Only keep records with vehicle registration

  // Calculate total quantity from truck weights
  const totalNetWeight = allocations.reduce((sum, truck) => {
    const weight = parseFloat(truck.netWeight || '0');
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  // Determine order number from truck data or filename
  let orderNumber = '';
  if (truckData.length > 0) {
    orderNumber = truckData[0]['Order Number'] ||
                  truckData[0]['Order'] ||
                  truckData[0]['PO Number'] || '';
  }

  // If still no order number, generate from filename
  if (!orderNumber) {
    // Extract from filename (e.g., "DISPATCH TO DURBAN-4" -> "DURBAN-4")
    const match = filename.match(/([A-Z0-9-]+)\.xlsx?$/i);
    orderNumber = match ? match[1] : `ORD-${Date.now()}`;
  }

  // Determine product
  const product = (truckData[0] && truckData[0]['Product']) ||
                  'GENERAL FREIGHT';

  const order: ParsedOrder = {
    orderNumber,
    product,
    clientName: customerName || 'Unknown Customer',
    originAddress: siteName || 'Unknown Origin',
    destinationAddress: destination || 'Unknown Destination',
    totalQuantity: totalNetWeight,
    unit: 'kg',
  };

  console.log(`✓ Created order: ${orderNumber} with ${allocations.length} trucks, ${totalNetWeight} kg total`);

  return {
    format: 'dispatch',
    order,
    allocations,
  };
}

/**
 * Parse Standard format (just truck rows)
 */
function parseStandardFormat(sheet: XLSX.WorkSheet, filename: string): ParsedExcelData {
  console.log('🔍 Parsing STANDARD format file:', filename);

  const truckData: any[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`✓ Extracted ${truckData.length} rows`);

  if (truckData.length === 0) {
    throw new Error('No data found in Excel file');
  }

  // Map flexible column names
  const allocations: ParsedTruckAllocation[] = truckData.map(row => {
    const allocation: ParsedTruckAllocation = {
      vehicleReg: row['Registration'] || row['Vehicle'] || row['Reg No'] || row['Vehicle Registration'] || row['Truck'] || '',
      ticketNo: row['Ticket'] || row['Ticket No'] || row['Reference'],
      driverName: row['Driver Name'] || row['Driver'] || row['Operator'],
      driverPhone: row['Driver Phone'] || row['Phone'] || row['Contact'],
      driverId: row['Driver ID'] || row['ID Number'],
      transporter: row['Haulier'] || row['Transporter'] || row['Carrier'] || row['Freight Company'],
      grossWeight: String(row['Gross'] || row['Gross Weight'] || row['Loaded Weight'] || ''),
      tareWeight: String(row['Tare'] || row['Tare Weight'] || row['Empty Weight'] || ''),
      netWeight: String(row['Nett'] || row['Net'] || row['Net Weight'] || row['Cargo Weight'] || ''),
      productDescription: row['Product'] || row['Description'] || row['Commodity'],
    };

    // Parse date
    const dateValue = row['Date'] || row['Load Date'] || row['Dispatch Date'] || row['Scheduled Date'];
    if (dateValue) {
      if (dateValue instanceof Date) {
        allocation.scheduledDate = dateValue;
      } else if (typeof dateValue === 'number') {
        const excelEpoch = new Date(1899, 11, 30);
        allocation.scheduledDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
      } else if (typeof dateValue === 'string') {
        allocation.scheduledDate = new Date(dateValue);
      }
    }

    return allocation;
  }).filter(a => a.vehicleReg); // Only keep records with vehicle registration

  // Calculate total
  const totalNetWeight = allocations.reduce((sum, truck) => {
    const weight = parseFloat(truck.netWeight || '0');
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  // Extract order info from first row or use defaults
  const firstRow = truckData[0];
  const orderNumber = firstRow['Order Number'] ||
                     firstRow['Order'] ||
                     firstRow['PO Number'] ||
                     `ORD-${Date.now()}`;

  const product = firstRow['Product'] ||
                 firstRow['Description'] ||
                 firstRow['Commodity'] ||
                 'GENERAL FREIGHT';

  const clientName = firstRow['Customer'] ||
                    firstRow['Client'] ||
                    firstRow['Freight Customer'] ||
                    'Unknown Customer';

  const order: ParsedOrder = {
    orderNumber,
    product,
    clientName,
    originAddress: firstRow['Origin'] || firstRow['Pickup'] || 'Unknown Origin',
    destinationAddress: firstRow['Destination'] || firstRow['Delivery'] || 'Unknown Destination',
    totalQuantity: totalNetWeight,
    unit: 'kg',
  };

  console.log(`✓ Created order: ${orderNumber} with ${allocations.length} trucks, ${totalNetWeight} kg total`);

  return {
    format: 'standard',
    order,
    allocations,
  };
}

/**
 * Parse Entity format (Entity_EDSON, Entity_Samancor files)
 * Structure:
 * - Row 6: Order No, Material, Customer/Supplier info
 * - Row 10: Column headers
 * - Row 11+: Truck data
 */
function parseEntityFormat(sheet: XLSX.WorkSheet, filename: string): ParsedExcelData {
  console.log('🔍 Parsing ENTITY format file:', filename);

  // Extract order info from Row 6 (index 5)
  const rowrange = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  let orderNumber = '';
  let product = '';
  let clientName = '';

  // Read Row 6 to extract order details
  for (let col = 0; col <= rowrange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 5, c: col });
    const cell = sheet[cellAddress];
    const nextCellAddress = XLSX.utils.encode_cell({ r: 5, c: col + 1 });
    const nextCell = sheet[nextCellAddress];

    if (cell && cell.v) {
      const value = String(cell.v);

      // Check for "Order No:" and get the next cell value
      if (value.includes('Order No:') && nextCell && nextCell.v) {
        orderNumber = String(nextCell.v);
      }

      // Check for "Material:" and get the next cell value
      if (value.includes('Material:') && nextCell && nextCell.v) {
        product = String(nextCell.v);
      }

      // Check for "Customer / Supplier:" and get the next cell value
      if ((value.includes('Customer') || value.includes('Supplier')) && nextCell && nextCell.v) {
        clientName = String(nextCell.v);
      }
    }
  }

  // Parse truck data starting from Row 10 (headers) and Row 11+ (data)
  const truckData: any[] = XLSX.utils.sheet_to_json(sheet, {
    range: 9, // Row 10 is index 9 (headers)
    defval: null
  });

  console.log(`✓ Extracted ${truckData.length} truck records`);

  // Map to allocations
  const allocations: ParsedTruckAllocation[] = truckData
    .filter(row => row['Horse Reg'] || row['Ticket No'])
    .map(row => {
      const allocation: ParsedTruckAllocation = {
        vehicleReg: row['Horse Reg'] || row['Vehicle'] || '',
        ticketNo: row['Ticket No'] || row['Original Ticket No'],
        driverName: row['Driver'],
        transporter: row['Transporter'] || row['Haulier'],
        grossWeight: String(row['Gross'] || row['Gross Weight'] || ''),
        tareWeight: String(row['Tare'] || row['Tare Weight'] || ''),
        netWeight: String(row['Nett'] || row['Net'] || row['Net Weight'] || ''),
      };

      // Parse date (Excel serial number)
      const dateValue = row['Date'] || row['Date In'];
      if (dateValue) {
        if (dateValue instanceof Date) {
          allocation.scheduledDate = dateValue;
        } else if (typeof dateValue === 'number') {
          // Excel serial date
          const excelEpoch = new Date(1899, 11, 30);
          allocation.scheduledDate = new Date(excelEpoch.getTime() + dateValue * 24 * 60 * 60 * 1000);
        } else if (typeof dateValue === 'string') {
          allocation.scheduledDate = new Date(dateValue);
        }
      }

      return allocation;
    })
    .filter(a => a.vehicleReg && a.vehicleReg.length > 0);

  // Calculate total weight
  const totalNetWeight = allocations.reduce((sum, truck) => {
    const weight = parseFloat(truck.netWeight || '0');
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  // If order number not found in Row 6, try filename
  if (!orderNumber) {
    const match = filename.match(/Entity[_\s]+([^_]+)/i);
    orderNumber = match ? match[1].replace(/\s+/g, '-') : `ORD-${Date.now()}`;
  }

  const order: ParsedOrder = {
    orderNumber: orderNumber || `ENT-${Date.now()}`,
    product: product || 'GENERAL FREIGHT',
    clientName: clientName || 'Unknown Customer',
    originAddress: 'Mine Site',
    destinationAddress: 'Port/Destination',
    totalQuantity: totalNetWeight,
    unit: 'kg',
  };

  console.log(`✓ Created order: ${order.orderNumber} with ${allocations.length} trucks, ${totalNetWeight} kg total`);

  return {
    format: 'entity',
    order,
    allocations,
  };
}

/**
 * Main parser function - automatically detects format and parses accordingly
 */
export function parseExcelFile(buffer: Buffer, filename: string): ParsedExcelData {
  console.log('\n📄 === SMART EXCEL PARSER STARTED ===');
  console.log(`File: ${filename}`);

  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });

  if (workbook.SheetNames.length === 0) {
    throw new Error('Excel file contains no sheets');
  }

  console.log(`Total sheets: ${workbook.SheetNames.length}`);
  console.log(`Sheet names: ${workbook.SheetNames.join(', ')}`);

  // For multi-sheet files, try to find the sheet with truck data
  // Skip "Summary" sheets and use the sheet with the most rows
  let targetSheet = workbook.Sheets[workbook.SheetNames[0]];
  let targetSheetName = workbook.SheetNames[0];

  if (workbook.SheetNames.length > 1) {
    let maxRows = 0;

    for (const sheetName of workbook.SheetNames) {
      // Skip summary sheets
      if (sheetName.toLowerCase().includes('summary')) {
        console.log(`Skipping summary sheet: ${sheetName}`);
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      if (data.length > maxRows) {
        maxRows = data.length;
        targetSheet = sheet;
        targetSheetName = sheetName;
      }
    }

    console.log(`Selected sheet: ${targetSheetName} (${maxRows} rows)`);
  } else {
    console.log(`Using sheet: ${targetSheetName}`);
  }

  // Detect format
  const format = detectFormat(targetSheet);
  console.log(`Detected format: ${format.toUpperCase()}`);

  // Parse based on format
  let result: ParsedExcelData;
  if (format === 'dispatch') {
    result = parseDispatchFormat(targetSheet, filename);
  } else if (format === 'entity') {
    result = parseEntityFormat(targetSheet, filename);
  } else {
    result = parseStandardFormat(targetSheet, filename);
  }

  console.log('✅ === PARSING COMPLETE ===\n');
  return result;
}
