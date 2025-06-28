import { z } from 'zod';

// Schema for a single grocery item's carbon footprint
export const GroceryItemSchema = z.object({
  itemName: z.string().describe("The name of the grocery item, e.g., 'Beef Mince'."),
  quantity: z.string().describe("The quantity of the item, e.g., '500g'."),
  emissionsKg: z.number().describe('The calculated carbon footprint in kilograms of CO2 equivalent (kg CO2e).'),
  category: z
    .enum(['Meat', 'Dairy & Eggs', 'Produce', 'Bakery', 'Packaged Goods', 'Beverages', 'Other'])
    .describe('The food category for the item.'),
  justification: z
    .string()
    .describe('A brief justification for the emissions estimate, mentioning any assumptions made.'),
});

// Schema for the complete API response
export const EmissionsResponseSchema = z.object({
  items: z.array(GroceryItemSchema).describe('An array of all processed grocery items.'),
  totalEmissionsKg: z.number().describe('The sum total of all item emissions in kg CO2e.'),
  summary: z.string().describe("A brief, one-sentence summary of the receipt's overall impact."),
});

// Infer the TypeScript types from the Zod schemas
export type GroceryItem = z.infer<typeof GroceryItemSchema>;
export type EmissionsResponse = z.infer<typeof EmissionsResponseSchema>;
