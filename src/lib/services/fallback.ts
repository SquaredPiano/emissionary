import { logger } from "@/lib/logger";

export class FallbackService {
  /**
   * Apply comprehensive fallbacks to an item
   */
  static applyFallbacks(item: any): any {
    const enhancedItem = { ...item };

    // Ensure name exists
    if (!enhancedItem.name || enhancedItem.name.trim().length === 0) {
      enhancedItem.name = "Unknown Item";
      logger.warn("Item missing name, using fallback", { originalItem: item });
    }

    // Ensure canonical name exists
    if (!enhancedItem.canonical_name || enhancedItem.canonical_name.trim().length === 0) {
      enhancedItem.canonical_name = enhancedItem.name.toLowerCase();
    }

    // Ensure quantity is valid
    if (!enhancedItem.quantity || enhancedItem.quantity <= 0) {
      enhancedItem.quantity = 1.0;
      logger.warn("Item has invalid quantity, using fallback", { 
        item: enhancedItem.name, 
        originalQuantity: item.quantity 
      });
    }

    // Ensure total price is valid (can be 0 for some items)
    if (enhancedItem.total_price === undefined || enhancedItem.total_price < 0) {
      enhancedItem.total_price = 0;
      logger.warn("Item has invalid total price, using fallback", { 
        item: enhancedItem.name, 
        originalPrice: item.total_price 
      });
    }

    // Ensure category exists
    if (!enhancedItem.category || enhancedItem.category.trim().length === 0) {
      enhancedItem.category = this.inferCategory(enhancedItem.name);
    }

    // Ensure is_food is set
    if (enhancedItem.is_food === undefined) {
      enhancedItem.is_food = this.isLikelyFood(enhancedItem.name);
    }

    // Ensure confidence is set
    if (enhancedItem.confidence === undefined || enhancedItem.confidence < 0 || enhancedItem.confidence > 1) {
      enhancedItem.confidence = 0.5; // Default confidence
    }

    // Ensure source is set
    if (!enhancedItem.source) {
      enhancedItem.source = "fallback";
    }

    return enhancedItem;
  }

  /**
   * Apply basic fallbacks (minimal processing)
   */
  static applyBasicFallbacks(item: any): any {
    return {
      name: item.name || "Unknown Item",
      canonical_name: item.canonical_name || (item.name || "unknown").toLowerCase(),
      quantity: item.quantity > 0 ? item.quantity : 1.0,
      total_price: item.total_price >= 0 ? item.total_price : 0,
      category: item.category || "unknown",
      carbon_emissions: item.carbon_emissions >= 0 ? item.carbon_emissions : 2.0,
      confidence: 0.3, // Low confidence for fallback items
      source: "fallback",
      is_food: item.is_food !== undefined ? item.is_food : true,
    };
  }

  /**
   * Infer category from item name
   */
  private static inferCategory(itemName: string): string {
    const name = itemName.toLowerCase();
    
    // Food categories
    if (name.includes('milk') || name.includes('cheese') || name.includes('yogurt') || name.includes('cream')) {
      return 'dairy';
    }
    if (name.includes('beef') || name.includes('chicken') || name.includes('pork') || name.includes('meat')) {
      return 'meat';
    }
    if (name.includes('apple') || name.includes('banana') || name.includes('orange') || name.includes('fruit')) {
      return 'fruits';
    }
    if (name.includes('carrot') || name.includes('lettuce') || name.includes('tomato') || name.includes('vegetable')) {
      return 'vegetables';
    }
    if (name.includes('bread') || name.includes('pasta') || name.includes('rice') || name.includes('grain')) {
      return 'grains';
    }
    if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) {
      return 'seafood';
    }
    if (name.includes('egg')) {
      return 'eggs';
    }
    if (name.includes('nut') || name.includes('almond') || name.includes('peanut')) {
      return 'nuts';
    }
    if (name.includes('soda') || name.includes('juice') || name.includes('water') || name.includes('drink')) {
      return 'beverages';
    }
    if (name.includes('chocolate') || name.includes('candy') || name.includes('sweet')) {
      return 'sweets';
    }
    if (name.includes('oil') || name.includes('butter') || name.includes('fat')) {
      return 'fats';
    }
    
    return 'processed_foods';
  }

  /**
   * Determine if an item is likely food
   */
  private static isLikelyFood(itemName: string): boolean {
    const name = itemName.toLowerCase();
    
    // Non-food indicators
    const nonFoodKeywords = [
      'receipt', 'total', 'tax', 'change', 'cash', 'card', 'payment',
      'plastic', 'paper', 'bag', 'container', 'bottle', 'can',
      'cleaning', 'soap', 'detergent', 'shampoo', 'toothpaste',
      'medicine', 'vitamin', 'supplement', 'bandage', 'tissue',
      'battery', 'light', 'bulb', 'cable', 'wire', 'tool',
      'book', 'magazine', 'newspaper', 'pen', 'pencil', 'paper'
    ];
    
    for (const keyword of nonFoodKeywords) {
      if (name.includes(keyword)) {
        return false;
      }
    }
    
    // Food indicators
    const foodKeywords = [
      'milk', 'cheese', 'bread', 'meat', 'chicken', 'beef', 'pork',
      'fish', 'egg', 'fruit', 'vegetable', 'grain', 'rice', 'pasta',
      'nut', 'seed', 'oil', 'butter', 'sugar', 'salt', 'spice',
      'sauce', 'soup', 'cereal', 'yogurt', 'cream', 'juice', 'soda',
      'water', 'coffee', 'tea', 'chocolate', 'candy', 'cookie', 'cake'
    ];
    
    for (const keyword of foodKeywords) {
      if (name.includes(keyword)) {
        return true;
      }
    }
    
    // Default to true for unknown items (conservative approach)
    return true;
  }

  /**
   * Get default emissions for a category
   */
  static getDefaultEmissions(category: string): number {
    const defaults: Record<string, number> = {
      'meat': 15.0,
      'dairy': 3.0,
      'fruits': 0.5,
      'vegetables': 0.3,
      'grains': 1.0,
      'seafood': 5.0,
      'eggs': 2.5,
      'nuts': 1.5,
      'beverages': 0.5,
      'sweets': 2.0,
      'fats': 3.0,
      'processed_foods': 2.5,
      'unknown': 2.0,
    };
    
    return defaults[category] || defaults['unknown'];
  }

  /**
   * Create a fallback item when parsing completely fails
   */
  static createFallbackItem(originalText: string): any {
    return {
      name: originalText.trim() || "Unknown Item",
      canonical_name: (originalText.trim() || "unknown").toLowerCase(),
      quantity: 1.0,
      total_price: 0,
      category: "unknown",
      carbon_emissions: 2.0,
      confidence: 0.1,
      source: "manual_fallback",
      is_food: true,
    };
  }
} 