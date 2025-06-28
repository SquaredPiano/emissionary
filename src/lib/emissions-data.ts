// Emissions data for carbon footprint calculations
// Based on Canadian government data and global food emissions factors

export interface EmissionsFactor {
  category: string;
  subcategory?: string;
  co2PerKg: number; // kg CO2e per kg of product
  source: string;
  notes?: string;
}

export interface CategoryMapping {
  keywords: string[];
  category: string;
  subcategory?: string;
}

// Canadian average emissions per person per year (2020 data)
export const CANADIAN_AVERAGE_EMISSIONS = {
  total: 14.2, // tonnes CO2e per person per year
  food: 2.5, // tonnes CO2e per person per year from food
  groceries: 1.8, // tonnes CO2e per person per year from groceries
};

// Emissions factors for different food categories (kg CO2e per kg)
export const EMISSIONS_FACTORS: EmissionsFactor[] = [
  // Meat and Dairy
  { category: 'meat', subcategory: 'beef', co2PerKg: 13.3, source: 'FAO', notes: 'Beef production' },
  { category: 'meat', subcategory: 'lamb', co2PerKg: 13.3, source: 'FAO', notes: 'Lamb production' },
  { category: 'meat', subcategory: 'pork', co2PerKg: 7.2, source: 'FAO', notes: 'Pork production' },
  { category: 'meat', subcategory: 'chicken', co2PerKg: 6.9, source: 'FAO', notes: 'Chicken production' },
  { category: 'dairy', subcategory: 'milk', co2PerKg: 1.4, source: 'FAO', notes: 'Milk production' },
  { category: 'dairy', subcategory: 'cheese', co2PerKg: 13.5, source: 'FAO', notes: 'Cheese production' },
  { category: 'dairy', subcategory: 'yogurt', co2PerKg: 1.2, source: 'FAO', notes: 'Yogurt production' },
  { category: 'dairy', subcategory: 'butter', co2PerKg: 12.1, source: 'FAO', notes: 'Butter production' },
  { category: 'dairy', subcategory: 'eggs', co2PerKg: 4.8, source: 'FAO', notes: 'Egg production' },

  // Seafood
  { category: 'seafood', subcategory: 'fish', co2PerKg: 3.0, source: 'FAO', notes: 'Wild caught fish' },
  { category: 'seafood', subcategory: 'shrimp', co2PerKg: 12.0, source: 'FAO', notes: 'Farmed shrimp' },
  { category: 'seafood', subcategory: 'salmon', co2PerKg: 4.1, source: 'FAO', notes: 'Farmed salmon' },

  // Grains and Cereals
  { category: 'grains', subcategory: 'wheat', co2PerKg: 0.9, source: 'FAO', notes: 'Wheat production' },
  { category: 'grains', subcategory: 'rice', co2PerKg: 2.7, source: 'FAO', notes: 'Rice production' },
  { category: 'grains', subcategory: 'corn', co2PerKg: 0.9, source: 'FAO', notes: 'Corn production' },
  { category: 'grains', subcategory: 'oats', co2PerKg: 0.9, source: 'FAO', notes: 'Oats production' },

  // Fruits and Vegetables
  { category: 'fruits', subcategory: 'apples', co2PerKg: 0.4, source: 'FAO', notes: 'Apple production' },
  { category: 'fruits', subcategory: 'bananas', co2PerKg: 0.7, source: 'FAO', notes: 'Banana production' },
  { category: 'fruits', subcategory: 'oranges', co2PerKg: 0.3, source: 'FAO', notes: 'Orange production' },
  { category: 'fruits', subcategory: 'berries', co2PerKg: 0.4, source: 'FAO', notes: 'Berry production' },
  { category: 'vegetables', subcategory: 'tomatoes', co2PerKg: 0.3, source: 'FAO', notes: 'Tomato production' },
  { category: 'vegetables', subcategory: 'potatoes', co2PerKg: 0.2, source: 'FAO', notes: 'Potato production' },
  { category: 'vegetables', subcategory: 'carrots', co2PerKg: 0.2, source: 'FAO', notes: 'Carrot production' },
  { category: 'vegetables', subcategory: 'lettuce', co2PerKg: 0.3, source: 'FAO', notes: 'Lettuce production' },
  { category: 'vegetables', subcategory: 'onions', co2PerKg: 0.2, source: 'FAO', notes: 'Onion production' },

  // Nuts and Seeds
  { category: 'nuts', subcategory: 'almonds', co2PerKg: 2.3, source: 'FAO', notes: 'Almond production' },
  { category: 'nuts', subcategory: 'walnuts', co2PerKg: 0.3, source: 'FAO', notes: 'Walnut production' },
  { category: 'nuts', subcategory: 'peanuts', co2PerKg: 2.5, source: 'FAO', notes: 'Peanut production' },

  // Beverages
  { category: 'beverages', subcategory: 'coffee', co2PerKg: 28.0, source: 'FAO', notes: 'Coffee production' },
  { category: 'beverages', subcategory: 'tea', co2PerKg: 2.0, source: 'FAO', notes: 'Tea production' },
  { category: 'beverages', subcategory: 'juice', co2PerKg: 0.3, source: 'FAO', notes: 'Fruit juice production' },

  // Processed Foods
  { category: 'processed', subcategory: 'bread', co2PerKg: 1.4, source: 'FAO', notes: 'Bread production' },
  { category: 'processed', subcategory: 'pasta', co2PerKg: 1.4, source: 'FAO', notes: 'Pasta production' },
  { category: 'processed', subcategory: 'chocolate', co2PerKg: 19.0, source: 'FAO', notes: 'Chocolate production' },
  { category: 'processed', subcategory: 'chips', co2PerKg: 1.4, source: 'FAO', notes: 'Chips production' },
  { category: 'processed', subcategory: 'cereal', co2PerKg: 1.4, source: 'FAO', notes: 'Cereal production' },

  // Snacks and Sweets
  { category: 'snacks', subcategory: 'cookies', co2PerKg: 1.4, source: 'FAO', notes: 'Cookie production' },
  { category: 'snacks', subcategory: 'candy', co2PerKg: 1.4, source: 'FAO', notes: 'Candy production' },
  { category: 'snacks', subcategory: 'popcorn', co2PerKg: 0.9, source: 'FAO', notes: 'Popcorn production' },

  // Condiments and Sauces
  { category: 'condiments', subcategory: 'ketchup', co2PerKg: 0.3, source: 'FAO', notes: 'Ketchup production' },
  { category: 'condiments', subcategory: 'mayonnaise', co2PerKg: 1.4, source: 'FAO', notes: 'Mayonnaise production' },
  { category: 'condiments', subcategory: 'mustard', co2PerKg: 0.3, source: 'FAO', notes: 'Mustard production' },
  { category: 'condiments', subcategory: 'soy_sauce', co2PerKg: 0.3, source: 'FAO', notes: 'Soy sauce production' },

  // Oils and Fats
  { category: 'oils', subcategory: 'olive_oil', co2PerKg: 6.0, source: 'FAO', notes: 'Olive oil production' },
  { category: 'oils', subcategory: 'vegetable_oil', co2PerKg: 3.8, source: 'FAO', notes: 'Vegetable oil production' },
  { category: 'oils', subcategory: 'coconut_oil', co2PerKg: 3.2, source: 'FAO', notes: 'Coconut oil production' },
];

