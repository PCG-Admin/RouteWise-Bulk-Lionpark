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
  format: 'dispatch' | 'entity' | 'weighbridge' | 'standard';
  order: ParsedOrder;
  allocations: ParsedTruckAllocation[];
}

/**
 * Detect file format by checking for dispatch-style or entity-style header
 */
function detectFormat(sheet: XLSX.WorkSheet): 'dispatch' | 'entity' | 'weighbridge' | 'standard' {
  // Check multiple cells for format indicators
  const cellA1 = sheet['A1'];
  const cellA2 = sheet['A2'];
  const cellA3 = sheet['A3'];
  const cellB1 = sheet['B1'];

  // Helper to get cell value as uppercase string
  const getCellValue = (cell: any): string => {
    if (cell && cell.v && typeof cell.v === 'string') {
      return cell.v.toUpperCase();
    }
    return '';
  };

  const a1 = getCellValue(cellA1);
  const a2 = getCellValue(cellA2);
  const a3 = getCellValue(cellA3);
  const b1 = getCellValue(cellB1);

  // Weighbridge Details Report format (Northam, etc.)
  if (a1.includes('WEIGHBRIDGE') || a1.includes('DETAILS REPORT') ||
      a2.includes('WEIGHBRIDGE') || a2.includes('DETAILS REPORT')) {
    return 'weighbridge';
  }

  // Entity/Order Detail Report format
  if (a1.includes('ORDER DETAIL') || a2.includes('ORDER DETAIL') ||
      a1.includes('DISPATCH TICKET') || a2.includes('DISPATCH TICKET')) {
    return 'entity';
  }

  // Dispatch/GCOS format
  if (a2.includes('NAME OF SITE') || a2.includes('SITE:') || a2.includes('MINE') ||
      a1.includes('DISPATCH') || a2.includes('DISPATCH')) {
    return 'dispatch';
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

  // Extract allocations with extensive column name matching
  const allocations: ParsedTruckAllocation[] = truckData
    .filter(row => row['Registration'] || row['Vehicle'] || row['Reg No'] || row['Truck Reg No'] || row['Horse Reg'])
    .map(row => {
      const allocation: ParsedTruckAllocation = {
        vehicleReg: row['Registration'] || row['Vehicle'] || row['Reg No'] || row['Vehicle Reg'] ||
                    row['Truck Reg No'] || row['Horse Reg'] || row['TRUCK REG'] || row['Truck'] || '',
        ticketNo: row['Ticket'] || row['Ticket No'] || row['Ticket Number'] || row['Ticket Day'] || row['Contact No'],
        transporter: row['Haulier'] || row['Transporter'] || row['Carrier'] || row['Hauler'] || row['Freight Company'],
        driverName: row['Driver'] || row['Driver Name'],
        grossWeight: String(row['Gross'] || row['Gross Weight'] || row['GROSS'] || row['Advised Gross(Kgs)'] || ''),
        tareWeight: String(row['Tare'] || row['Tare Weight'] || row['TARE'] || row['Advised(Kgs)'] || ''),
        netWeight: String(row['Nett'] || row['Net'] || row['Net Weight'] || row['NETT'] || row['Advised Mass (Kgs)'] || ''),
        productDescription: row['Product'] || row['Description'] || row['Material'] || row['Commodity'],
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
 * - Row 2: "Order Detail Report" title
 * - Row 6-8: Order details (Order No:, Material:, Customer/Supplier:)
 * - Row 10+: Column headers and truck data
 */
function parseEntityFormat(sheet: XLSX.WorkSheet, filename: string): ParsedExcelData {
  console.log('🔍 Parsing ENTITY format file:', filename);

  // Extract order info by searching rows 4-9 for key fields
  const rowrange = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  let orderNumber = '';
  let product = '';
  let clientName = '';
  let supplierName = '';

  // Search multiple rows for order metadata
  console.log('🔍 Searching for Entity metadata in rows 4-9...');
  for (let row = 3; row <= 9; row++) {
    for (let col = 0; col <= Math.min(rowrange.e.c, 15); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];

      if (cell && cell.v) {
        const value = String(cell.v);
        const valueUpper = value.toUpperCase();

        // Debug log all cells with potential keywords
        if (valueUpper.includes('ORDER') || valueUpper.includes('MATERIAL') ||
            valueUpper.includes('CUSTOMER') || valueUpper.includes('SUPPLIER') ||
            valueUpper.includes('CHROME') || valueUpper.includes('SAMANCOR')) {
          console.log(`  Row ${row + 1}, Col ${String.fromCharCode(65 + col)}: "${value}"`);
        }

        // Try to get value from same cell (after colon) or next cell
        const nextCellAddress = XLSX.utils.encode_cell({ r: row, c: col + 1 });
        const nextCell = sheet[nextCellAddress];

        // Extract order number
        if (valueUpper.includes('ORDER NO') && !orderNumber) {
          // Try same cell first (e.g., "Order No: XYZ")
          if (value.includes(':')) {
            const parts = value.split(':');
            if (parts.length > 1 && parts[1].trim()) {
              orderNumber = parts[1].trim();
            }
          }
          // Otherwise check next cell
          if (!orderNumber && nextCell && nextCell.v) {
            orderNumber = String(nextCell.v).trim();
          }
        }

        // Extract material/product
        if (valueUpper.includes('MATERIAL') && !product) {
          if (value.includes(':')) {
            const parts = value.split(':');
            if (parts.length > 1 && parts[1].trim()) {
              product = parts[1].trim();
            }
          }
          if (!product && nextCell && nextCell.v) {
            product = String(nextCell.v).trim();
          }
        }

        // Extract customer/supplier
        if ((valueUpper.includes('CUSTOMER') || valueUpper.includes('SUPPLIER')) && !clientName) {
          if (value.includes(':')) {
            const parts = value.split(':');
            if (parts.length > 1 && parts[1].trim()) {
              clientName = parts[1].trim();
            }
          }
          if (!clientName && nextCell && nextCell.v) {
            clientName = String(nextCell.v).trim();
          }
        }
      }
    }
  }

  console.log('Extracted metadata:', { orderNumber, product, clientName });

  // Parse truck data starting from Row 10 (headers) and Row 11+ (data)
  const truckData: any[] = XLSX.utils.sheet_to_json(sheet, {
    range: 9, // Row 10 is index 9 (headers)
    defval: null
  });

  console.log(`✓ Extracted ${truckData.length} truck records`);

  // Map to allocations with extensive column name matching
  const allocations: ParsedTruckAllocation[] = truckData
    .filter(row => row['Horse Reg'] || row['Ticket No'] || row['Truck Reg No'] || row['Registration'])
    .map(row => {
      const allocation: ParsedTruckAllocation = {
        vehicleReg: row['Horse Reg'] || row['Truck Reg No'] || row['Registration'] ||
                    row['Vehicle'] || row['Trailer 1 Reg No'] || '',
        ticketNo: row['Ticket No'] || row['Original Ticket No'] || row['Ticket Day'] || row['Contact No'],
        driverName: row['Driver'] || row['Driver Name'],
        transporter: row['Transporter'] || row['Haulier'] || row['Carrier'] || row['Freight Company'],
        grossWeight: String(row['Gross'] || row['Gross Weight'] || row['Advised Gross(Kgs)'] || ''),
        tareWeight: String(row['Tare'] || row['Tare Weight'] || row['Advised(Kgs)'] || ''),
        netWeight: String(row['Nett'] || row['Net'] || row['Net Weight'] || row['Advised Mass (Kgs)'] || ''),
        productDescription: row['Product'] || row['Material'] || row['Commodity'],
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
 * Parse Weighbridge Details Report format (Northam, etc.)
 * Structure:
 * - Row 1: Report title
 * - Row 2-4: Search criteria and metadata
 * - Row 6: Column headers (DATE, TRAN NO, USER, ORDER NO, TRAN TYPE, TARE, GROSS, NETT, PRODUCT, TRUCK REG, etc.)
 * - Row 7+: Transaction data
 */
function parseWeighbridgeFormat(sheet: XLSX.WorkSheet, filename: string): ParsedExcelData {
  console.log('🔍 Parsing WEIGHBRIDGE format file:', filename);

  // Search for the order number in metadata rows (typically in rows 2-5)
  let orderNumber = '';
  let customerName = '';
  let destinationName = '';

  for (let row = 1; row <= 5; row++) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    for (let col = 0; col <= Math.min(range.e.c, 20); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];

      if (cell && cell.v) {
        const value = String(cell.v).toUpperCase();

        // Look for order number patterns
        if ((value.includes('ORDER') || value.includes('ORDERNO')) && !orderNumber) {
          // Check next cell or parse from same cell
          const nextCellAddress = XLSX.utils.encode_cell({ r: row, c: col + 1 });
          const nextCell = sheet[nextCellAddress];
          if (nextCell && nextCell.v) {
            orderNumber = String(nextCell.v);
          } else {
            // Try to extract from same cell (e.g., "ORDER: XYZ")
            const match = String(cell.v).match(/ORDER[:\s]+([A-Z0-9-]+)/i);
            if (match) orderNumber = match[1];
          }
        }

        // Look for farm/customer name
        if ((value.includes('FARM') || value.includes('CUSTOMER')) && !customerName) {
          const nextCellAddress = XLSX.utils.encode_cell({ r: row, c: col + 1 });
          const nextCell = sheet[nextCellAddress];
          if (nextCell && nextCell.v) {
            customerName = String(nextCell.v);
          }
        }
      }
    }
  }

  // Find header row (look for "TRUCK REG" or "VEHICLE" column)
  let headerRow = 5; // Default
  for (let row = 4; row <= 10; row++) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
    const rowData = [];

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      if (cell && cell.v) {
        rowData.push(String(cell.v).toLowerCase());
      }
    }

    // Check if this row contains transaction headers
    if (rowData.some(val =>
      val.includes('truck') || val.includes('vehicle') ||
      val.includes('gross') || val.includes('tare') ||
      val.includes('nett') || val.includes('net')
    )) {
      headerRow = row;
      console.log(`✓ Found header row at: ${headerRow}`);
      break;
    }
  }

  // Parse transaction data
  const transactionData: any[] = XLSX.utils.sheet_to_json(sheet, {
    range: headerRow,
    defval: null
  });

  console.log(`✓ Extracted ${transactionData.length} transaction records`);

  // Map to allocations (flexible column name matching)
  const allocations: ParsedTruckAllocation[] = transactionData
    .filter(row => {
      // Must have either truck reg or ticket no
      return row['TRUCK REG'] || row['TRUCK REG:'] || row['VEHICLE'] ||
             row['TRAN NO'] || row['ORDERNO'] || row['Truck'] || row['Registration'];
    })
    .map(row => {
      const allocation: ParsedTruckAllocation = {
        vehicleReg: row['TRUCK REG'] || row['TRUCK REG:'] || row['VEHICLE'] ||
                    row['Truck'] || row['Registration'] || row['Vehicle Reg'] || '',
        ticketNo: String(row['TRAN NO'] || row['TICKET NO'] || row['Transaction'] || ''),
        transporter: row['TRANSPORTER'] || row['HAULER'] || row['Haulier'] || row['Carrier'],
        grossWeight: String(row['GROSS'] || row['GROSS:'] || row['Gross Weight'] || ''),
        tareWeight: String(row['TARE'] || row['TARE:'] || row['Tare Weight'] || ''),
        netWeight: String(row['NETT'] || row['NETT:'] || row['NET'] || row['Net Weight'] || ''),
        productDescription: row['PRODUCT'] || row['PRODUCT:'] || row['Material'] || row['Commodity'],
      };

      // Parse date
      const dateValue = row['DATE'] || row['DATE:'] || row['Date'] || row['Load Date'];
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
    })
    .filter(a => a.vehicleReg && a.vehicleReg.length > 0);

  // Calculate total weight
  const totalNetWeight = allocations.reduce((sum, truck) => {
    const weight = parseFloat(truck.netWeight || '0');
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  // Extract order number from filename if not found
  if (!orderNumber) {
    const match = filename.match(/([A-Z]{2,}[0-9]{2}-[0-9]{2}-[0-9]{1,2})/i) ||
                  filename.match(/([A-Z0-9-]{5,})/i);
    orderNumber = match ? match[1] : `WB-${Date.now()}`;
  }

  // Determine product from most common product in transactions
  const productCounts = new Map<string, number>();
  allocations.forEach(a => {
    if (a.productDescription) {
      const count = productCounts.get(a.productDescription) || 0;
      productCounts.set(a.productDescription, count + 1);
    }
  });

  let product = 'GENERAL FREIGHT';
  let maxCount = 0;
  productCounts.forEach((count, prod) => {
    if (count > maxCount) {
      maxCount = count;
      product = prod;
    }
  });

  const order: ParsedOrder = {
    orderNumber: orderNumber || `WB-${Date.now()}`,
    product,
    clientName: customerName || destinationName || 'Unknown Customer',
    originAddress: customerName || 'Unknown Origin',
    destinationAddress: destinationName || 'Unknown Destination',
    totalQuantity: totalNetWeight,
    unit: 'kg',
  };

  console.log(`✓ Created order: ${order.orderNumber} with ${allocations.length} trucks, ${totalNetWeight} kg total`);

  return {
    format: 'weighbridge',
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
  } else if (format === 'weighbridge') {
    result = parseWeighbridgeFormat(targetSheet, filename);
  } else {
    result = parseStandardFormat(targetSheet, filename);
  }

  console.log('✅ === PARSING COMPLETE ===\n');
  return result;
}
