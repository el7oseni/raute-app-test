
import { GoogleGenerativeAI } from "@google/generative-ai";

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
}

// Convert File to Base64 helper
export async function fileToGenerativePart(file: File): Promise<{ inlineData: { data: string; mimeType: string } }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


const SYSTEM_PROMPT = `
You are an AI assistant for a delivery logistics app.
Your task is to extract delivery order details from the provided input (text or image).
The input might be a chat message, an email, a screenshot of a list, or a spreadsheet row.

Extract the orders and return them as a JSON OBJECT with a key "orders" containing an ARRAY of objects.
Example: { "orders": [ { ... }, { ... } ] }

Fields to extract for each order:
- customer_name (string): Name of the recipient.
- address (string): Full street address.
- city (string)
- state (string)
- zip_code (string)
- phone (string)
- order_number (string)
- delivery_date (string): YYYY-MM-DD.
- notes (string)

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
      resultPromise = model.generateContent([prompt, `Input Text:\n"${input}"`]);
    } else if (Array.isArray(input)) {
      // Handle multiple files
      const imageParts = await Promise.all(input.map(file => fileToGenerativePart(file)));
      resultPromise = model.generateContent([prompt, ...imageParts]);
    } else {
      // Handle single file
      const imagePart = await fileToGenerativePart(input);
      resultPromise = model.generateContent([prompt, imagePart]);
    }

    // Add 60s Timeout
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
