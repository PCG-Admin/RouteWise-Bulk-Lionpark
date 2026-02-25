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
  format: 'dispatch' | 'entity' | 'weighbridge' | 'standard' | 'gcos';
  order: ParsedOrder;
  allocations: ParsedTruckAllocation[];
}

/**
 * Detect file format by checking for dispatch-style or entity-style header
 */
function detectFormat(sheet: XLSX.WorkSheet): 'dispatch' | 'entity' | 'weighbridge' | 'standard' | 'gcos' {
  // Check multiple cells for format indicators
  const cellA1 = sheet['A1'];
  const cellA2 = sheet['A2'];
  const cellA3 = sheet['A3'];
  const cellB1 = sheet['B1'];
  const cellB2 = sheet['B2'];

  // Helper to get cell value as uppercase string
  const getCellValue = (cell: any): string => {
    if (cell && cell.v !== undefined && cell.v !== null) {
      return String(cell.v).toUpperCase();
    }
    return '';
  };

  const a1 = getCellValue(cellA1);
  const a2 = getCellValue(cellA2);
  const a3 = getCellValue(cellA3);
  const b1 = getCellValue(cellB1);
  const b2 = getCellValue(cellB2);

  // Weighbridge Details Report format (Northam, etc.)
  if (a1.includes('WEIGHBRIDGE') || a1.includes('DETAILS REPORT') ||
      a2.includes('WEIGHBRIDGE') || a2.includes('DETAILS REPORT')) {
    return 'weighbridge';
  }

  // Entity/Order Detail Report format (Samancor, EDSON — title in A2)
  if (a1.includes('ORDER DETAIL') || a2.includes('ORDER DETAIL') ||
      a1.includes('DISPATCH TICKET') || a2.includes('DISPATCH TICKET')) {
    return 'entity';
  }

  // GCOS format: Samancor Chrome GCOS 48hr Report (title in B2)
  if (b2.includes('GCOS') || (b2.includes('SAMANCOR') && b2.includes('REPORT'))) {
    return 'gcos';
  }

  // Dispatch format: DISPATCH TO DURBAN style (NAME OF SITE in A2)
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
 * Scan a sheet row from startCol+1 rightward and return the first non-empty cell value.
 * Used for entity format where label cells (e.g. "Order No:") and value cells
 * (e.g. the actual order number) are separated by several empty columns.
 */
function getNextNonEmptyInRow(sheet: XLSX.WorkSheet, row: number, startCol: number, endCol: number): string {
  for (let col = startCol + 1; col <= endCol; col++) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
    if (cell && cell.v !== null && cell.v !== undefined) {
      const val = String(cell.v).trim();
      if (val) return val;
    }
  }
  return '';
}

/**
 * Derive a human-readable destination from an Entity order number.
 * Order numbers ending in "-BC" or "--BC" map to Bulk Connections, Durban.
 */
function deriveEntityDestination(orderNumber: string): string {
  if (/[-_]BC$/i.test(orderNumber)) return 'Bulk Connections, Durban';
  if (orderNumber.toUpperCase().includes('DURBAN')) return 'Durban Port';
  return 'Port / Destination';
}

/**
 * Parse Entity format (Entity_EDSON, Entity_Samancor files)
 * Structure:
 * - Row 2:  "Order Detail Report" title  (A2)
 * - Row 6:  Label cells in B, I, P, V — values in E, L, T, Y (separated by empty cols)
 *           e.g. B6="Order No:" → E6=actual order number
 * - Row 10: Column headers
 * - Row 11+: Truck data
 */