// Category mapping for item classification
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  // Meat
  { keywords: ['beef', 'steak', 'burger', 'ground beef', 'roast beef'], category: 'meat', subcategory: 'beef' },
  { keywords: ['lamb', 'mutton'], category: 'meat', subcategory: 'lamb' },
  { keywords: ['pork', 'bacon', 'ham', 'sausage', 'hot dog'], category: 'meat', subcategory: 'pork' },
  { keywords: ['chicken', 'turkey', 'poultry', 'breast', 'thigh', 'wing'], category: 'meat', subcategory: 'chicken' },

  // Dairy
  { keywords: ['milk', 'skim milk', 'whole milk', '2% milk'], category: 'dairy', subcategory: 'milk' },
  { keywords: ['cheese', 'cheddar', 'mozzarella', 'parmesan', 'swiss'], category: 'dairy', subcategory: 'cheese' },
  { keywords: ['yogurt', 'greek yogurt'], category: 'dairy', subcategory: 'yogurt' },
  { keywords: ['butter', 'margarine'], category: 'dairy', subcategory: 'butter' },
  { keywords: ['egg', 'eggs'], category: 'dairy', subcategory: 'eggs' },

  // Seafood
  { keywords: ['fish', 'salmon', 'tuna', 'cod', 'halibut'], category: 'seafood', subcategory: 'fish' },
  { keywords: ['shrimp', 'prawn'], category: 'seafood', subcategory: 'shrimp' },

  // Grains
  { keywords: ['bread', 'wheat bread', 'white bread', 'whole wheat'], category: 'grains', subcategory: 'wheat' },
  { keywords: ['rice', 'white rice', 'brown rice', 'basmati'], category: 'grains', subcategory: 'rice' },
  { keywords: ['corn', 'popcorn'], category: 'grains', subcategory: 'corn' },
  { keywords: ['oat', 'oats', 'oatmeal'], category: 'grains', subcategory: 'oats' },

  // Fruits
  { keywords: ['apple', 'apples'], category: 'fruits', subcategory: 'apples' },
  { keywords: ['banana', 'bananas'], category: 'fruits', subcategory: 'bananas' },
  { keywords: ['orange', 'oranges'], category: 'fruits', subcategory: 'oranges' },
  { keywords: ['berry', 'berries', 'strawberry', 'blueberry', 'raspberry'], category: 'fruits', subcategory: 'berries' },

  // Vegetables
  { keywords: ['tomato', 'tomatoes'], category: 'vegetables', subcategory: 'tomatoes' },
  { keywords: ['potato', 'potatoes'], category: 'vegetables', subcategory: 'potatoes' },
  { keywords: ['carrot', 'carrots'], category: 'vegetables', subcategory: 'carrots' },
  { keywords: ['lettuce', 'spinach', 'kale', 'greens'], category: 'vegetables', subcategory: 'lettuce' },
  { keywords: ['onion', 'onions'], category: 'vegetables', subcategory: 'onions' },

  // Nuts
  { keywords: ['almond', 'almonds'], category: 'nuts', subcategory: 'almonds' },
  { keywords: ['walnut', 'walnuts'], category: 'nuts', subcategory: 'walnuts' },
  { keywords: ['peanut', 'peanuts'], category: 'nuts', subcategory: 'peanuts' },

  // Beverages
  { keywords: ['coffee', 'espresso'], category: 'beverages', subcategory: 'coffee' },
  { keywords: ['tea', 'green tea', 'black tea'], category: 'beverages', subcategory: 'tea' },
  { keywords: ['juice', 'orange juice', 'apple juice'], category: 'beverages', subcategory: 'juice' },

  // Processed Foods
  { keywords: ['pasta', 'spaghetti', 'macaroni'], category: 'processed', subcategory: 'pasta' },
  { keywords: ['chocolate', 'dark chocolate', 'milk chocolate'], category: 'processed', subcategory: 'chocolate' },
  { keywords: ['cereal', 'corn flakes', 'cheerios'], category: 'processed', subcategory: 'cereal' },

  // Snacks
  { keywords: ['cookie', 'cookies'], category: 'snacks', subcategory: 'cookies' },
  { keywords: ['candy', 'chocolate bar', 'gum'], category: 'snacks', subcategory: 'candy' },

  // Condiments
  { keywords: ['ketchup'], category: 'condiments', subcategory: 'ketchup' },
  { keywords: ['mayonnaise', 'mayo'], category: 'condiments', subcategory: 'mayonnaise' },
  { keywords: ['mustard'], category: 'condiments', subcategory: 'mustard' },
  { keywords: ['soy sauce'], category: 'condiments', subcategory: 'soy_sauce' },

  // Oils
  { keywords: ['olive oil'], category: 'oils', subcategory: 'olive_oil' },
  { keywords: ['vegetable oil', 'canola oil'], category: 'oils', subcategory: 'vegetable_oil' },
  { keywords: ['coconut oil'], category: 'oils', subcategory: 'coconut_oil' },
];

