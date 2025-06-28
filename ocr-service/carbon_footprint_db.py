"""
Carbon Footprint Database for Food Items
Based on scientific research and industry standards (kg CO2e per kg of food)
"""

# Carbon footprint data in kg CO2e per kg of food
# Sources: Poore & Nemecek (2018), Our World in Data, Environmental Working Group
CARBON_FOOTPRINT_DB = {
    # Meat and Dairy (highest impact)
    'beef': 60.0,
    'lamb': 24.0,
    'pork': 7.2,
    'chicken': 6.9,
    'turkey': 10.9,
    'duck': 12.1,
    'goat': 8.8,
    'veal': 21.2,
    'milk': 3.0,
    'cheese': 21.2,
    'yogurt': 2.2,
    'butter': 23.8,
    'cream': 23.0,
    'eggs': 4.8,
    
    # Fish and Seafood
    'salmon': 11.9,
    'tuna': 6.1,
    'cod': 3.9,
    'shrimp': 12.0,
    'lobster': 21.2,
    'crab': 12.0,
    'oysters': 0.4,
    'mussels': 0.6,
    'fish': 3.0,  # Generic fish
    
    # Grains and Cereals (low impact)
    'rice': 2.7,
    'wheat': 1.4,
    'corn': 1.0,
    'oats': 2.4,
    'barley': 1.2,
    'quinoa': 2.1,
    'millet': 1.4,
    'rye': 1.4,
    'sorghum': 1.4,
    'bread': 1.4,
    'pasta': 1.4,
    'flour': 1.4,
    
    # Fruits (very low impact)
    'apples': 0.4,
    'bananas': 0.9,
    'oranges': 0.5,
    'grapes': 0.3,
    'strawberries': 0.4,
    'blueberries': 0.4,
    'raspberries': 0.4,
    'blackberries': 0.4,
    'peaches': 0.4,
    'pears': 0.4,
    'plums': 0.4,
    'cherries': 0.4,
    'pineapple': 0.5,
    'mango': 0.5,
    'avocado': 0.4,
    'lemons': 0.5,
    'limes': 0.5,
    'grapefruit': 0.5,
    'kiwi': 0.4,
    'papaya': 0.5,
    'watermelon': 0.3,
    'cantaloupe': 0.3,
    'honeydew': 0.3,
    
    # Vegetables (very low impact)
    'tomatoes': 1.4,
    'potatoes': 0.3,
    'onions': 0.4,
    'carrots': 0.4,
    'broccoli': 0.4,
    'cauliflower': 0.4,
    'cabbage': 0.4,
    'lettuce': 0.4,
    'spinach': 0.4,
    'kale': 0.4,
    'cucumber': 0.4,
    'peppers': 0.4,
    'mushrooms': 0.4,
    'garlic': 0.4,
    'ginger': 0.4,
    'celery': 0.4,
    'asparagus': 0.4,
    'artichokes': 0.4,
    'eggplant': 0.4,
    'zucchini': 0.4,
    'squash': 0.4,
    'pumpkin': 0.4,
    'sweet potato': 0.4,
    'corn': 1.0,
    'peas': 0.4,
    'beans': 0.4,
    'lentils': 0.9,
    'chickpeas': 0.9,
    'kidney beans': 0.9,
    'black beans': 0.9,
    'pinto beans': 0.9,
    'soybeans': 2.0,
    'tofu': 2.0,
    'tempeh': 2.0,
    
    # Nuts and Seeds
    'almonds': 2.3,
    'walnuts': 2.3,
    'cashews': 2.3,
    'peanuts': 2.3,
    'pistachios': 2.3,
    'pecans': 2.3,
    'hazelnuts': 2.3,
    'macadamia': 2.3,
    'sunflower seeds': 2.3,
    'pumpkin seeds': 2.3,
    'chia seeds': 2.3,
    'flax seeds': 2.3,
    'sesame seeds': 2.3,
    
    # Oils and Fats
    'olive oil': 6.3,
    'canola oil': 3.7,
    'sunflower oil': 3.7,
    'coconut oil': 6.3,
    'vegetable oil': 3.7,
    'margarine': 3.7,
    
    # Beverages
    'coffee': 28.5,
    'tea': 12.4,
    'juice': 0.4,
    'soda': 0.4,
    'beer': 0.6,
    'wine': 1.4,
    'water': 0.0,
    
    # Processed Foods
    'chocolate': 18.7,
    'sugar': 0.9,
    'honey': 1.4,
    'maple syrup': 1.4,
    'jam': 1.4,
    'peanut butter': 2.3,
    'ketchup': 1.4,
    'mustard': 1.4,
    'mayonnaise': 3.7,
    'vinegar': 1.4,
    'soy sauce': 2.0,
    'hot sauce': 1.4,
    'salt': 0.0,
    'pepper': 0.0,
    'spices': 0.0,
    'herbs': 0.0,
    
    # Snacks and Processed Foods
    'chips': 1.4,
    'crackers': 1.4,
    'cookies': 1.4,
    'cake': 1.4,
    'ice cream': 3.0,
    'yogurt': 2.2,
    'cereal': 1.4,
    'granola': 1.4,
    'protein bar': 1.4,
    'energy bar': 1.4,
    
    # Generic categories for fallback
    'meat': 25.0,  # Average meat
    'dairy': 3.0,  # Average dairy
    'fruit': 0.4,  # Average fruit
    'vegetable': 0.4,  # Average vegetable
    'grain': 1.4,  # Average grain
    'seafood': 6.0,  # Average seafood
    'processed': 2.0,  # Average processed food
}

