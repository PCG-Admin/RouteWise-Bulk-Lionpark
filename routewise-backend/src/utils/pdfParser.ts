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
      model: 'gemini-2.0-flash-exp',
    });

    console.log('🤖 Sending PDF to Gemini for analysis...');

    // Create detailed prompt for structured extraction
    const prompt = `Analyze this shipping/logistics order document and extract ALL truck allocation details into a structured JSON format.

The document may contain:
- Order number or dispatch ticket number
- Customer/client name
- Product/material type (Chrome Concentrate, Iron Ore, etc.)
- Origin/source location
- Destination location
- Truck details (vehicle registration, driver, weights, dates)

IMPORTANT EXTRACTION RULES:
1. Extract EVERY truck/vehicle entry from the document
2. Look for columns like: Registration, Ticket No, Driver, Transporter, Gross, Tare, Nett/Net, Date
3. Handle multiple formats (table layouts, detailed reports, etc.)
4. Extract ALL weight values (gross, tare, net) in their original units
5. Parse dates in any format (DD/MM/YYYY, YYYY-MM-DD, etc.)
6. Capture transporter/haulier names
7. Look for order numbers in headers or ticket references

Return ONLY a valid JSON object with this exact structure:
{
  "orderNumber": "extracted order number or generate from context",
  "product": "material type (e.g., Chrome Concentrate MG, Iron Ore)",
  "clientName": "customer or supplier name",
  "originAddress": "origin location or mine name",
  "destinationAddress": "destination location or port name",
  "totalQuantity": 0,
  "unit": "kg or tons",
  "allocations": [
    {
      "vehicleReg": "vehicle registration number",
      "ticketNo": "ticket or reference number",
      "driverName": "driver name if available",
      "transporter": "transporter/haulier company name",
      "grossWeight": "gross weight as string with number",
      "tareWeight": "tare weight as string with number",
      "netWeight": "net weight as string with number",
      "scheduledDate": "YYYY-MM-DD format or null",
      "productDescription": "product details if different per truck"
    }
  ]
}

CRITICAL: Extract ALL trucks from the document. If you see 50 trucks, return 50 entries.`;

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
    const allocations: ParsedTruckAllocation[] = (extracted.allocations || []).map((alloc: any) => ({
      vehicleReg: alloc.vehicleReg || '',
      ticketNo: alloc.ticketNo || undefined,
      driverName: alloc.driverName || undefined,
      driverPhone: alloc.driverPhone || undefined,
      driverId: alloc.driverId || undefined,
      transporter: alloc.transporter || undefined,
      grossWeight: alloc.grossWeight || undefined,
      tareWeight: alloc.tareWeight || undefined,
      netWeight: alloc.netWeight || undefined,
      scheduledDate: alloc.scheduledDate ? new Date(alloc.scheduledDate) : undefined,
      productDescription: alloc.productDescription || undefined,
    }));

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