// Default emissions factor for unknown items
export const DEFAULT_EMISSIONS_FACTOR = 1.0; // kg CO2e per kg

/**
 * Get emissions factor for a given item
 */
export function getEmissionsFactor(itemName: string, category?: string, subcategory?: string): EmissionsFactor {
  const normalizedName = itemName.toLowerCase();
  
  // If category and subcategory are provided, try to find exact match
  if (category && subcategory) {
    const exactMatch = EMISSIONS_FACTORS.find(
      factor => factor.category === category && factor.subcategory === subcategory
    );
    if (exactMatch) return exactMatch;
  }

  // Try to match by keywords
  for (const mapping of CATEGORY_MAPPINGS) {
    if (mapping.keywords.some(keyword => normalizedName.includes(keyword))) {
      const factor = EMISSIONS_FACTORS.find(
        f => f.category === mapping.category && f.subcategory === mapping.subcategory
      );
      if (factor) return factor;
    }
  }

  // Return default factor if no match found
  return {
    category: 'unknown',
    co2PerKg: DEFAULT_EMISSIONS_FACTOR,
    source: 'Default',
    notes: 'Default factor for unknown items'
  };
}

/**
 * Calculate CO2 emissions for an item
 */
export function calculateItemEmissions(
  itemName: string,
  quantity: number,
  unitPrice: number,
  category?: string,
  subcategory?: string
): number {
  const factor = getEmissionsFactor(itemName, category, subcategory);
  
  // Estimate weight based on price and typical density
  // This is a rough approximation - in a real system, you'd want more accurate weight data
  const estimatedWeightKg = quantity * 0.5; // Assume average 0.5kg per unit
  
  return factor.co2PerKg * estimatedWeightKg;
}

