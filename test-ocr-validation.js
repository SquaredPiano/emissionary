const { OCRResponseSchema } = require('./src/lib/schemas');

// Test data that simulates the Python OCR service response
const testOCRResponse = {
  success: true,
  text: "Sample receipt text",
  confidence: 0.85,
  items: [
    {
      name: "Apple",
      quantity: 2,
      unitPrice: 1.50,
      totalPrice: 3.00,
      category: "Fruits",
      brand: "Organic",
      carbonEmissions: 0.5,
      confidence: 0.9
    }
  ],
  merchant: null,  // This was causing the validation error
  total: null,     // This was causing the validation error
  date: null,      // This was causing the validation error
  total_carbon_emissions: null,  // This was causing the validation error
  processing_time: 2.5,
  llm_enhanced: false,
  error_message: null,
  raw_ocr_data: []
};

console.log("Testing OCR response validation...");

try {
  const validatedResult = OCRResponseSchema.parse(testOCRResponse);
  console.log("✅ Validation successful!");
  console.log("Validated result:", JSON.stringify(validatedResult, null, 2));
} catch (error) {
  console.log("❌ Validation failed:");
  console.log("Error:", error.message);
} 