
import { GoogleGenerativeAI } from "@google/generative-ai";
import { read, utils } from "xlsx";

// Initialize Gemini
const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export interface ParsedOrder {
  customer_name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  phone: string;
  order_number: string;
  delivery_date: string;
  notes: string;
  priority_level?: 'normal' | 'high' | 'critical';
  time_window_start?: string;
  time_window_end?: string;
}

// Convert File to Base64 or Text helper
export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } } | { text: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    // Check if it's an Excel/CSV file
    if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const csvText = utils.sheet_to_csv(worksheet);
          resolve({ text: csvText });
        } catch (err) {
          reject(err);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // Handle Images
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        resolve({
          inlineData: {
            data: base64Data,
            mimeType: file.type,
          },
        });
      };
      reader.readAsDataURL(file);
    }
    reader.onerror = reject;
  });
}


const SYSTEM_PROMPT = `
You are an AI assistant for a delivery logistics app.
Your task is to extract delivery order details from the provided input (text or image).
The input might be a chat message, an email, a screenshot of a list, or a spreadsheet row.

IMPORTANT: Your goal is to extract as many valid orders as possible.
It is common for some details (like Customer Name, Phone, or Notes) to be missing. This is ACCEPTABLE.
- ALways extract the Address.
- If other fields are present, extract them.
- If a field is MISSING in the input, explicitly return an empty string "" (do not hallucinate).
- Treat each address found as a separate order.

Extract the orders and return them as a JSON OBJECT with a key "orders" containing an ARRAY of objects.
Example: { "orders": [ { "customer_name": "John", "address": "123 Main St", "priority_level": "normal", "time_window_start": "09:00", "time_window_end": "12:00" } ] }

Fields to extract for each order:
- customer_name (string): Name of the recipient. If missing, use "".
- address (string): Full street address.
- city (string)
- state (string)
- zip_code (string)
- phone (string)
- order_number (string)
- delivery_date (string): YYYY-MM-DD.
- notes (string)
- priority_level (string): 'normal', 'high', or 'critical'. Infer from keywords:
    - 'Critical', 'Emergency', 'Life Threatening' -> 'critical'
    - 'High', 'Urgent', 'ASAP', 'Rush' -> 'high'
    - Otherwise 'normal'.
- time_window_start (string): HH:MM (24h format). Start of delivery window. Empty if none.
- time_window_end (string): HH:MM (24h format). End of delivery window. Empty if none.
    - Examples:
    - "Deliver by 5pm" -> start: "", end: "17:00"
    - "Window 9am - 1pm" -> start: "09:00", end: "13:00"
    - "After 14:00" -> start: "14:00", end: ""
    - "At 10:30" -> start: "10:15", end: "10:45" (approx window)

If a field is missing, use "".
RETURN ONLY THE RAW JSON.
`;

export async function parseOrderAI(input: string | File | File[]): Promise<ParsedOrder[]> {
  if (!apiKey) {
    console.error("Gemini API Key is missing");
    throw new Error("Configuration Error: Gemini API Key is missing. Please check your .env settings.");
  }

  // Reverting to User's preferred model
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

  try {
    let resultPromise;
    const prompt = `${SYSTEM_PROMPT}\nCurrent Date: ${new Date().toISOString().split('T')[0]}`;

    if (typeof input === 'string') {
      resultPromise = model.generateContent([prompt, `\nDATA TO EXTRACT FROM:\n\`\`\`text\n${input}\n\`\`\`\n`]);
    } else if (Array.isArray(input)) {
      // Handle multiple files
      const parts = await Promise.all(input.map(file => fileToGenerativePart(file)));
      // Separate text parts (Spreadsheets) from image parts
      const promptParts: any[] = [prompt];
      parts.forEach(p => {
        if ('text' in p) {
          promptParts.push(`\nSPREADSHEET DATA (${(p as any).filename || 'File'}):\n${p.text}\n`);
        } else {
          promptParts.push(p);
        }
      });
      resultPromise = model.generateContent(promptParts);
    } else {
      // Handle single file
      const part = await fileToGenerativePart(input);
      if ('text' in part) {
        resultPromise = model.generateContent([prompt, `\nSPREADSHEET DATA:\n${part.text}\n`]);
      } else {
        resultPromise = model.generateContent([prompt, part]);
      }
    }

    // Add 60s Timeout (Pro matches might be slower)
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out. The AI model took too long to respond.")), 60000)
    );

    const result = await Promise.race([resultPromise, timeoutPromise]) as any;
    const response = await result.response;
    const textResponse = response.text();

    console.log("Gemini Raw Response:", textResponse);

    if (!textResponse) {
      throw new Error("The AI returned an empty response. Please try a different image.");
    }

    const cleanJson = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      throw new Error("Failed to parse AI response. The model returned malformed data.");
    }

    let orders: ParsedOrder[] = [];

    // Normalize output
    if (parsed.orders && Array.isArray(parsed.orders)) {
      orders = parsed.orders;
    } else if (Array.isArray(parsed)) {
      orders = parsed;
    } else if (parsed && typeof parsed === 'object') {
      // Single object case
      orders = [parsed] as ParsedOrder[];
    }

    if (orders.length === 0) {
      throw new Error("Scaling/Parsing Complete, but no valid orders were found. Ensure the image text is legible.");
    }

    return orders;

  } catch (error: any) {
    console.error("Gemini AI Error:", error);
    // Propagate the specific error message
    throw new Error(error.message || "An unexpected error occurred during AI processing.");
  }
}