/**
 * Calculate total emissions for a list of items
 */
export function calculateTotalEmissions(items: Array<{
  name: string;
  quantity: number;
  unitPrice: number;
  category?: string;
  subcategory?: string;
}>): {
  totalCO2: number;
  breakdown: { [category: string]: { co2: number; percentage: number; items: string[] } };
  totalItems: number;
  averageCO2PerItem: number;
} {
  const categoryEmissions: { [category: string]: { co2: number; items: string[] } } = {};
  let totalCO2 = 0;
  let totalItems = 0;

  for (const item of items) {
    const itemCO2 = calculateItemEmissions(
      item.name,
      item.quantity,
      item.unitPrice,
      item.category,
      item.subcategory
    );
    
    totalCO2 += itemCO2;
    totalItems += item.quantity;

    const factor = getEmissionsFactor(item.name, item.category, item.subcategory);
    const category = factor.category;
    
    if (!categoryEmissions[category]) {
      categoryEmissions[category] = { co2: 0, items: [] };
    }
    
    categoryEmissions[category].co2 += itemCO2;
    categoryEmissions[category].items.push(item.name);
  }

  // Calculate percentages
  const breakdown: { [category: string]: { co2: number; percentage: number; items: string[] } } = {};
  for (const [category, data] of Object.entries(categoryEmissions)) {
    breakdown[category] = {
      co2: data.co2,
      percentage: totalCO2 > 0 ? (data.co2 / totalCO2) * 100 : 0,
      items: data.items
    };
  }

  return {
    totalCO2,
    breakdown,
    totalItems,
    averageCO2PerItem: totalItems > 0 ? totalCO2 / totalItems : 0
  };
}

/**
 * Compare user emissions with Canadian average
 */
export function compareWithCanadianAverage(userEmissions: number, timePeriod: 'day' | 'week' | 'month' | 'year' = 'year'): number {
  const periodMultipliers = {
    day: 365,
    week: 52,
    month: 12,
    year: 1
  };

  const userAnnualEmissions = userEmissions * periodMultipliers[timePeriod];
  const canadianAverage = CANADIAN_AVERAGE_EMISSIONS.groceries;
  
  return ((userAnnualEmissions - canadianAverage) / canadianAverage) * 100;
} 