# Category mappings for better matching
CATEGORY_MAPPINGS = {
    'meat': ['beef', 'lamb', 'pork', 'chicken', 'turkey', 'duck', 'goat', 'veal', 'steak', 'burger', 'sausage', 'bacon', 'ham'],
    'dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'eggs', 'ice cream'],
    'fruits': ['apple', 'banana', 'orange', 'grape', 'strawberry', 'blueberry', 'raspberry', 'blackberry', 'peach', 'pear', 'plum', 'cherry', 'pineapple', 'mango', 'avocado', 'lemon', 'lime', 'grapefruit', 'kiwi', 'papaya', 'watermelon', 'cantaloupe', 'honeydew'],
    'vegetables': ['tomato', 'potato', 'onion', 'carrot', 'broccoli', 'cauliflower', 'cabbage', 'lettuce', 'spinach', 'kale', 'cucumber', 'pepper', 'mushroom', 'garlic', 'ginger', 'celery', 'asparagus', 'artichoke', 'eggplant', 'zucchini', 'squash', 'pumpkin', 'sweet potato', 'corn', 'pea', 'bean', 'lentil', 'chickpea'],
    'grains': ['rice', 'wheat', 'corn', 'oats', 'barley', 'quinoa', 'millet', 'rye', 'sorghum', 'bread', 'pasta', 'flour'],
    'seafood': ['salmon', 'tuna', 'cod', 'shrimp', 'lobster', 'crab', 'oyster', 'mussel', 'fish'],
    'nuts': ['almond', 'walnut', 'cashew', 'peanut', 'pistachio', 'pecan', 'hazelnut', 'macadamia', 'seed'],
    'beverages': ['coffee', 'tea', 'juice', 'soda', 'beer', 'wine', 'water'],
    'processed': ['chocolate', 'sugar', 'honey', 'jam', 'peanut butter', 'ketchup', 'mustard', 'mayonnaise', 'vinegar', 'soy sauce', 'hot sauce', 'chips', 'crackers', 'cookies', 'cake', 'cereal', 'granola']
}

def get_carbon_footprint(item_name: str, quantity: float = 1.0) -> float:
    """
    Get carbon footprint for a food item
    
    Args:
        item_name: Name of the food item
        quantity: Quantity in kg (default 1.0)
    
    Returns:
        Carbon footprint in kg CO2e
    """
    # Normalize item name
    item_name = item_name.lower().strip()
    
    # Direct match
    if item_name in CARBON_FOOTPRINT_DB:
        return CARBON_FOOTPRINT_DB[item_name] * quantity
    
    # Try partial matches
    for key, value in CARBON_FOOTPRINT_DB.items():
        if key in item_name or item_name in key:
            return value * quantity
    
    # Try category matching
    for category, items in CATEGORY_MAPPINGS.items():
        for item in items:
            if item in item_name or item_name in item:
                return CARBON_FOOTPRINT_DB.get(category, 2.0) * quantity
    
    # Fallback to generic processed food
    return 2.0 * quantity

def categorize_food_item(item_name: str) -> str:
    """
    Categorize a food item
    
    Args:
        item_name: Name of the food item
    
    Returns:
        Category name
    """
    item_name = item_name.lower().strip()
    
    for category, items in CATEGORY_MAPPINGS.items():
        for item in items:
            if item in item_name or item_name in item:
                return category
    
    return 'processed'

def estimate_quantity_from_name(item_name: str) -> float:
    """
    Estimate quantity from item name (e.g., "2 apples" -> 2.0)
    
    Args:
        item_name: Name of the food item
    
    Returns:
        Estimated quantity
    """
    import re
    
    # Look for quantity patterns
    patterns = [
        r'(\d+(?:\.\d+)?)\s*(?:x|@|×)',  # 2x, 3@, etc.
        r'(\d+(?:\.\d+)?)\s*(?:pack|pkg|pk)',  # 2 pack, 3 pkg, etc.
        r'(\d+(?:\.\d+)?)\s*(?:lb|lbs|pound|pounds)',  # 2 lb, 3 lbs, etc.
        r'(\d+(?:\.\d+)?)\s*(?:oz|ounce|ounces)',  # 2 oz, 3 ounces, etc.
        r'(\d+(?:\.\d+)?)\s*(?:kg|kilogram|kilograms)',  # 2 kg, etc.
        r'(\d+(?:\.\d+)?)\s*(?:g|gram|grams)',  # 2 g, etc.
    ]
    
    for pattern in patterns:
        match = re.search(pattern, item_name, re.IGNORECASE)
        if match:
            try:
                return float(match.group(1))
            except ValueError:
                continue
    
    return 1.0 