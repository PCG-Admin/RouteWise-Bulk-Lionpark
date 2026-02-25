import { GoogleGenerativeAI } from '@google/generative-ai';
import { ParsedOrder, ParsedTruckAllocation, ParsedExcelData } from './excelParser';

// Initialize Gemini AI
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
if (!GEMINI_API_KEY) {
  console.warn('⚠️  GEMINI_API_KEY not set - PDF parsing will not work');
}
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

/**
 * Parse PDF file using Gemini 2.5 Flash for OCR and structure extraction
 */
export async function parsePDFFile(buffer: Buffer, filename: string): Promise<ParsedExcelData> {
  console.log('\n📄 === PDF PARSER STARTED (Gemini 2.5 Flash) ===');
  console.log(`File: ${filename}`);

  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY environment variable is required for PDF parsing');
  }

  try {
    // Convert PDF buffer to base64 for Gemini
    const base64PDF = buffer.toString('base64');

    // Use Gemini 2.5 Flash model
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    console.log('🤖 Sending PDF to Gemini for analysis...');

    // Create detailed prompt for structured extraction
    const prompt = `Analyze this shipping/logistics document and extract ALL vehicle/truck allocation details into a structured JSON format.

The document may be one of several types:
1. WEIGHBRIDGE DETAILS REPORT (e.g. Northam Zondereinde): Contains columns like Date, Tran No, OrderNo, Tran Type, Tare, Gross, Nett, Product, Truck Reg, Transporter, Supplier, Destination. The order number is usually in a HEADER SECTION at the top (not per row). Extract the PRIMARY order number from the report header.
2. FLEET LIST / DRIVER ASSIGNMENT (e.g. Kookfontein): A daily list assigning trucks to an order. Contains columns like Fleet#, Horse (truck reg), Trailer 1, Trailer 2, Driver, Driver ID. Weight data may not exist. The order number and loading/offloading points appear in the header.
3. DISPATCH TICKET / ORDER REPORT: Standard dispatch document with order details and per-truck weight data.

IMPORTANT EXTRACTION RULES:
1. Extract EVERY truck/vehicle entry from the document
2. For WEIGHBRIDGE REPORTS: The OrderNo column in data rows is the order number — use it. Extract Tran No as ticketNo.
3. For FLEET LISTS: "Horse" column = truck registration. Trailers are separate registrations. No weight data is fine — leave weights empty.
4. For any format: origin = mine/site name from document header; destination = port or offloading point from document header
5. Extract ALL weight values (gross, tare, net) in their original units
6. Parse dates in any format and output as YYYY-MM-DD
7. Capture driver names AND driver ID numbers where available
8. Look for order number in: document title, header rows, "Order No", "OrderNo", "Order Number" fields

Return ONLY a valid JSON object with this exact structure (no markdown, no extra text):
{
  "orderNumber": "extracted order number from document header",
  "product": "material type (e.g., Chrome Concentrate MG, Iron Ore)",
  "clientName": "customer, supplier, or transporter company name",
  "originAddress": "origin mine or loading point name",
  "destinationAddress": "destination port or offloading point name",
  "totalQuantity": 0,
  "unit": "kg or tons",
  "allocations": [
    {
      "vehicleReg": "horse/truck registration number (not trailer)",
      "ticketNo": "ticket, transaction, or reference number",
      "driverName": "driver full name if available",
      "driverId": "driver ID number if available",
      "transporter": "transporter/haulier company name",
      "grossWeight": "gross weight as numeric string, empty string if not available",
      "tareWeight": "tare weight as numeric string, empty string if not available",
      "netWeight": "net weight as numeric string, empty string if not available",
      "scheduledDate": "YYYY-MM-DD format or null",
      "productDescription": "product per truck if specified, otherwise null"
    }
  ]
}

CRITICAL: Extract ALL trucks from the document. If you see 50 trucks, return 50 entries. Never truncate.`;

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: 'application/pdf',
          data: base64PDF
        }
      },
      prompt
    ]);

    const response = result.response;
    const text = response.text();

    console.log('✓ Received response from Gemini');
    console.log('Response length:', text.length);

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = text.trim();

    // Remove markdown code blocks if present
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*\n/, '').replace(/\n```$/, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*\n/, '').replace(/\n```$/, '');
    }

    // Parse the JSON response
    const extracted = JSON.parse(jsonText);

    console.log('✓ Parsed JSON response');
    console.log(`  Order Number: ${extracted.orderNumber}`);
    console.log(`  Product: ${extracted.product}`);
    console.log(`  Client: ${extracted.clientName}`);
    console.log(`  Allocations: ${extracted.allocations?.length || 0}`);

    // Convert dates to Date objects
    const allocations: ParsedTruckAllocation[] = (extracted.allocations || []).map((alloc: any) => {
      let scheduledDate: Date | undefined;
      if (alloc.scheduledDate) {
        const d = new Date(alloc.scheduledDate);
        if (!isNaN(d.getTime())) scheduledDate = d;
      }
      return {
        vehicleReg: alloc.vehicleReg || '',
        ticketNo: alloc.ticketNo || undefined,
        driverName: alloc.driverName || undefined,
        driverPhone: alloc.driverPhone || undefined,
        driverId: alloc.driverId || undefined,
        transporter: alloc.transporter || undefined,
        grossWeight: alloc.grossWeight || undefined,
        tareWeight: alloc.tareWeight || undefined,
        netWeight: alloc.netWeight || undefined,
        scheduledDate,
        productDescription: alloc.productDescription || undefined,
      };
    });

    // Calculate total quantity if not provided
    let totalQuantity = extracted.totalQuantity || 0;
    if (totalQuantity === 0 && allocations.length > 0) {
      totalQuantity = allocations.reduce((sum, truck) => {
        const weight = parseFloat(truck.netWeight || '0');
        return sum + (isNaN(weight) ? 0 : weight);
      }, 0);
    }

    const order: ParsedOrder = {
      orderNumber: extracted.orderNumber || `PDF-${Date.now()}`,
      product: extracted.product || 'GENERAL FREIGHT',
      clientName: extracted.clientName || 'Unknown Customer',
      supplierName: extracted.supplierName,
      originAddress: extracted.originAddress || 'Unknown Origin',
      destinationAddress: extracted.destinationAddress || 'Unknown Destination',
      totalQuantity,
      unit: extracted.unit || 'kg',
    };

    console.log(`✓ Created order: ${order.orderNumber} with ${allocations.length} trucks, ${totalQuantity} ${order.unit} total`);
    console.log('✅ === PDF PARSING COMPLETE ===\n');

    return {
      format: 'standard', // Mark as standard format for now
      order,
      allocations,
    };

  } catch (error) {
    console.error('❌ PDF parsing error:', error);

    if (error instanceof Error) {
      // Provide more helpful error messages
      if (error.message.includes('JSON')) {
        throw new Error('Failed to parse Gemini response as JSON. The PDF may be in an unsupported format.');
      } else if (error.message.includes('API')) {
        throw new Error('Gemini API error. Please check your API key and quota.');
      }
      throw new Error(`PDF parsing failed: ${error.message}`);
    }

    throw new Error('Failed to parse PDF file');
  }
}