function parseEntityFormat(sheet: XLSX.WorkSheet, filename: string): ParsedExcelData {
  console.log('🔍 Parsing ENTITY format file:', filename);

  const sheetRange = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  let orderNumber = '';
  let product = '';
  let clientName = '';

  // The metadata row is row 6 (index 5). Labels and values are widely spaced across columns.
  // Scan the entire row; when we find a label keyword, grab the next non-empty cell value.
  const metaRows = [5, 6, 7]; // rows 6-8 (0-indexed) to be safe
  console.log('🔍 Scanning Entity metadata rows 6-8 for label-value pairs...');

  for (const metaRow of metaRows) {
    for (let col = 0; col <= sheetRange.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: metaRow, c: col })];
      if (!cell || cell.v === null || cell.v === undefined) continue;

      const value = String(cell.v).trim();
      const valueUpper = value.toUpperCase();

      if (valueUpper.includes('ORDER NO') && !orderNumber) {
        // Value is embedded after colon (same cell) OR in a distant column to the right
        if (value.includes(':') && value.split(':')[1].trim()) {
          orderNumber = value.split(':')[1].trim();
        } else {
          orderNumber = getNextNonEmptyInRow(sheet, metaRow, col, sheetRange.e.c);
        }
        console.log(`  Found Order No at col ${col}: "${orderNumber}"`);
      }

      if (valueUpper.includes('MATERIAL') && !product) {
        if (value.includes(':') && value.split(':')[1].trim()) {
          product = value.split(':')[1].trim();
        } else {
          product = getNextNonEmptyInRow(sheet, metaRow, col, sheetRange.e.c);
        }
        console.log(`  Found Material at col ${col}: "${product}"`);
      }

      if ((valueUpper.includes('CUSTOMER') || valueUpper.includes('SUPPLIER')) && !clientName) {
        if (value.includes(':') && value.split(':')[1].trim()) {
          clientName = value.split(':')[1].trim();
        } else {
          clientName = getNextNonEmptyInRow(sheet, metaRow, col, sheetRange.e.c);
        }
        console.log(`  Found Client at col ${col}: "${clientName}"`);
      }
    }
    if (orderNumber && product && clientName) break; // found everything early
  }

  console.log('Extracted metadata:', { orderNumber, product, clientName });

  // Find the actual header row (look for "Horse Reg", "Ticket No", "Gross" etc.)
  let headerRowIndex = 9; // default row 10 (0-indexed)
  for (let row = 7; row <= 15; row++) {
    const rowCells: string[] = [];
    for (let col = 0; col <= Math.min(sheetRange.e.c, 25); col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell?.v) rowCells.push(String(cell.v).toLowerCase());
    }
    if (rowCells.some(v => v.includes('horse reg') || v.includes('ticket no') || v.includes('gross'))) {
      headerRowIndex = row;
      console.log(`✓ Found Entity header row at index ${headerRowIndex} (row ${headerRowIndex + 1})`);
      break;
    }
  }

  // Parse truck data from detected header row
  const truckData: any[] = XLSX.utils.sheet_to_json(sheet, {
    range: headerRowIndex,
    defval: null,
  });

  console.log(`✓ Extracted ${truckData.length} truck records`);

  const allocations: ParsedTruckAllocation[] = truckData
    .filter(row => row['Horse Reg'] || row['Ticket No'] || row['Truck Reg No'] || row['Registration'])
    .map(row => {
      const allocation: ParsedTruckAllocation = {
        vehicleReg: row['Horse Reg'] || row['Truck Reg No'] || row['Registration'] ||
                    row['Vehicle'] || row['Trailer 1 Reg No'] || '',
        ticketNo: String(row['Ticket No'] || row['Original Ticket No'] || row['Ticket Day'] || ''),
        driverName: row['Driver'] || row['Driver Name'],
        transporter: row['Transporter'] || row['Haulier'] || row['Carrier'] || row['Freight Company'],
        grossWeight: String(row['Gross'] || row['Gross Weight'] || row['Advised Gross(Kgs)'] || ''),
        tareWeight: String(row['Tare'] || row['Tare Weight'] || row['Advised(Kgs)'] || ''),
        netWeight: String(row['Nett'] || row['Net'] || row['Net Weight'] || row['Advised Mass (Kgs)'] || ''),
        productDescription: row['Product'] || row['Material'] || row['Commodity'],
      };

      const dateValue = row['Date'] || row['Date In'];
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

  const totalNetWeight = allocations.reduce((sum, truck) => {
    const weight = parseFloat(truck.netWeight || '0');
    return sum + (isNaN(weight) ? 0 : weight);
  }, 0);

  // Fallback: try to read full order number from Summary sheet (sheet C2 in the workbook)
  // — not accessible here, so derive from the data sheet name if needed
  if (!orderNumber) {
    const match = filename.match(/Entity[_\s]+([^_]+)/i);
    orderNumber = match ? match[1].replace(/\s+/g, '-') : `ENT-${Date.now()}`;
  }

  const order: ParsedOrder = {
    orderNumber: orderNumber || `ENT-${Date.now()}`,
    product: product || 'GENERAL FREIGHT',
    clientName: clientName.trim() || 'Unknown Customer',
    originAddress: clientName.trim() ? `${clientName.trim()} (Mine)` : 'Mine Site',
    destinationAddress: deriveEntityDestination(orderNumber),
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
 * Parse GCOS format (Samancor Chrome GCOS 48hr Report)
 * Structure:
 * - B2: Report title ("Durban (Bulk Connection) - Samancor Chrome GCOS (48hr) Report...")
 * - B5: Site/origin code (e.g. "WCM")
 * - B6: Order/batch number (e.g. "W2632")
 * - Row 7: Column headers (Transporter, Ticket Day, Site, Destination, Truck Reg No, ...)
 * - Row 8+: Truck data — Transporter appears only on first row of each group
 */
function parseGCOSFormat(sheet: XLSX.WorkSheet, filename: string): ParsedExcelData {
  console.log('🔍 Parsing GCOS format file:', filename);

  const title = sheet['B2']?.v ? String(sheet['B2'].v).split('\n')[0].trim() : '';
  const siteCode = sheet['B5']?.v ? String(sheet['B5'].v).trim() : '';
  const orderNumber = sheet['B6']?.v ? String(sheet['B6'].v).trim() : '';

  console.log(`  Title: ${title}`);
  console.log(`  Site: ${siteCode}, Order: ${orderNumber}`);

  // Find header row (look for "Truck Reg No" column)
  let headerRowIndex = 6; // default row 7 (0-indexed)
  const sheetRange = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  for (let row = 4; row <= 10; row++) {
    const rowCells: string[] = [];
    for (let col = 0; col <= sheetRange.e.c; col++) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell?.v) rowCells.push(String(cell.v).toLowerCase());
    }
    if (rowCells.some(v => v.includes('truck reg') || v.includes('truck reg no'))) {
      headerRowIndex = row;
      console.log(`✓ Found GCOS header row at index ${headerRowIndex} (row ${headerRowIndex + 1})`);
      break;
    }
  }

  const rawData: any[] = XLSX.utils.sheet_to_json(sheet, {
    range: headerRowIndex,
    defval: null,
  });

  // GCOS transporter name only appears on the first truck of each transporter group.
  // Subsequent trucks in the group have an empty Transporter cell.
  let currentTransporter = '';

  const allocations: ParsedTruckAllocation[] = rawData
    .map(row => {
      // Update transporter when present (strip "#Trucks: N" annotation)
      const transporterCell = row['Transporter'];
      if (transporterCell) {
        currentTransporter = String(transporterCell).split('\n')[0].trim();
      }

      // Truck Reg No column
      const vehicleReg = String(row['Truck Reg No'] || '').trim();
      if (!vehicleReg) return null;

      // Header has newlines: 'Tare\n(KGs)', 'Waybill\n' — find by partial key match
      const keys = Object.keys(row);
      const tareKey = keys.find(k => k.toLowerCase().includes('tare'));
      const waybillKey = keys.find(k => k.toLowerCase().includes('waybill'));
      const grossKey = keys.find(k => k.toLowerCase().includes('advised gross'));
      const netKey = keys.find(k => k.toLowerCase().includes('advised mass'));

      const allocation: ParsedTruckAllocation = {
        vehicleReg,
        ticketNo: waybillKey ? String(row[waybillKey] || '').trim() : undefined,
        transporter: currentTransporter || undefined,
        driverId: row['Driver ID No'] ? String(row['Driver ID No']).trim() : undefined,
        grossWeight: grossKey ? String(row[grossKey] || '').trim() : undefined,
        tareWeight: tareKey ? String(row[tareKey] || '').trim() : undefined,
        netWeight: netKey ? String(row[netKey] || '').trim() : undefined,
        productDescription: title.toLowerCase().includes('chrome') ? 'Chrome Concentrate' : undefined,
      };

      const dateValue = row['Ticket Day'] || row['Released Time'];
      if (dateValue instanceof Date) {
        allocation.scheduledDate = dateValue;
      }

      return allocation;
    })
    .filter((a): a is ParsedTruckAllocation => a !== null && a.vehicleReg.length > 0);

  const totalNetWeight = allocations.reduce((sum, a) => {
    const w = parseFloat(a.netWeight || '0');
    return sum + (isNaN(w) ? 0 : w);
  }, 0);

  // Destination comes from the "Destination" column of the first data row
  const firstRow = rawData.find(r => r['Destination']);
  const destination = firstRow?.['Destination']
    ? String(firstRow['Destination']).trim()
    : 'Bulk Connections, Durban';

  const product = title.toLowerCase().includes('chrome') ? 'Chrome Concentrate' : 'GENERAL FREIGHT';

  // Client name: extract from title (format: "Destination - ClientName GCOS Report")
  const titleMatch = title.match(/-\s*(.+?)\s+GCOS/i);
  const clientName = titleMatch ? titleMatch[1].trim() : (siteCode || 'Unknown Customer');

  const order: ParsedOrder = {
    orderNumber: orderNumber || `GCOS-${Date.now()}`,
    product,
    clientName,
    originAddress: siteCode || 'Mine Site',
    destinationAddress: destination,
    totalQuantity: totalNetWeight,
    unit: 'kg',
  };

  console.log(`✓ Created GCOS order: ${order.orderNumber} with ${allocations.length} trucks, ${totalNetWeight} kg total`);

  return {
    format: 'gcos',
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
  } else if (format === 'gcos') {
    result = parseGCOSFormat(targetSheet, filename);
  } else {
    result = parseStandardFormat(targetSheet, filename);
  }

  console.log('✅ === PARSING COMPLETE ===\n');
  return result;
}
